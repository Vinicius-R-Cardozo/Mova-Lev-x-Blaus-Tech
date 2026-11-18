import type { FastifyInstance } from "fastify";
import type { Prisma } from "@prisma/client";
import { STOCK_MOVEMENT_LABEL, adminMovementListSchema, adminStockAdjustSchema, adminStockListSchema, adminStockSettingsSchema } from "@movalev/shared";
import { prisma } from "../../lib/prisma";
import { audit } from "../../lib/audit";
import { recordMovement } from "../../lib/stock";
import { lowStockThreshold, stockSettings } from "../../lib/settings";
import { clearCache } from "../../lib/cache";
import { revalidateStore } from "../../lib/revalidate";

const staff = { config: { allow: "staff" as const } };

/** Estoque: visão por variante, ajuste manual com motivo, histórico e limite de alerta. */
export async function adminStockRoutes(app: FastifyInstance) {
  app.get("/admin/stock", staff, async (req) => {
    const f = adminStockListSchema.parse(req.query);
    const threshold = await lowStockThreshold();
    const base: Prisma.VariantWhereInput = {
      product: {
        status: { not: "ARCHIVED" },
        ...(f.categoryId ? { categories: { some: { categoryId: f.categoryId } } } : {}),
      },
      ...(f.q
        ? { OR: [{ sku: { contains: f.q.toUpperCase() } }, { product: { name: { contains: f.q, mode: "insensitive" } } }, { color: { name: { contains: f.q, mode: "insensitive" } } }] }
        : {}),
    };
    const byStatus: Prisma.VariantWhereInput =
      f.status === "esgotado" ? { stock: 0 } : f.status === "baixo" ? { stock: { gt: 0, lte: threshold } } : f.status === "ok" ? { stock: { gt: threshold } } : {};
    const where = { ...base, ...byStatus };
    const [total, rows, out, low, units] = await Promise.all([
      prisma.variant.count({ where }),
      prisma.variant.findMany({
        where,
        orderBy: [{ stock: "asc" }, { product: { name: "asc" } }, { sku: "asc" }],
        skip: (f.page - 1) * f.perPage,
        take: f.perPage,
        include: {
          product: { select: { id: true, name: true, status: true } },
          color: { select: { name: true, hex: true } },
          movements: { orderBy: { createdAt: "desc" }, take: 1, select: { type: true, delta: true, createdAt: true } },
        },
      }),
      prisma.variant.count({ where: { ...base, stock: 0 } }),
      prisma.variant.count({ where: { ...base, stock: { gt: 0, lte: threshold } } }),
      prisma.variant.aggregate({ where: base, _sum: { stock: true }, _count: { _all: true } }),
    ]);
    return {
      total,
      page: f.page,
      perPage: f.perPage,
      threshold,
      summary: { variants: units._count._all, units: units._sum.stock ?? 0, soldOut: out, low },
      items: rows.map((v) => ({
        id: v.id,
        sku: v.sku,
        size: v.size,
        stock: v.stock,
        productId: v.product.id,
        productName: v.product.name,
        productStatus: v.product.status,
        color: v.color,
        level: v.stock === 0 ? "esgotado" : v.stock <= threshold ? "baixo" : "ok",
        lastMovement: v.movements[0] ?? null,
      })),
    };
  });

  /**
   * Ajuste manual: Entrada/Devolução somam, Saída subtrai, Ajuste define a contagem.
   * Exige motivo, nunca deixa negativo e recusa se o estoque mudou desde que a
   * pessoa abriu a tela (venda no meio). Movimentação + auditoria na mesma operação.
   */
  app.post("/admin/stock/adjust", staff, async (req, reply) => {
    const input = adminStockAdjustSchema.parse(req.body);
    const actor = { id: req.user!.id, email: req.user!.email };
    const result = await prisma.$transaction(async (tx) => {
      const v = await tx.variant.findUnique({ where: { id: input.variantId }, include: { product: { select: { name: true } }, color: { select: { name: true } } } });
      if (!v) return { status: 404 as const, body: { error: "nao_encontrado", message: "Variante não encontrada." } };
      if (input.expectedStock !== undefined && input.expectedStock !== v.stock) {
        return { status: 409 as const, body: { error: "estoque_mudou", message: `O estoque mudou para ${v.stock} enquanto você ajustava (venda ou outro ajuste). Confira e tente de novo.` } };
      }
      const target = input.type === "AJUSTE" ? input.quantity : input.type === "SAIDA" ? v.stock - input.quantity : v.stock + input.quantity;
      if (target < 0) return { status: 422 as const, body: { error: "estoque_negativo", message: `Só há ${v.stock} em estoque; não dá para tirar ${input.quantity}.` } };
      const r = await tx.variant.updateMany({ where: { id: v.id, stock: v.stock }, data: { stock: target } });
      if (r.count === 0) return { status: 409 as const, body: { error: "estoque_mudou", message: "O estoque mudou agora há pouco. Tente de novo." } };
      await recordMovement(tx, { variantId: v.id, type: input.type, delta: target - v.stock, stockAfter: target, note: input.note || null, actor });
      return { status: 200 as const, body: { id: v.id, stock: target, before: v.stock, label: `${v.product.name} · ${v.color.name} · ${v.size} (${v.sku})` } };
    });
    if (result.status !== 200) return reply.code(result.status).send(result.body);
    const b = result.body;
    await audit(req, {
      action: "stock.adjust",
      entity: "estoque",
      entityId: b.id,
      summary: `${b.label}: ${STOCK_MOVEMENT_LABEL[input.type]} — estoque ${b.before} → ${b.stock}${input.note ? ` (${input.note})` : ""}`,
      before: { stock: b.before },
      after: { stock: b.stock, type: input.type, note: input.note ?? null },
    });
    revalidateStore(["catalog"]);
    return b;
  });

  app.get("/admin/stock/movements", staff, async (req) => {
    const f = adminMovementListSchema.parse(req.query);
    const where: Prisma.StockMovementWhereInput = {
      ...(f.variantId ? { variantId: f.variantId } : {}),
      ...(f.productId ? { variant: { productId: f.productId } } : {}),
      ...(f.type ? { type: f.type } : {}),
      ...(f.from || f.to ? { createdAt: { ...(f.from ? { gte: f.from } : {}), ...(f.to ? { lte: new Date(f.to.getTime() + 86_399_999) } : {}) } } : {}),
    };
    const [total, items] = await Promise.all([
      prisma.stockMovement.count({ where }),
      prisma.stockMovement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (f.page - 1) * f.perPage,
        take: f.perPage,
        include: { variant: { select: { sku: true, size: true, product: { select: { id: true, name: true } }, color: { select: { name: true } } } } },
      }),
    ]);
    const orderIds = [...new Set(items.map((i) => i.orderId).filter((x): x is string => !!x))];
    const orders = orderIds.length ? await prisma.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, number: true } }) : [];
    return {
      total,
      page: f.page,
      perPage: f.perPage,
      items: items.map((m) => ({
        id: m.id,
        type: m.type,
        delta: m.delta,
        stockAfter: m.stockAfter,
        note: m.note,
        actorEmail: m.actorEmail,
        createdAt: m.createdAt,
        order: m.orderId ? { id: m.orderId, number: orders.find((o) => o.id === m.orderId)?.number ?? null } : null,
        variant: { id: m.variantId, sku: m.variant.sku, size: m.variant.size, color: m.variant.color.name, productId: m.variant.product.id, productName: m.variant.product.name },
      })),
    };
  });

  app.get("/admin/settings/stock", staff, async () => stockSettings());

  app.put("/admin/settings/stock", staff, async (req) => {
    const input = adminStockSettingsSchema.parse(req.body);
    const prev = await stockSettings();
    await prisma.setting.upsert({ where: { key: "stock" }, create: { key: "stock", value: input }, update: { value: input } });
    clearCache();
    await audit(req, { action: "settings.stock", entity: "configuracao", entityId: "estoque", summary: `Alerta de estoque baixo: até ${prev.lowStockThreshold} → até ${input.lowStockThreshold} un.`, before: prev, after: input });
    return input;
  });
}
