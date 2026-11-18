import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { accountAddressSchema, favoritesMergeSchema, profileUpdateSchema, type AddressDTO, type OrderSummaryDTO, type ProfileDTO } from "@movalev/shared";
import { requireAuth } from "../plugins/auth";
import { prisma } from "../lib/prisma";
import { withIdempotency } from "../lib/idempotency";
import { cardInclude, toCard } from "../lib/catalog";

const profileSelect = { id: true, email: true, name: true, phone: true, cpf: true, role: true, createdAt: true } as const;
const toProfile = (p: { id: string; email: string; name: string | null; phone: string | null; cpf: string | null; role: "CUSTOMER" | "EDITOR" | "ADMIN"; createdAt: Date }): ProfileDTO => ({
  ...p,
  createdAt: p.createdAt.toISOString(),
});

export async function meRoutes(app: FastifyInstance) {
  app.addHook("preHandler", async (req, reply) => {
    if (req.routeOptions.url?.startsWith("/me")) await requireAuth(req, reply);
  });

  /** Perfil da cliente logada (o JWT do Supabase é validado no preHandler). */
  app.get("/me", async (req): Promise<ProfileDTO> => toProfile(await prisma.profile.findUniqueOrThrow({ where: { id: req.user!.id }, select: profileSelect })));

  app.patch("/me", async (req): Promise<ProfileDTO> => {
    const data = profileUpdateSchema.parse(req.body);
    return toProfile(await prisma.profile.update({ where: { id: req.user!.id }, data, select: profileSelect }));
  });

  // ── Pedidos ──
  app.get("/me/orders", async (req): Promise<OrderSummaryDTO[]> => {
    // Pedidos feitos como visitante com o mesmo e-mail (verificado pelo login) passam a ser da conta.
    await prisma.order.updateMany({ where: { profileId: null, email: req.user!.email }, data: { profileId: req.user!.id } });
    const orders = await prisma.order.findMany({
      where: { profileId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { items: { select: { quantity: true } } },
    });
    return orders.map((o) => ({
      id: o.id,
      number: o.number,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
      totalCents: o.totalCents,
      pieces: o.items.reduce((n, i) => n + i.quantity, 0),
      paymentMethod: o.paymentMethod,
      trackingCode: o.trackingCode,
    }));
  });

  // ── Endereços ──
  const toAddress = (a: AddressDTO & Record<string, unknown>): AddressDTO => ({
    id: a.id,
    label: a.label,
    recipient: a.recipient,
    cep: a.cep,
    street: a.street,
    number: a.number,
    complement: a.complement,
    district: a.district,
    city: a.city,
    uf: a.uf,
    isDefault: a.isDefault,
  });

  app.get("/me/addresses", async (req) => {
    const rows = await prisma.address.findMany({ where: { profileId: req.user!.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });
    return rows.map(toAddress);
  });

  app.post("/me/addresses", async (req, reply) =>
    withIdempotency(req, reply, `address:${req.user!.id}`, async () => {
      const input = accountAddressSchema.parse(req.body);
      const created = await prisma.$transaction(async (tx) => {
        const count = await tx.address.count({ where: { profileId: req.user!.id } });
        if (count >= 10) throw Object.assign(new Error("Limite de 10 endereços."), { statusCode: 422 });
        const makeDefault = input.isDefault || count === 0;
        if (makeDefault) await tx.address.updateMany({ where: { profileId: req.user!.id }, data: { isDefault: false } });
        return tx.address.create({ data: { ...input, profileId: req.user!.id, isDefault: makeDefault } });
      });
      return { status: 201, body: toAddress(created) };
    }),
  );

  app.put<{ Params: { id: string } }>("/me/addresses/:id", async (req, reply) => {
    const id = z.string().uuid().parse(req.params.id);
    const input = accountAddressSchema.parse(req.body);
    const owned = await prisma.address.findFirst({ where: { id, profileId: req.user!.id } });
    if (!owned) return reply.code(404).send({ error: "nao_encontrado", message: "Endereço não encontrado." });
    const updated = await prisma.$transaction(async (tx) => {
      if (input.isDefault) await tx.address.updateMany({ where: { profileId: req.user!.id }, data: { isDefault: false } });
      return tx.address.update({ where: { id }, data: { ...input, isDefault: input.isDefault ?? owned.isDefault } });
    });
    return toAddress(updated);
  });

  app.delete<{ Params: { id: string } }>("/me/addresses/:id", async (req, reply) => {
    const id = z.string().uuid().parse(req.params.id);
    await prisma.address.deleteMany({ where: { id, profileId: req.user!.id } });
    return reply.code(204).send();
  });

  // ── Favoritos ──
  app.get("/me/favorites", async (req) => {
    const favs = await prisma.favorite.findMany({
      where: { profileId: req.user!.id, product: { status: "ACTIVE" } },
      orderBy: { createdAt: "desc" },
      include: { product: { include: cardInclude } },
    });
    return favs.map((f) => toCard(f.product));
  });

  /** Junta os favoritos do navegador com os da conta (idempotente). Devolve todos os ids. */
  app.post("/me/favorites/merge", async (req) => {
    const { productIds } = favoritesMergeSchema.parse(req.body);
    const valid = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true } });
    if (valid.length) await prisma.favorite.createMany({ data: valid.map((p) => ({ profileId: req.user!.id, productId: p.id })), skipDuplicates: true });
    const all = await prisma.favorite.findMany({ where: { profileId: req.user!.id }, select: { productId: true } });
    return { productIds: all.map((f) => f.productId) };
  });

  app.put<{ Params: { productId: string } }>("/me/favorites/:productId", async (req, reply) => {
    const productId = z.string().uuid().parse(req.params.productId);
    await prisma.favorite.createMany({ data: [{ profileId: req.user!.id, productId }], skipDuplicates: true });
    return reply.code(204).send();
  });

  app.delete<{ Params: { productId: string } }>("/me/favorites/:productId", async (req, reply) => {
    const productId = z.string().uuid().parse(req.params.productId);
    await prisma.favorite.deleteMany({ where: { profileId: req.user!.id, productId } });
    return reply.code(204).send();
  });
}
