import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply } from "fastify";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { adminCategorySchema, adminCollectionSchema, adminCoverSignSchema, adminGroupProductsSchema, adminOrderSchema } from "@movalev/shared";
import { env } from "../../env";
import { prisma } from "../../lib/prisma";
import { supabaseAdmin } from "../../lib/supabase";
import { audit, diffSummary } from "../../lib/audit";
import { revalidateStore } from "../../lib/revalidate";

const staff = { config: { allow: "staff" as const } };
const id = z.string().uuid();
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };
const notFound = (reply: FastifyReply) => reply.code(404).send({ error: "nao_encontrado", message: "Não encontrado." });

function duplicate(err: unknown) {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return Object.assign(new Error("Já existe outra com esse endereço (slug)."), { statusCode: 409, code: "duplicado" });
  }
  return err;
}

/**
 * Categorias (vitrine e menu) e coleções (campanhas). Mesmas operações:
 * listar, criar, editar, reordenar, arquivar/restaurar, excluir (só arquivada),
 * escolher os produtos (e a ordem, nas categorias) e a imagem de capa.
 */
export async function adminGroupingRoutes(app: FastifyInstance) {
  // ── Capa: upload direto para o Storage com URL assinada ──
  app.post("/admin/uploads/cover", staff, async (req) => {
    const input = adminCoverSignSchema.parse(req.body);
    const path = `capas/${input.kind}/${input.id}/${randomUUID()}.${EXT[input.contentType]}`;
    const { data, error } = await supabaseAdmin().storage.from(env.STORAGE_BUCKET).createSignedUploadUrl(path);
    if (error) throw error;
    return { bucket: env.STORAGE_BUCKET, path, token: data.token };
  });

  // ───────────────────────────── Categorias ─────────────────────────────

  app.get("/admin/categories", staff, async (req) => {
    const { arquivadas } = z.object({ arquivadas: z.coerce.boolean().default(false) }).parse(req.query);
    const rows = await prisma.category.findMany({
      where: { archivedAt: arquivadas ? { not: null } : null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { products: true } } },
    });
    return rows.map(({ _count, ...c }) => ({ ...c, productCount: _count.products }));
  });

  app.get<{ Params: { id: string } }>("/admin/categories/:id", staff, async (req, reply) => {
    const c = await prisma.category.findUnique({
      where: { id: id.parse(req.params.id) },
      include: { products: { orderBy: { sortOrder: "asc" }, include: { product: { select: { id: true, name: true, status: true, priceCents: true } } } } },
    });
    if (!c) return notFound(reply);
    const { products, ...rest } = c;
    return { ...rest, products: products.map((p) => p.product) };
  });

  app.post("/admin/categories", staff, async (req, reply) => {
    const input = adminCategorySchema.parse(req.body);
    const last = await prisma.category.aggregate({ _max: { sortOrder: true } });
    try {
      const c = await prisma.category.create({ data: { ...input, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
      await audit(req, { action: "category.create", entity: "categoria", entityId: c.id, summary: `Criou a categoria "${c.name}"`, after: input });
      revalidateStore(["catalog", "home"]);
      return reply.code(201).send(c);
    } catch (err) {
      throw duplicate(err);
    }
  });

  app.put<{ Params: { id: string } }>("/admin/categories/:id", staff, async (req, reply) => {
    const categoryId = id.parse(req.params.id);
    const input = adminCategorySchema.parse(req.body);
    const prev = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!prev) return notFound(reply);
    try {
      const c = await prisma.category.update({ where: { id: categoryId }, data: input });
      const d = diffSummary(prev, c, { name: "Nome", slug: "Endereço", showInMenu: "No menu", bannerUrl: "Capa", tone: "Cor" });
      await audit(req, { action: "category.update", entity: "categoria", entityId: c.id, summary: `Categoria "${c.name}"${d.summary ? ` — ${d.summary}` : ": textos"}`, before: d.before, after: d.after });
      revalidateStore(["catalog", "home"]);
      return c;
    } catch (err) {
      throw duplicate(err);
    }
  });

  app.put("/admin/categories/order", staff, async (req) => {
    const { ids } = adminOrderSchema.parse(req.body);
    await prisma.$transaction(ids.map((cid, i) => prisma.category.updateMany({ where: { id: cid }, data: { sortOrder: i } })));
    await audit(req, { action: "category.reorder", entity: "categoria", summary: "Reordenou as categorias", after: ids });
    revalidateStore(["catalog", "home"]);
    return { ok: true };
  });

  /** Produtos da categoria, na ordem em que aparecem em "Relevância". Substitui a lista. */
  app.put<{ Params: { id: string } }>("/admin/categories/:id/products", staff, async (req, reply) => {
    const categoryId = id.parse(req.params.id);
    const { productIds } = adminGroupProductsSchema.parse(req.body);
    const c = await prisma.category.findUnique({ where: { id: categoryId }, select: { name: true, products: { select: { productId: true } } } });
    if (!c) return notFound(reply);
    const unique = [...new Set(productIds)];
    await prisma.$transaction([
      prisma.productCategory.deleteMany({ where: { categoryId, productId: { notIn: unique } } }),
      ...unique.map((productId, i) =>
        prisma.productCategory.upsert({ where: { productId_categoryId: { productId, categoryId } }, create: { productId, categoryId, sortOrder: i }, update: { sortOrder: i } }),
      ),
    ]);
    const before = c.products.map((p) => p.productId);
    const added = unique.filter((x) => !before.includes(x)).length;
    const removed = before.filter((x) => !unique.includes(x)).length;
    await audit(req, { action: "category.products", entity: "categoria", entityId: categoryId, summary: `Categoria "${c.name}": ${unique.length} produtos (+${added} / −${removed}, ordem atualizada)`, before, after: unique });
    revalidateStore(["catalog", "home"]);
    return { ok: true, count: unique.length };
  });

  registerLifecycle(app, "categoria");

  // ───────────────────────────── Coleções ─────────────────────────────

  app.get("/admin/collections", staff, async (req) => {
    const { arquivadas } = z.object({ arquivadas: z.coerce.boolean().default(false) }).parse(req.query);
    const rows = await prisma.collection.findMany({
      where: { archivedAt: arquivadas ? { not: null } : null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { products: true } } },
    });
    return rows.map(({ _count, ...c }) => ({ ...c, productCount: _count.products }));
  });

  app.get<{ Params: { id: string } }>("/admin/collections/:id", staff, async (req, reply) => {
    const c = await prisma.collection.findUnique({
      where: { id: id.parse(req.params.id) },
      include: { products: { orderBy: { name: "asc" }, select: { id: true, name: true, status: true, priceCents: true } } },
    });
    return c ?? notFound(reply);
  });

  app.post("/admin/collections", staff, async (req, reply) => {
    const input = adminCollectionSchema.parse(req.body);
    const last = await prisma.collection.aggregate({ _max: { sortOrder: true } });
    try {
      const c = await prisma.collection.create({ data: { ...input, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
      await audit(req, { action: "collection.create", entity: "colecao", entityId: c.id, summary: `Criou a coleção "${c.name}"`, after: input });
      return reply.code(201).send(c);
    } catch (err) {
      throw duplicate(err);
    }
  });

  app.put<{ Params: { id: string } }>("/admin/collections/:id", staff, async (req, reply) => {
    const collectionId = id.parse(req.params.id);
    const input = adminCollectionSchema.parse(req.body);
    const prev = await prisma.collection.findUnique({ where: { id: collectionId } });
    if (!prev) return notFound(reply);
    try {
      const c = await prisma.collection.update({ where: { id: collectionId }, data: input });
      const d = diffSummary(prev, c, { name: "Nome", slug: "Endereço", season: "Temporada", coverUrl: "Capa" });
      await audit(req, { action: "collection.update", entity: "colecao", entityId: c.id, summary: `Coleção "${c.name}"${d.summary ? ` — ${d.summary}` : ": textos"}`, before: d.before, after: d.after });
      revalidateStore(["catalog"]);
      return c;
    } catch (err) {
      throw duplicate(err);
    }
  });

  app.put("/admin/collections/order", staff, async (req) => {
    const { ids } = adminOrderSchema.parse(req.body);
    await prisma.$transaction(ids.map((cid, i) => prisma.collection.updateMany({ where: { id: cid }, data: { sortOrder: i } })));
    await audit(req, { action: "collection.reorder", entity: "colecao", summary: "Reordenou as coleções", after: ids });
    return { ok: true };
  });

  /** Produtos da coleção (cada produto pertence a no máximo uma coleção). */
  app.put<{ Params: { id: string } }>("/admin/collections/:id/products", staff, async (req, reply) => {
    const collectionId = id.parse(req.params.id);
    const { productIds } = adminGroupProductsSchema.parse(req.body);
    const c = await prisma.collection.findUnique({ where: { id: collectionId }, select: { name: true, products: { select: { id: true } } } });
    if (!c) return notFound(reply);
    const unique = [...new Set(productIds)];
    const moved = await prisma.product.count({ where: { id: { in: unique }, collectionId: { not: null, notIn: [collectionId] } } });
    await prisma.$transaction([
      prisma.product.updateMany({ where: { collectionId, id: { notIn: unique } }, data: { collectionId: null } }),
      prisma.product.updateMany({ where: { id: { in: unique } }, data: { collectionId } }),
    ]);
    const before = c.products.map((p) => p.id);
    await audit(req, {
      action: "collection.products",
      entity: "colecao",
      entityId: collectionId,
      summary: `Coleção "${c.name}": ${unique.length} produtos${moved ? ` (${moved} vieram de outra coleção)` : ""}`,
      before,
      after: unique,
    });
    revalidateStore(["catalog"]);
    return { ok: true, count: unique.length, moved };
  });

  registerLifecycle(app, "colecao");
}

/** Arquivar, restaurar e excluir de vez (só arquivada) — igual para categorias e coleções. */
function registerLifecycle(app: FastifyInstance, kind: "categoria" | "colecao") {
  const base = kind === "categoria" ? "/admin/categories" : "/admin/collections";
  const label = kind === "categoria" ? "categoria" : "coleção";
  const find = (gid: string) =>
    kind === "categoria" ? prisma.category.findUnique({ where: { id: gid }, select: { name: true, archivedAt: true } }) : prisma.collection.findUnique({ where: { id: gid }, select: { name: true, archivedAt: true } });
  const setArchived = (gid: string, archivedAt: Date | null) =>
    kind === "categoria" ? prisma.category.update({ where: { id: gid }, data: { archivedAt, ...(archivedAt ? { showInMenu: false } : {}) } }) : prisma.collection.update({ where: { id: gid }, data: { archivedAt } });

  app.post<{ Params: { id: string } }>(`${base}/:id/archive`, staff, async (req, reply) => {
    const gid = id.parse(req.params.id);
    const g = await find(gid);
    if (!g) return notFound(reply);
    if (!g.archivedAt) {
      await setArchived(gid, new Date());
      await audit(req, { action: `${kind}.archive`, entity: kind, entityId: gid, summary: `Arquivou a ${label} "${g.name}"` });
      revalidateStore(["catalog", "home"]);
    }
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>(`${base}/:id/restore`, staff, async (req, reply) => {
    const gid = id.parse(req.params.id);
    const g = await find(gid);
    if (!g) return notFound(reply);
    if (g.archivedAt) {
      await setArchived(gid, null);
      await audit(req, { action: `${kind}.restore`, entity: kind, entityId: gid, summary: `Restaurou a ${label} "${g.name}"` });
      revalidateStore(["catalog", "home"]);
    }
    return { ok: true };
  });

  /** Excluir de vez: só arquivada. Os produtos continuam (só perdem o vínculo). */
  app.delete<{ Params: { id: string } }>(`${base}/:id`, staff, async (req, reply) => {
    const gid = id.parse(req.params.id);
    const g = await find(gid);
    if (!g) return reply.code(204).send();
    if (!g.archivedAt) return reply.code(409).send({ error: "nao_arquivada", message: `Arquive a ${label} antes de excluir de vez.` });
    if (kind === "categoria") await prisma.category.delete({ where: { id: gid } });
    else await prisma.collection.delete({ where: { id: gid } });
    await audit(req, { action: `${kind}.delete`, entity: kind, entityId: gid, summary: `Excluiu de vez a ${label} "${g.name}" (os produtos continuam)` });
    revalidateStore(["catalog", "home"]);
    return reply.code(204).send();
  });
}
