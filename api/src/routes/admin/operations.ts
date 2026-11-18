import type { FastifyInstance, FastifyReply } from "fastify";
import type { OrderStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABEL,
  ORDER_TRANSITIONS,
  adminCouponSchema,
  adminOrderStatusSchema,
  adminShippingSchema,
  adminTiersSchema,
  adminTrackingSchema,
  shippingSettingsSchema,
} from "@movalev/shared";
import { prisma } from "../../lib/prisma";
import { withIdempotency } from "../../lib/idempotency";
import { cancelOrder, sendConfirmationEmail, toOrderDTO } from "../../lib/orders";
import { revalidateStore } from "../../lib/revalidate";
import { audit, diffSummary } from "../../lib/audit";

const id = z.string().uuid();

/** CSV para Excel pt-BR: ";" + BOM, aspas escapadas e proteção contra injeção de fórmula. */
function csv(rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    let s = v === null || v === undefined ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n");
}
const money = (c: number) => (c / 100).toFixed(2).replace(".", ",");
const sendCsv = (reply: FastifyReply, name: string, body: string) =>
  reply.header("Content-Type", "text/csv; charset=utf-8").header("Content-Disposition", `attachment; filename="${name}"`).header("Cache-Control", "no-store").send(body);

const orderFilterSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  q: z.string().trim().max(80).optional(),
  de: z.coerce.date().optional(),
  ate: z.coerce.date().optional(),
  pagina: z.coerce.number().int().min(1).default(1),
});

function orderWhere(f: z.infer<typeof orderFilterSchema>): Prisma.OrderWhereInput {
  const n = f.q && /^#?\d+$/.test(f.q) ? Number(f.q.replace("#", "")) : null;
  return {
    ...(f.status ? { status: f.status } : {}),
    ...(f.de || f.ate ? { createdAt: { ...(f.de ? { gte: f.de } : {}), ...(f.ate ? { lte: new Date(f.ate.getTime() + 86_399_999) } : {}) } } : {}),
    ...(f.q
      ? { OR: [...(n ? [{ number: n }] : []), { email: { contains: f.q, mode: "insensitive" as const } }, { customerName: { contains: f.q, mode: "insensitive" as const } }] }
      : {}),
  };
}

export async function adminOperationsRoutes(app: FastifyInstance) {
  // ── Resumo ──
  app.get("/admin/summary", async () => {
    const since = new Date(Date.now() - 30 * 86_400_000);
    const [byStatus, paid, lowStock, subscribers] = await Promise.all([
      prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.order.aggregate({ where: { status: { in: ["PAGO", "EM_SEPARACAO", "ENVIADO", "ENTREGUE"] }, createdAt: { gte: since } }, _sum: { totalCents: true }, _count: { _all: true } }),
      prisma.variant.count({ where: { stock: { lte: 2 }, product: { status: "ACTIVE" } } }),
      prisma.newsletterSubscriber.count({ where: { unsubscribedAt: null } }),
    ]);
    return {
      orders: Object.fromEntries(ORDER_STATUSES.map((s) => [s, byStatus.find((b) => b.status === s)?._count._all ?? 0])),
      revenue30dCents: paid._sum.totalCents ?? 0,
      paidOrders30d: paid._count._all,
      lowStockVariants: lowStock,
      subscribers,
    };
  });

  // ── Pedidos ──
  app.get("/admin/orders", async (req) => {
    const f = orderFilterSchema.parse(req.query);
    const where = orderWhere(f);
    const [total, rows] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (f.pagina - 1) * 30, take: 30, include: { items: { select: { quantity: true } } } }),
    ]);
    return {
      total,
      page: f.pagina,
      pageSize: 30,
      items: rows.map((o) => ({
        id: o.id,
        number: o.number,
        status: o.status,
        createdAt: o.createdAt,
        customerName: o.customerName,
        email: o.email,
        totalCents: o.totalCents,
        paymentMethod: o.paymentMethod,
        shippingLabel: o.shippingLabel,
        pieces: o.items.reduce((n, i) => n + i.quantity, 0),
        trackingCode: o.trackingCode,
      })),
    };
  });

  app.get("/admin/orders.csv", async (req, reply) => {
    const f = orderFilterSchema.parse(req.query);
    const rows = await prisma.order.findMany({ where: orderWhere(f), orderBy: { createdAt: "desc" }, take: 5000, include: { items: true } });
    const body = csv([
      ["Pedido", "Data", "Status", "Cliente", "E-mail", "Celular", "Itens", "Subtotal", "Desconto progressivo", "Cupom", "Desconto cupom", "Frete", "Desconto Pix", "Total", "Pagamento", "Parcelas", "Envio", "Cidade", "UF", "Rastreio"],
      ...rows.map((o) => {
        const addr = (o.shippingAddress ?? {}) as Record<string, string>;
        return [
          o.number,
          o.createdAt.toISOString(),
          ORDER_STATUS_LABEL[o.status],
          o.customerName,
          o.email,
          o.customerPhone,
          o.items.map((i) => `${i.quantity}x ${i.sku}`).join(" | "),
          money(o.subtotalCents),
          money(o.progressiveDiscountCents),
          o.couponCode,
          money(o.couponDiscountCents),
          money(o.shippingCents),
          money(o.pixDiscountCents),
          money(o.totalCents),
          o.paymentMethod,
          o.installments,
          o.shippingLabel,
          addr.city,
          addr.uf,
          o.trackingCode,
        ];
      }),
    ]);
    return sendCsv(reply, `pedidos-movalev-${new Date().toISOString().slice(0, 10)}.csv`, body);
  });

  app.get<{ Params: { id: string } }>("/admin/orders/:id", async (req, reply) => {
    const o = await prisma.order.findUnique({ where: { id: id.parse(req.params.id) }, include: { items: true, events: { orderBy: { createdAt: "asc" } } } });
    if (!o) return reply.code(404).send({ error: "nao_encontrado" });
    return {
      ...toOrderDTO(o),
      customerPhone: o.customerPhone,
      customerCpf: o.customerCpf,
      paymentRef: o.paymentRef,
      confirmationEmailSentAt: o.confirmationEmailSentAt,
      events: o.events,
      allowedTransitions: ORDER_TRANSITIONS[o.status],
    };
  });

  /**
   * Mudança de status (Aguardando → Pago → Em separação → Enviado → Entregue / Cancelado).
   * Idempotente: pedir o status atual de novo não faz nada. Cancelar devolve estoque e cupom.
   */
  app.post<{ Params: { id: string } }>("/admin/orders/:id/status", async (req, reply) => {
    const orderId = id.parse(req.params.id);
    const { status, trackingCode } = adminOrderStatusSchema.parse(req.body);
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return reply.code(404).send({ error: "nao_encontrado" });
    const actor = `admin:${req.user!.email}`;
    if (order.status === status) return { ok: true, changed: false };
    if (!ORDER_TRANSITIONS[order.status].includes(status)) {
      return reply.code(422).send({ error: "transicao_invalida", message: `Não é possível ir de “${ORDER_STATUS_LABEL[order.status]}” para “${ORDER_STATUS_LABEL[status]}”.` });
    }
    if (status === "CANCELADO") {
      const done = await cancelOrder(orderId, "Cancelado pelo admin. Estoque devolvido.", actor);
      if (done) await audit(req, { action: "order.cancel", entity: "pedido", entityId: orderId, summary: `Pedido #${order.number} cancelado (estoque devolvido)`, before: { status: order.status }, after: { status } });
      return { ok: true, changed: done };
    }
    const moved = await prisma.order.updateMany({
      where: { id: orderId, status: order.status as OrderStatus },
      data: { status, ...(trackingCode ? { trackingCode } : {}) },
    });
    if (moved.count === 0) return reply.code(409).send({ error: "conflito", message: "O pedido mudou enquanto você editava. Recarregue." });
    await prisma.orderEvent.create({ data: { orderId, status, message: `Status: ${ORDER_STATUS_LABEL[status]}${trackingCode ? ` · rastreio ${trackingCode}` : ""}`, actor } });
    await audit(req, { action: "order.status", entity: "pedido", entityId: orderId, summary: `Pedido #${order.number}: ${ORDER_STATUS_LABEL[order.status]} → ${ORDER_STATUS_LABEL[status]}`, before: { status: order.status }, after: { status, trackingCode } });
    return { ok: true, changed: true };
  });

  app.put<{ Params: { id: string } }>("/admin/orders/:id/tracking", async (req) => {
    const orderId = id.parse(req.params.id);
    const { trackingCode } = adminTrackingSchema.parse(req.body);
    const o = await prisma.order.update({ where: { id: orderId }, data: { trackingCode: trackingCode || null } });
    await audit(req, { action: "order.tracking", entity: "pedido", entityId: orderId, summary: `Pedido #${o.number}: rastreio ${trackingCode || "removido"}` });
    await prisma.orderEvent.create({ data: { orderId, message: trackingCode ? `Código de rastreio: ${trackingCode}` : "Código de rastreio removido", actor: `admin:${req.user!.email}` } });
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>("/admin/orders/:id/resend-email", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req) => {
    const ok = await sendConfirmationEmail(id.parse(req.params.id), { force: true });
    return { ok };
  });

  // ── Cupons ──
  app.get("/admin/coupons", async () => prisma.coupon.findMany({ orderBy: [{ active: "desc" }, { code: "asc" }] }));

  app.post("/admin/coupons", async (req, reply) =>
    withIdempotency<unknown>(req, reply, "admin-coupon", async () => {
      const input = adminCouponSchema.parse(req.body);
      if (await prisma.coupon.findUnique({ where: { code: input.code } })) return { status: 409, body: { error: "duplicado", message: "Já existe um cupom com esse código." } };
      const c = await prisma.coupon.create({ data: input });
      await audit(req, { action: "coupon.create", entity: "cupom", entityId: c.id, summary: `Criou o cupom ${c.code}`, after: input });
      return { status: 201, body: c };
    }),
  );

  app.put<{ Params: { id: string } }>("/admin/coupons/:id", async (req, reply) => {
    const couponId = id.parse(req.params.id);
    const input = adminCouponSchema.parse(req.body);
    const clash = await prisma.coupon.findFirst({ where: { code: input.code, id: { not: couponId } } });
    if (clash) return reply.code(409).send({ error: "duplicado", message: "Já existe um cupom com esse código." });
    const prev = await prisma.coupon.findUnique({ where: { id: couponId } });
    const c = await prisma.coupon.update({ where: { id: couponId }, data: input });
    const d = diffSummary((prev ?? {}) as Record<string, unknown>, c as unknown as Record<string, unknown>, { code: "Código", value: "Valor", type: "Tipo", active: "Ativo", minSubtotalCents: "Mínimo", maxRedemptions: "Limite" });
    await audit(req, { action: "coupon.update", entity: "cupom", entityId: c.id, summary: `Cupom ${c.code}${d.summary ? ` — ${d.summary}` : ""}`, before: d.before, after: d.after });
    return c;
  });

  // ── Regras: desconto progressivo e frete ──
  app.get("/admin/settings/progressive", async () => ({ tiers: await prisma.progressiveTier.findMany({ orderBy: { minItems: "asc" } }) }));

  app.put("/admin/settings/progressive", async (req) => {
    const { tiers } = adminTiersSchema.parse(req.body);
    const prevTiers = await prisma.progressiveTier.findMany({ orderBy: { minItems: "asc" } });
    await audit(req, { action: "settings.progressive", entity: "configuracao", entityId: "progressivo", summary: `Desconto progressivo: ${tiers.map((t) => `${t.minItems}+ = ${t.percent}%`).join(", ")}`, before: prevTiers, after: tiers });
    await prisma.$transaction([prisma.progressiveTier.deleteMany({}), prisma.progressiveTier.createMany({ data: tiers })]);
    revalidateStore(["catalog", "home"]);
    return { tiers };
  });

  app.get("/admin/settings/shipping", async () => {
    const [setting, regions] = await Promise.all([prisma.setting.findUnique({ where: { key: "shipping" } }), prisma.shippingRegion.findMany({ orderBy: { sortOrder: "asc" } })]);
    const s = shippingSettingsSchema.parse(setting?.value);
    return { ...s, regions };
  });

  app.put("/admin/settings/shipping", async (req) => {
    const input = adminShippingSchema.parse(req.body);
    const value = { freeShippingThresholdCents: input.freeShippingThresholdCents, pickup: input.pickup };
    const prevShip = await prisma.setting.findUnique({ where: { key: "shipping" } });
    await audit(req, { action: "settings.shipping", entity: "configuracao", entityId: "frete", summary: "Editou frete e retirada", before: prevShip?.value ?? null, after: input });
    await prisma.$transaction([
      prisma.setting.upsert({ where: { key: "shipping" }, create: { key: "shipping", value }, update: { value } }),
      prisma.shippingRegion.deleteMany({}),
      prisma.shippingRegion.createMany({ data: input.regions.map((r, i) => ({ ...r, sortOrder: i })) }),
    ]);
    revalidateStore(["catalog", "home"]);
    return input;
  });

  // ── Newsletter ──
  app.get("/admin/newsletter", async (req) => {
    const { pagina } = z.object({ pagina: z.coerce.number().int().min(1).default(1) }).parse(req.query);
    const [total, items] = await Promise.all([
      prisma.newsletterSubscriber.count({ where: { unsubscribedAt: null } }),
      prisma.newsletterSubscriber.findMany({ where: { unsubscribedAt: null }, orderBy: { createdAt: "desc" }, skip: (pagina - 1) * 50, take: 50 }),
    ]);
    return { total, page: pagina, pageSize: 50, items };
  });

  app.get("/admin/newsletter.csv", async (_req, reply) => {
    const rows = await prisma.newsletterSubscriber.findMany({ where: { unsubscribedAt: null }, orderBy: { createdAt: "desc" } });
    return sendCsv(reply, `newsletter-movalev-${new Date().toISOString().slice(0, 10)}.csv`, csv([["E-mail", "Origem", "Consentimento em"], ...rows.map((r) => [r.email, r.source, r.consentAt.toISOString()])]));
  });
}
