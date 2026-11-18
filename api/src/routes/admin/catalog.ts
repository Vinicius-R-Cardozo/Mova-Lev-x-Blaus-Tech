import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply } from "fastify";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  adminCollectionSchema,
  adminImageCreateSchema,
  adminImageOrderSchema,
  adminImageUpdateSchema,
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
    priceCents: input.priceCents,
    badge: input.badge,
    sensation: input.sensation,
    model: input.model,
    pictogram: input.pictogram,
    status: input.status,
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
      prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.collection.findMany({ orderBy: { name: "asc" } }),
      prisma.product.findMany({
        where: { status: { not: "ARCHIVED" } },
        select: { id: true, name: true, slug: true, colors: { select: { color: { select: { slug: true, name: true } } }, orderBy: { sortOrder: "asc" } } },
        orderBy: { name: "asc" },
      }),
    ]);
    return { colors, categories, collections, products };
  });

  // ── Produtos ──
  app.get("/admin/products", { config: { allow: "staff" } }, async (req) => {
    const { q, status } = z.object({ q: z.string().trim().max(60).optional(), status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).optional() }).parse(req.query);
    const rows = await prisma.product.findMany({
      where: { ...(status ? { status } : {}), ...(q ? { name: { contains: q, mode: "insensitive" } } : {}) },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      include: { variants: { select: { stock: true } }, colors: { include: { color: true }, orderBy: { sortOrder: "asc" } }, _count: { select: { images: { where: { storagePath: { not: null } } } } } },
    });
    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      status: p.status,
      priceCents: p.priceCents,
      badge: p.badge,
      stock: p.variants.reduce((n, v) => n + v.stock, 0),
      soldOutVariants: p.variants.filter((v) => v.stock === 0).length,
      colors: p.colors.map((c) => ({ name: c.color.name, hex: c.color.hex })),
      photos: p._count.images,
    }));
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
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { name: true, variants: { select: { colorId: true, size: true, sku: true, stock: true, priceCents: true } } } });
    if (!product) return notFound(reply);
    try {
      await prisma.$transaction(async (tx) => {
        for (const v of variants) {
          await tx.variant.upsert({
            where: { productId_colorId_size: { productId, colorId: v.colorId, size: v.size } },
            create: { productId, ...v },
            update: { sku: v.sku, stock: v.stock, priceCents: v.priceCents },
          });
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
    if (image.storagePath) await supabaseAdmin().storage.from(env.STORAGE_BUCKET).remove([image.storagePath]);
    await audit(req, { action: "image.delete", entity: "produto", entityId: image.productId, summary: `Excluiu foto (${image.kind})`, before: { storagePath: image.storagePath, alt: image.alt } });
    revalidateStore(["catalog", "home"]);
    return reply.code(204).send();
  });

  // ── Coleções ──
  app.get("/admin/collections", { config: { allow: "staff" } }, async () => prisma.collection.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { products: true } } } }));

  app.post("/admin/collections", { config: { allow: "staff" } }, async (req, reply) =>
    withIdempotency(req, reply, "admin-collection", async () => {
      const input = adminCollectionSchema.parse(req.body);
      try {
        const c = await prisma.collection.create({ data: input });
        await audit(req, { action: "collection.create", entity: "colecao", entityId: c.id, summary: `Criou a coleção "${c.name}"`, after: input });
        return { status: 201, body: c };
      } catch (err) {
        throw uniqueViolation(err);
      }
    }),
  );

  app.put<{ Params: { id: string } }>("/admin/collections/:id", { config: { allow: "staff" } }, async (req) => {
    const input = adminCollectionSchema.parse(req.body);
    try {
      const c = await prisma.collection.update({ where: { id: id.parse(req.params.id) }, data: input });
      await audit(req, { action: "collection.update", entity: "colecao", entityId: c.id, summary: `Editou a coleção "${c.name}"`, after: input });
      revalidateStore(["catalog"]);
      return c;
    } catch (err) {
      throw uniqueViolation(err);
    }
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
