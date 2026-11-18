import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { lowStockThreshold } from "../../lib/settings";

const PAID = ["PAGO", "EM_SEPARACAO", "ENVIADO", "ENTREGUE"];
const TZ = "America/Sao_Paulo";

type PeriodRow = { orders: number; revenue: number };

/** Vendas pagas num intervalo [desde, até), já descontando estornos. */
async function period(fromSql: Prisma.Sql, toSql: Prisma.Sql): Promise<{ orders: number; revenueCents: number; avgTicketCents: number }> {
  const [r] = await prisma.$queryRaw<PeriodRow[]>`
    SELECT COUNT(*)::int AS orders, COALESCE(SUM("totalCents" - "refundCents"), 0)::int AS revenue
    FROM orders
    WHERE status::text = ANY(${PAID}) AND "createdAt" >= ${fromSql} AND "createdAt" < ${toSql}`;
  const orders = r?.orders ?? 0;
  const revenue = r?.revenue ?? 0;
  return { orders, revenueCents: revenue, avgTicketCents: orders ? Math.round(revenue / orders) : 0 };
}

/** Início do dia de hoje em São Paulo, deslocado em `days` dias (em UTC, para comparar com createdAt). */
const dayStart = (days: number) => Prisma.sql`((date_trunc('day', now() AT TIME ZONE ${TZ}) - make_interval(days => ${days}::int)) AT TIME ZONE ${TZ})`;

/**
 * Dashboard (só Admin): vendas de hoje/7/30 dias comparadas ao período anterior,
 * ticket médio, pedidos que pedem ação, mais vendidos, estoque baixo e a série
 * diária de faturamento dos últimos 30 dias.
 */
export async function adminDashboardRoutes(app: FastifyInstance) {
  app.get("/admin/dashboard", async () => {
    const threshold = await lowStockThreshold();
    const [today, yesterday, week, prevWeek, month, prevMonth] = await Promise.all([
      period(dayStart(0), Prisma.sql`now()`),
      period(dayStart(1), dayStart(0)),
      period(dayStart(6), Prisma.sql`now()`),
      period(dayStart(13), dayStart(6)),
      period(dayStart(29), Prisma.sql`now()`),
      period(dayStart(59), dayStart(29)),
    ]);

    const [byStatus, series, bestSellers, lowStock, lowCounts, recent, subscribers] = await Promise.all([
      prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.$queryRaw<{ day: string; revenue: number; orders: number }[]>`
        SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
               COALESCE(SUM(o."totalCents" - o."refundCents"), 0)::int AS revenue,
               COUNT(o.id)::int AS orders
        FROM generate_series(date_trunc('day', now() AT TIME ZONE ${TZ}) - interval '29 days', date_trunc('day', now() AT TIME ZONE ${TZ}), interval '1 day') AS d(day)
        LEFT JOIN orders o ON status::text = ANY(${PAID}) AND date_trunc('day', o."createdAt" AT TIME ZONE ${TZ}) = d.day
        GROUP BY d.day ORDER BY d.day`,
      prisma.$queryRaw<{ productId: string; name: string; pieces: number; revenue: number }[]>`
        SELECT v."productId", MAX(oi."productName") AS name, SUM(oi.quantity)::int AS pieces, SUM(oi.quantity * oi."unitPriceCents")::int AS revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi."orderId"
        JOIN variants v ON v.id = oi."variantId"
        WHERE o.status::text = ANY(${PAID}) AND o."createdAt" >= ${dayStart(29)}
        GROUP BY v."productId" ORDER BY pieces DESC, revenue DESC LIMIT 5`,
      prisma.variant.findMany({
        where: { stock: { lte: threshold }, product: { status: { in: ["ACTIVE", "HIDDEN"] } } },
        orderBy: [{ stock: "asc" }, { sku: "asc" }],
        take: 8,
        select: { id: true, sku: true, size: true, stock: true, color: { select: { name: true } }, product: { select: { id: true, name: true } } },
      }),
      Promise.all([
        prisma.variant.count({ where: { stock: 0, product: { status: { in: ["ACTIVE", "HIDDEN"] } } } }),
        prisma.variant.count({ where: { stock: { gt: 0, lte: threshold }, product: { status: { in: ["ACTIVE", "HIDDEN"] } } } }),
      ]),
      prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: { id: true, number: true, status: true, customerName: true, totalCents: true, createdAt: true } }),
      prisma.newsletterSubscriber.count({ where: { unsubscribedAt: null } }),
    ]);

    const count = (s: string) => byStatus.find((b) => b.status === s)?._count._all ?? 0;
    return {
      periods: {
        today: { ...today, previous: yesterday, label: "Hoje", previousLabel: "ontem" },
        week: { ...week, previous: prevWeek, label: "7 dias", previousLabel: "7 dias anteriores" },
        month: { ...month, previous: prevMonth, label: "30 dias", previousLabel: "30 dias anteriores" },
      },
      actions: {
        awaitingPayment: count("AGUARDANDO_PAGAMENTO"),
        toShip: count("PAGO") + count("EM_SEPARACAO"),
        inTransit: count("ENVIADO"),
      },
      series,
      bestSellers,
      stock: { threshold, soldOut: lowCounts[0], low: lowCounts[1], items: lowStock.map((v) => ({ id: v.id, sku: v.sku, size: v.size, stock: v.stock, color: v.color.name, productId: v.product.id, productName: v.product.name })) },
      recent,
      subscribers,
    };
  });
}
