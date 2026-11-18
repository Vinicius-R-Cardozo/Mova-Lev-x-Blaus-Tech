import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply } from "fastify";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  adminImageCreateSchema,
  adminImageOrderSchema,
  adminImageUpdateSchema,
  adminProductListSchema,
  adminProductSchema,
  adminUploadSignSchema,
  adminVariantsSchema,
  homeContentSchema,
  slugify,
} from "@movalev/shared";
import { env } from "../../env";
import { prisma } from "../../lib/prisma";
import { publicImageUrl, supabaseAdmin } from "../../lib/supabase";
import { withIdempotency } from "../../lib/idempotency";
import { revalidateStore } from "../../lib/revalidate";
import { audit, diffSummary } from "../../lib/audit";
import { lowStockThreshold } from "../../lib/settings";
import { recordMovement } from "../../lib/stock";

const PRODUCT_LABELS = { name: "Nome", slug: "URL", status: "Status", priceCents: "Preço", badge: "Selo", collectionId: "Coleção" };

const id = z.string().uuid();
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "video/mp4": "mp4", "video/webm": "webm" };

const notFound = (reply: FastifyReply) => reply.code(404).send({ error: "nao_encontrado", message: "Não encontrado." });

const productDetailInclude = {
  colors: { include: { color: true }, orderBy: { sortOrder: "asc" } },
  categories: true,
  variants: { orderBy: [{ colorId: "asc" }, { size: "asc" }] },
  images: { orderBy: [{ colorId: "asc" }, { sortOrder: "asc" }] },
  related: { orderBy: { sortOrder: "asc" } },
} satisfies Prisma.ProductInclude;

function serializeProduct(p: Prisma.ProductGetPayload<{ include: typeof productDetailInclude }>) {
  return {
    ...p,
    // Formulário: preço normal + promocional (no banco: cobrado + riscado).
    priceCents: p.compareAtPriceCents ?? p.priceCents,
    promoPriceCents: p.compareAtPriceCents ? p.priceCents : null,
    ratingAvg: p.ratingAvg ? Number(p.ratingAvg) : null,
    images: p.images.map((i) => ({ ...i, url: i.storagePath ? publicImageUrl(i.storagePath) : null })),
    categoryIds: p.categories.map((c) => c.categoryId),
    completeLookIds: p.related.filter((r) => r.kind === "COMPLETE_LOOK").map((r) => r.relatedId),
    youMayLikeIds: p.related.filter((r) => r.kind === "YOU_MAY_LIKE").map((r) => r.relatedId),
  };
}

/** Grava campos, categorias, cores e relações do produto (substitui as listas). */
async function writeProduct(tx: Prisma.TransactionClient, productId: string | null, input: z.infer<typeof adminProductSchema>) {
  const slug = input.slug || slugify(input.name);
  const data = {
    name: input.name,
    slug,
    nameEmphasis: input.nameEmphasis ?? null,
    description: input.description,
    fabricCare: input.fabricCare,
    // Em promoção, cobra o promocional e mostra o normal riscado.
    priceCents: input.promoPriceCents ?? input.priceCents,
    compareAtPriceCents: input.promoPriceCents ? input.priceCents : null,
    seoTitle: input.seoTitle || null,
    seoDescription: input.seoDescription || null,
    badge: input.badge,
    sensation: input.sensation,
    model: input.model,
    pictogram: input.pictogram,
    status: input.status,
    archivedAt: input.status === "ARCHIVED" ? new Date() : null,
    relevance: input.relevance,
    collectionId: input.collectionId,
  };
  const product = productId ? await tx.product.update({ where: { id: productId }, data }) : await tx.product.create({ data });

  await tx.productCategory.deleteMany({ where: { productId: product.id } });
  if (input.categoryIds.length) await tx.productCategory.createMany({ data: input.categoryIds.map((categoryId, i) => ({ productId: product.id, categoryId, sortOrder: i })) });

  await tx.productColor.deleteMany({ where: { productId: product.id } });
  await tx.productColor.createMany({ data: input.colors.map((c, i) => ({ productId: product.id, colorId: c.colorId, featured: c.featured, sortOrder: i })) });

  await tx.productRelation.deleteMany({ where: { productId: product.id } });
  const rel = [
    ...input.completeLookIds.map((relatedId, i) => ({ relatedId, kind: "COMPLETE_LOOK" as const, sortOrder: i })),
    ...input.youMayLikeIds.map((relatedId, i) => ({ relatedId, kind: "YOU_MAY_LIKE" as const, sortOrder: i })),
  ].filter((r) => r.relatedId !== product.id);
  if (rel.length) await tx.productRelation.createMany({ data: rel.map((r) => ({ ...r, productId: product.id })) });
  return product;
}

function uniqueViolation(err: unknown) {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    const target = String((err.meta?.target as string[] | undefined)?.join(",") ?? "");
    return Object.assign(new Error(target.includes("sku") ? "Esse SKU já existe em outra variante." : target.includes("slug") ? "Já existe um produto com esse endereço (slug)." : "Valor duplicado."), { statusCode: 409, code: "duplicado" });
  }
  return err;
}

export async function adminCatalogRoutes(app: FastifyInstance) {
  // ── Referências para os formulários ──
  app.get("/admin/meta", { config: { allow: "staff" } }, async () => {
    const [colors, categories, collections, products] = await Promise.all([
      prisma.color.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.category.findMany({ where: { archivedAt: null }, orderBy: { sortOrder: "asc" } }),
      prisma.collection.findMany({ where: { archivedAt: null }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
      prisma.product.findMany({
        where: { status: { not: "ARCHIVED" } },
        select: { id: true, name: true, slug: true, status: true, collectionId: true, colors: { select: { color: { select: { slug: true, name: true } } }, orderBy: { sortOrder: "asc" } } },
        orderBy: { name: "asc" },
      }),
    ]);
    return { colors, categories, collections, products };
  });

  // ── Produtos ──
  app.get("/admin/products", { config: { allow: "staff" } }, async (req) => {
    const f = adminProductListSchema.parse(req.query);
    const threshold = await lowStockThreshold();
    const where: Prisma.ProductWhereInput = {
      // Arquivados só aparecem quando filtrados.
      status: f.status ?? { not: "ARCHIVED" },
      ...(f.categoryId ? { categories: { some: { categoryId: f.categoryId } } } : {}),
      ...(f.collectionId ? { collectionId: f.collectionId } : {}),
      ...(f.promo ? { compareAtPriceCents: { not: null } } : {}),
      ...(f.stock === "esgotado" ? { variants: { some: { stock: 0 } } } : f.stock === "baixo" ? { variants: { some: { stock: { gt: 0, lte: threshold } } } } : {}),
      ...(f.q
        ? {
            OR: [
              { name: { contains: f.q, mode: "insensitive" } },
              { slug: { contains: f.q.toLowerCase() } },
              { variants: { some: { sku: { contains: f.q.toUpperCase() } } } },
            ],
          }
        : {}),
    };
    const orderBy: Prisma.ProductOrderByWithRelationInput[] =
      f.sort === "recentes" ? [{ createdAt: "desc" }] : f.sort === "preco" ? [{ priceCents: "asc" }] : [{ name: "asc" }];
    const [total, rows] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy,
        skip: (f.page - 1) * f.perPage,
        take: f.perPage,
        include: {
          variants: { select: { stock: true } },
          colors: { include: { color: true }, orderBy: { sortOrder: "asc" } },
          images: { where: { storagePath: { not: null }, kind: { not: "VIDEO" } }, orderBy: { sortOrder: "asc" }, take: 1, select: { storagePath: true } },
          _count: { select: { images: { where: { storagePath: { not: null } } } } },
        },
      }),
    ]);
    return {
      total,
      page: f.page,
      perPage: f.perPage,
      lowStockThreshold: threshold,
      items: rows.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        status: p.status,
        priceCents: p.priceCents,
        compareAtPriceCents: p.compareAtPriceCents,
        badge: p.badge,
        stock: p.variants.reduce((n, v) => n + v.stock, 0),
        soldOutVariants: p.variants.filter((v) => v.stock === 0).length,
        lowVariants: p.variants.filter((v) => v.stock > 0 && v.stock <= threshold).length,
        colors: p.colors.map((c) => ({ name: c.color.name, hex: c.color.hex })),
        photos: p._count.images,
        thumb: p.images[0]?.storagePath ? publicImageUrl(p.images[0].storagePath) : null,
        updatedAt: p.updatedAt,
      })),
    };
  });

  app.get<{ Params: { id: string } }>("/admin/products/:id", { config: { allow: "staff" } }, async (req, reply) => {
    const p = await prisma.product.findUnique({ where: { id: id.parse(req.params.id) }, include: productDetailInclude });
    return p ? serializeProduct(p) : notFound(reply);
  });

  app.post("/admin/products", { config: { allow: "staff" } }, async (req, reply) =>
    withIdempotency(req, reply, "admin-product", async () => {
      const input = adminProductSchema.parse(req.body);
      try {
        const product = await prisma.$transaction((tx) => writeProduct(tx, null, input));
        await audit(req, { action: "product.create", entity: "produto", entityId: product.id, summary: `Criou "${input.name}"`, after: { name: input.name, priceCents: input.priceCents, status: input.status } });
        revalidateStore(["catalog", "home"]);
        return { status: 201, body: { id: product.id, slug: product.slug } };
      } catch (err) {
        throw uniqueViolation(err);
      }
    }),
  );

  app.put<{ Params: { id: string } }>("/admin/products/:id", { config: { allow: "staff" } }, async (req, reply) => {
    const productId = id.parse(req.params.id);
    const input = adminProductSchema.parse(req.body);
    const prev = await prisma.product.findUnique({ where: { id: productId }, select: { name: true, slug: true, status: true, priceCents: true, badge: true, collectionId: true } });
    if (!prev) return notFound(reply);
    try {
      await prisma.$transaction((tx) => writeProduct(tx, productId, input));
    } catch (err) {
      throw uniqueViolation(err);
    }
    const next = await prisma.product.findUniqueOrThrow({ where: { id: productId }, select: { name: true, slug: true, status: true, priceCents: true, badge: true, collectionId: true } });
    const d = diffSummary(prev, next, PRODUCT_LABELS);
    await audit(req, { action: "product.update", entity: "produto", entityId: productId, summary: `"${next.name}"${d.summary ? ` — ${d.summary}` : ": textos/listas"}`, before: d.before, after: d.after });
    revalidateStore(["catalog", "home"]);
    const p = await prisma.product.findUniqueOrThrow({ where: { id: productId }, include: productDetailInclude });
    return serializeProduct(p);
  });

  /** Variantes: cor × tamanho com SKU, estoque e preço. Upsert por (produto, cor, tamanho) — repetir não duplica. */
  app.put<{ Params: { id: string } }>("/admin/products/:id/variants", { config: { allow: "staff" } }, async (req, reply) => {
    const productId = id.parse(req.params.id);
    const { variants } = adminVariantsSchema.parse(req.body);
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { name: true, variants: { select: { id: true, colorId: true, size: true, sku: true, stock: true, priceCents: true } } } });
    if (!product) return notFound(reply);
    try {
      await prisma.$transaction(async (tx) => {
        const actor = { id: req.user!.id, email: req.user!.email };
        for (const v of variants) {
          const old = product.variants.find((o) => o.colorId === v.colorId && o.size === v.size);
          if (!old) {
            const created = await tx.variant.create({ data: { productId, ...v } });
            await recordMovement(tx, { variantId: created.id, type: "ENTRADA", delta: v.stock, stockAfter: v.stock, note: "Estoque inicial (tela do produto)", actor });
            continue;
          }
          await tx.variant.update({ where: { id: old.id }, data: { sku: v.sku, priceCents: v.priceCents } });
          if (old.stock !== v.stock) {
            // Só grava se ninguém vendeu no meio (senão a venda seria apagada).
            const r = await tx.variant.updateMany({ where: { id: old.id, stock: old.stock }, data: { stock: v.stock } });
            if (r.count === 0) throw Object.assign(new Error(`O estoque de ${v.sku} mudou enquanto você editava (provavelmente uma venda). Recarregue e ajuste de novo.`), { statusCode: 409, code: "estoque_mudou" });
            await recordMovement(tx, { variantId: old.id, type: "AJUSTE", delta: v.stock - old.stock, stockAfter: v.stock, note: "Ajuste na tela do produto", actor });
          }
        }
      });
    } catch (err) {
      throw uniqueViolation(err);
    }
    // Auditoria: só o que mudou (estoque e preço por SKU).
    const changes: string[] = [];
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    for (const v of variants) {
      const old = product.variants.find((o) => o.colorId === v.colorId && o.size === v.size);
      if (!old) {
        changes.push(`${v.sku}: criada (estoque ${v.stock})`);
        after[v.sku] = { stock: v.stock, priceCents: v.priceCents ?? null };
        continue;
      }
      const parts: string[] = [];
      if (old.stock !== v.stock) parts.push(`estoque ${old.stock} → ${v.stock}`);
      if ((old.priceCents ?? null) !== (v.priceCents ?? null)) parts.push(`preço ${old.priceCents ?? "padrão"} → ${v.priceCents ?? "padrão"}`);
      if (old.sku !== v.sku) parts.push(`SKU ${old.sku} → ${v.sku}`);
      if (parts.length) {
        changes.push(`${v.sku}: ${parts.join(", ")}`);
        before[v.sku] = { stock: old.stock, priceCents: old.priceCents, sku: old.sku };
        after[v.sku] = { stock: v.stock, priceCents: v.priceCents ?? null, sku: v.sku };
      }
    }
    if (changes.length) await audit(req, { action: "variant.update", entity: "produto", entityId: productId, summary: `"${product.name}" — ${changes.join("; ")}`, before, after });
    revalidateStore(["catalog"]);
    return prisma.variant.findMany({ where: { productId }, orderBy: [{ colorId: "asc" }, { size: "asc" }] });
  });

  // ── Duplicar, arquivar, restaurar e excluir ──

  /** Duplica como rascunho: dados, cores, categorias, relações, variantes (estoque 0) e fotos. */
  app.post<{ Params: { id: string } }>("/admin/products/:id/duplicate", { config: { allow: "staff" } }, async (req, reply) => {
    const srcId = id.parse(req.params.id);
    const src = await prisma.product.findUnique({ where: { id: srcId }, include: { categories: true, colors: true, related: true, variants: true, images: true } });
    if (!src) return notFound(reply);
    let slug = `${src.slug}-copia`.slice(0, 80);
    for (let n = 2; await prisma.product.findUnique({ where: { slug }, select: { id: true } }); n++) slug = `${src.slug}-copia-${n}`.slice(0, 80);
    const suffix = `-C${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const copy = await prisma.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          slug,
          name: `${src.name} (cópia)`.slice(0, 120),
          nameEmphasis: src.nameEmphasis,
          description: src.description,
          fabricCare: src.fabricCare,
          priceCents: src.priceCents,
          compareAtPriceCents: src.compareAtPriceCents,
          seoTitle: null,
          seoDescription: src.seoDescription,
          badge: src.badge,
          sensation: src.sensation,
          model: src.model,
          pictogram: src.pictogram,
          status: "DRAFT",
          relevance: src.relevance,
          collectionId: src.collectionId,
        },
      });
      if (src.categories.length) await tx.productCategory.createMany({ data: src.categories.map((c) => ({ productId: p.id, categoryId: c.categoryId, sortOrder: c.sortOrder })) });
      if (src.colors.length) await tx.productColor.createMany({ data: src.colors.map((c) => ({ productId: p.id, colorId: c.colorId, sortOrder: c.sortOrder, featured: c.featured })) });
      if (src.related.length) await tx.productRelation.createMany({ data: src.related.map((r) => ({ productId: p.id, relatedId: r.relatedId, kind: r.kind, sortOrder: r.sortOrder })) });
      if (src.variants.length)
        await tx.variant.createMany({ data: src.variants.map((v) => ({ productId: p.id, colorId: v.colorId, size: v.size, sku: `${v.sku}${suffix}`.slice(0, 40), stock: 0, priceCents: v.priceCents })) });
      // As fotos apontam para os mesmos arquivos (excluir numa não apaga o arquivo da outra).
      if (src.images.length)
        await tx.productImage.createMany({ data: src.images.map((i) => ({ productId: p.id, colorId: i.colorId, kind: i.kind, storagePath: i.storagePath, videoUrl: i.videoUrl, alt: i.alt, caption: i.caption, sortOrder: i.sortOrder })) });
      return p;
    });
    await audit(req, { action: "product.duplicate", entity: "produto", entityId: copy.id, summary: `Duplicou "${src.name}" (nova cópia em rascunho, estoque zerado)`, before: { from: srcId } });
    return reply.code(201).send({ id: copy.id, slug: copy.slug });
  });

  /** Arquivar (exclusão lógica): some da loja, pode ser restaurado. */
  app.post<{ Params: { id: string } }>("/admin/products/:id/archive", { config: { allow: "staff" } }, async (req, reply) => {
    const productId = id.parse(req.params.id);
    const p = await prisma.product.findUnique({ where: { id: productId }, select: { name: true, status: true } });
    if (!p) return notFound(reply);
    if (p.status !== "ARCHIVED") {
      await prisma.product.update({ where: { id: productId }, data: { status: "ARCHIVED", archivedAt: new Date() } });
      await audit(req, { action: "product.archive", entity: "produto", entityId: productId, summary: `Arquivou "${p.name}"`, before: { status: p.status }, after: { status: "ARCHIVED" } });
      revalidateStore(["catalog", "home"]);
    }
    return { ok: true };
  });

  /** Restaurar volta como rascunho (revise antes de publicar). */
  app.post<{ Params: { id: string } }>("/admin/products/:id/restore", { config: { allow: "staff" } }, async (req, reply) => {
    const productId = id.parse(req.params.id);
    const p = await prisma.product.findUnique({ where: { id: productId }, select: { name: true, status: true } });
    if (!p) return notFound(reply);
    if (p.status === "ARCHIVED") {
      await prisma.product.update({ where: { id: productId }, data: { status: "DRAFT", archivedAt: null } });
      await audit(req, { action: "product.restore", entity: "produto", entityId: productId, summary: `Restaurou "${p.name}" como rascunho`, before: { status: "ARCHIVED" }, after: { status: "DRAFT" } });
    }
    return { ok: true };
  });

  /**
   * Exclusão definitiva: só de produto arquivado e que nunca foi vendido (pedidos
   * guardam o histórico das variantes). Apaga do Storage só arquivos que nenhum
   * outro produto usa (cópias compartilham fotos).
   */
  app.delete<{ Params: { id: string } }>("/admin/products/:id", { config: { allow: "staff" } }, async (req, reply) => {
    const productId = id.parse(req.params.id);
    const p = await prisma.product.findUnique({ where: { id: productId }, include: { images: { select: { storagePath: true } } } });
    if (!p) return reply.code(204).send();
    if (p.status !== "ARCHIVED") return reply.code(409).send({ error: "nao_arquivado", message: "Arquive o produto antes de excluir de vez." });
    const sold = await prisma.orderItem.count({ where: { variant: { productId } } });
    if (sold > 0) return reply.code(409).send({ error: "tem_vendas", message: `Este produto já foi vendido (${sold} ${sold === 1 ? "item" : "itens"} em pedidos). Ele fica arquivado para manter o histórico.` });
    const paths = p.images.map((i) => i.storagePath).filter((x): x is string => !!x);
    await prisma.product.delete({ where: { id: productId } });
    const stillUsed = await prisma.productImage.findMany({ where: { storagePath: { in: paths } }, select: { storagePath: true } });
    const orphan = paths.filter((x) => !stillUsed.some((u) => u.storagePath === x));
    if (orphan.length) await supabaseAdmin().storage.from(env.STORAGE_BUCKET).remove(orphan).catch(() => undefined);
    await audit(req, { action: "product.delete", entity: "produto", entityId: productId, summary: `Excluiu de vez "${p.name}"`, before: { name: p.name, slug: p.slug, priceCents: p.priceCents } });
    revalidateStore(["catalog", "home"]);
    return reply.code(204).send();
  });

  // ── Fotos: upload direto para o Storage com URL assinada (o arquivo não passa pela API) ──
  app.post("/admin/uploads/sign", { config: { allow: "staff" } }, async (req, reply) => {
    const input = adminUploadSignSchema.parse(req.body);
    if (!(await prisma.product.findUnique({ where: { id: input.productId }, select: { id: true } }))) return notFound(reply);
    const path = `${input.productId}/${randomUUID()}.${EXT[input.contentType]}`;
    const { data, error } = await supabaseAdmin().storage.from(env.STORAGE_BUCKET).createSignedUploadUrl(path);
    if (error) throw error;
    return { bucket: env.STORAGE_BUCKET, path, token: data.token };
  });

  app.post<{ Params: { id: string } }>("/admin/products/:id/images", { config: { allow: "staff" } }, async (req, reply) => {
    const productId = id.parse(req.params.id);
    const input = adminImageCreateSchema.parse(req.body);
    if (!input.storagePath.startsWith(`${productId}/`)) return reply.code(400).send({ error: "caminho_invalido", message: "Arquivo de outro produto." });
    // Confere que o arquivo foi mesmo enviado ao bucket.
    const head = await fetch(publicImageUrl(input.storagePath), { method: "HEAD" });
    if (!head.ok) return reply.code(422).send({ error: "arquivo_ausente", message: "O arquivo não chegou ao Storage. Envie de novo." });
    const existing = await prisma.productImage.findFirst({ where: { productId, storagePath: input.storagePath } });
    if (existing) return existing; // idempotente: mesmo arquivo, mesma foto
    const last = await prisma.productImage.aggregate({ where: { productId, colorId: input.colorId }, _max: { sortOrder: true } });
    const image = await prisma.productImage.create({
      data: {
        productId,
        colorId: input.colorId,
        kind: input.kind,
        alt: input.alt,
        storagePath: input.storagePath,
        videoUrl: input.kind === "VIDEO" ? publicImageUrl(input.storagePath) : null,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
    });
    // Foto real substitui o placeholder do mesmo tipo/cor.
    await prisma.productImage.deleteMany({ where: { productId, colorId: input.colorId, kind: input.kind, storagePath: null } });
    revalidateStore(["catalog", "home"]);
    return reply.code(201).send({ ...image, url: publicImageUrl(image.storagePath!) });
  });

  app.patch<{ Params: { imageId: string } }>("/admin/images/:imageId", { config: { allow: "staff" } }, async (req) => {
    const data = adminImageUpdateSchema.parse(req.body);
    const image = await prisma.productImage.update({ where: { id: id.parse(req.params.imageId) }, data });
    revalidateStore(["catalog"]);
    return image;
  });

  app.put<{ Params: { id: string } }>("/admin/products/:id/images/order", { config: { allow: "staff" } }, async (req) => {
    const productId = id.parse(req.params.id);
    const { ids } = adminImageOrderSchema.parse(req.body);
    await prisma.$transaction(ids.map((imageId, i) => prisma.productImage.updateMany({ where: { id: imageId, productId }, data: { sortOrder: i } })));
    revalidateStore(["catalog", "home"]);
    return { ok: true };
  });

  app.delete<{ Params: { imageId: string } }>("/admin/images/:imageId", { config: { allow: "staff" } }, async (req, reply) => {
    const image = await prisma.productImage.findUnique({ where: { id: id.parse(req.params.imageId) } });
    if (!image) return reply.code(204).send();
    await prisma.productImage.delete({ where: { id: image.id } });
    // Cópias de produto compartilham o arquivo: só apaga do Storage se ninguém mais usa.
    if (image.storagePath && !(await prisma.productImage.count({ where: { storagePath: image.storagePath } }))) {
      await supabaseAdmin().storage.from(env.STORAGE_BUCKET).remove([image.storagePath]);
    }
    await audit(req, { action: "image.delete", entity: "produto", entityId: image.productId, summary: `Excluiu foto (${image.kind})`, before: { storagePath: image.storagePath, alt: image.alt } });
    revalidateStore(["catalog", "home"]);
    return reply.code(204).send();
  });

  // ── Conteúdo da Home (hero, Na campanha, Compre o look, Studio…) ──
  app.get("/admin/settings/home", { config: { allow: "staff" } }, async () => homeContentSchema.parse((await prisma.setting.findUnique({ where: { key: "home" } }))?.value));

  app.put("/admin/settings/home", { config: { allow: "staff" } }, async (req) => {
    const value = homeContentSchema.parse(req.body);
    const slugs = [...value.campaign.items, ...value.shopTheLook.items].map((i) => i.productSlug);
    const found = await prisma.product.findMany({ where: { slug: { in: slugs } }, select: { slug: true } });
    const missing = slugs.filter((s) => !found.some((f) => f.slug === s));
    if (missing.length) throw Object.assign(new Error(`Produto não encontrado: ${missing.join(", ")}`), { statusCode: 422 });
    const prevHome = await prisma.setting.findUnique({ where: { key: "home" } });
    await prisma.setting.upsert({ where: { key: "home" }, create: { key: "home", value }, update: { value } });
    await audit(req, { action: "content.home", entity: "conteudo", entityId: "home", summary: "Editou o conteúdo da Home", before: prevHome?.value ?? null, after: value });
    revalidateStore(["home"]);
    return value;
  });
}
