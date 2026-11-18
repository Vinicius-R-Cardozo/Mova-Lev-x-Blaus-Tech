import type { FastifyInstance, FastifyReply } from "fastify";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma";

/** Status que contam como venda (não entram aguardando pagamento nem cancelado). */
const PAID = ["PAGO", "EM_SEPARACAO", "ENVIADO", "ENTREGUE"];

const listSchema = z.object({
  q: z.string().trim().max(120).optional(),
  sort: z.enum(["recentes", "gasto", "pedidos", "nome"]).default("recentes"),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(10).max(100).default(30),
});

type CustomerRow = {
  email: string;
  name: string | null;
  phone: string | null;
  hasAccount: boolean;
  orders: number;
  paidOrders: number;
  spentCents: number;
  lastOrderAt: Date | null;
  createdAt: Date | null;
  total: number;
};

/**
 * Clientes = quem tem conta (perfil de cliente) + quem comprou sem conta, juntos
 * pelo e-mail. Só Admin (dados pessoais e de compra).
 */
export async function adminCustomerRoutes(app: FastifyInstance) {
  app.get("/admin/customers", async (req) => {
    const f = listSchema.parse(req.query);
    const like = f.q ? `%${f.q.replace(/[%_\\]/g, (m) => `\\${m}`)}%` : null;
    const order = {
      recentes: Prisma.sql`COALESCE(last_order_at, created_at) DESC NULLS LAST`,
      gasto: Prisma.sql`spent_cents DESC, last_order_at DESC NULLS LAST`,
      pedidos: Prisma.sql`orders DESC, last_order_at DESC NULLS LAST`,
      nome: Prisma.sql`LOWER(COALESCE(name, email)) ASC`,
    }[f.sort];
    const rows = await prisma.$queryRaw<CustomerRow[]>`
      WITH o AS (
        SELECT LOWER(email) AS email,
               (ARRAY_AGG("customerName" ORDER BY "createdAt" DESC))[1] AS name,
               (ARRAY_AGG("customerPhone" ORDER BY "createdAt" DESC))[1] AS phone,
               COUNT(*)::int AS orders,
               COUNT(*) FILTER (WHERE status::text = ANY(${PAID}))::int AS paid_orders,
               COALESCE(SUM("totalCents" - "refundCents") FILTER (WHERE status::text = ANY(${PAID})), 0)::int AS spent_cents,
               MAX("createdAt") AS last_order_at
        FROM orders GROUP BY LOWER(email)
      ),
      p AS (
        SELECT LOWER(email) AS email, name, phone, "createdAt" AS created_at FROM profiles WHERE role = 'CUSTOMER'
      ),
      j AS (
        SELECT COALESCE(p.email, o.email) AS email,
               COALESCE(p.name, o.name) AS name,
               COALESCE(p.phone, o.phone) AS phone,
               (p.email IS NOT NULL) AS has_account,
               COALESCE(o.orders, 0) AS orders,
               COALESCE(o.paid_orders, 0) AS paid_orders,
               COALESCE(o.spent_cents, 0) AS spent_cents,
               o.last_order_at,
               p.created_at
        FROM p FULL OUTER JOIN o ON o.email = p.email
      )
      SELECT email, name, phone, has_account AS "hasAccount", orders, paid_orders AS "paidOrders", spent_cents AS "spentCents",
             last_order_at AS "lastOrderAt", created_at AS "createdAt", COUNT(*) OVER()::int AS total
      FROM j
      WHERE ${like}::text IS NULL OR email ILIKE ${like} OR name ILIKE ${like} OR phone ILIKE ${like}
      ORDER BY ${order}
      LIMIT ${f.perPage} OFFSET ${(f.page - 1) * f.perPage}`;
    return { total: rows[0]?.total ?? 0, page: f.page, perPage: f.perPage, items: rows.map(({ total: _t, ...r }) => r) };
  });

  /** Ficha do cliente: dados, endereços (se tem conta) e todos os pedidos. */
  app.get("/admin/customers/detail", async (req, reply: FastifyReply) => {
    const { email } = z.object({ email: z.string().trim().toLowerCase().email() }).parse(req.query);
    const [profile, orders] = await Promise.all([
      prisma.profile.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { id: true, email: true, name: true, phone: true, cpf: true, role: true, createdAt: true, addresses: { orderBy: { isDefault: "desc" } } },
      }),
      prisma.order.findMany({
        where: { email: { equals: email, mode: "insensitive" } },
        orderBy: { createdAt: "desc" },
        select: { id: true, number: true, status: true, createdAt: true, totalCents: true, refundCents: true, paymentMethod: true, customerName: true, customerPhone: true, customerCpf: true, items: { select: { quantity: true } } },
      }),
    ]);
    if (!profile && orders.length === 0) return reply.code(404).send({ error: "nao_encontrado", message: "Cliente não encontrado." });
    const paid = orders.filter((o) => PAID.includes(o.status));
    const spent = paid.reduce((n, o) => n + o.totalCents - o.refundCents, 0);
    const last = orders[0];
    return {
      email,
      name: profile?.name ?? last?.customerName ?? null,
      phone: profile?.phone ?? last?.customerPhone ?? null,
      cpf: profile?.cpf ?? last?.customerCpf ?? null,
      hasAccount: !!profile,
      isStaff: profile ? profile.role !== "CUSTOMER" : false,
      accountCreatedAt: profile?.createdAt ?? null,
      addresses: profile?.addresses ?? [],
      metrics: { orders: orders.length, paidOrders: paid.length, spentCents: spent, avgTicketCents: paid.length ? Math.round(spent / paid.length) : 0, firstOrderAt: orders.at(-1)?.createdAt ?? null, lastOrderAt: last?.createdAt ?? null },
      orders: orders.map(({ items, customerName: _n, customerPhone: _p, customerCpf: _c, ...o }) => ({ ...o, pieces: items.reduce((n, i) => n + i.quantity, 0) })),
    };
  });
}
