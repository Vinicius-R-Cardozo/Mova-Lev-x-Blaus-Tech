import type { FastifyInstance } from "fastify";
import { cartQuoteInputSchema, cartReplaceSchema, computePricing, type CartQuoteDTO } from "@movalev/shared";
import { prisma } from "../lib/prisma";
import { optionalAuth, requireAuth } from "../plugins/auth";
import { buildLines, checkCoupon, loadShippingSettings, loadTiers, normalizeItems, purchasable, suggestionFor } from "../lib/cart";

async function accountItems(profileId: string) {
  const cart = await prisma.cart.findUnique({ where: { profileId }, include: { items: { orderBy: { position: "asc" } } } });
  return cart?.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })) ?? [];
}

/** Grava a sacola da conta (substitui tudo, numa transação). */
async function saveAccountItems(profileId: string, items: { variantId: string; quantity: number }[]) {
  const valid = await prisma.variant.findMany({ where: { id: { in: items.map((i) => i.variantId) } }, select: { id: true } });
  const ok = new Set(valid.map((v) => v.id));
  const clean = normalizeItems(items).filter((i) => ok.has(i.variantId));
  await prisma.$transaction(async (tx) => {
    const cart = await tx.cart.upsert({ where: { profileId }, create: { profileId }, update: {} });
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    if (clean.length) await tx.cartItem.createMany({ data: clean.map((i, position) => ({ cartId: cart.id, ...i, position })) });
  });
  return clean;
}

export async function cartRoutes(app: FastifyInstance) {
  /**
   * Orçamento da sacola: preços, estoque, desconto progressivo, cupom e frete grátis
   * recalculados aqui — o navegador só exibe.
   */
  app.post("/cart/quote", { config: { rateLimit: { max: 120, timeWindow: "1 minute" } } }, async (req): Promise<CartQuoteDTO> => {
    await optionalAuth(req);
    const input = cartQuoteInputSchema.parse(req.body);
    const [{ lines, removed }, tiers, shipping] = await Promise.all([buildLines(input.items), loadTiers(), loadShippingSettings()]);

    let couponResult: Awaited<ReturnType<typeof checkCoupon>> | null = null;
    if (input.couponCode) couponResult = await checkCoupon(input.couponCode, { email: req.user?.email, profileId: req.user?.id });

    const pricing = computePricing({
      items: purchasable(lines),
      tiers,
      coupon: couponResult?.ok ? couponResult.coupon : null,
      freeShippingThresholdCents: shipping.freeShippingThresholdCents,
    });
    if (couponResult && !couponResult.ok) {
      pricing.coupon = { code: input.couponCode!, discountCents: 0, applied: false, reason: couponResult.message };
    }

    return { lines, removed, pricing, tiers, suggestion: await suggestionFor(lines) };
  });

  // ── Sacola da conta (sincronizada quando a cliente faz login) ──

  app.get("/cart", { preHandler: requireAuth }, async (req) => {
    const { lines } = await buildLines(await accountItems(req.user!.id));
    return { items: lines };
  });

  /** Substitui a sacola da conta pelo estado atual do navegador (idempotente por natureza). */
  app.put("/cart", { preHandler: requireAuth, config: { rateLimit: { max: 60, timeWindow: "1 minute" } } }, async (req) => {
    const { items } = cartReplaceSchema.parse(req.body);
    const saved = await saveAccountItems(req.user!.id, items);
    const { lines } = await buildLines(saved);
    return { items: lines };
  });

  /**
   * Junta a sacola de visitante com a da conta no login.
   * Usa o MAIOR valor de cada item (não soma): repetir a chamada dá o mesmo resultado.
   */
  app.post("/cart/merge", { preHandler: requireAuth, config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (req) => {
    const { items } = cartReplaceSchema.parse(req.body);
    const server = await accountItems(req.user!.id);
    const merged = new Map(server.map((i) => [i.variantId, i.quantity]));
    for (const i of items) merged.set(i.variantId, Math.max(merged.get(i.variantId) ?? 0, i.quantity));
    const saved = await saveAccountItems(
      req.user!.id,
      [...merged.entries()].map(([variantId, quantity]) => ({ variantId, quantity })),
    );
    const { lines } = await buildLines(saved);
    return { items: lines };
  });
}
