import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { checkoutQuoteInputSchema, computePricing, orderInputSchema, type CheckoutQuoteDTO, type OrderCreatedDTO, type ShippingOptionDTO } from "@movalev/shared";
import { prisma } from "../lib/prisma";
import { paymentSettings, pricingPayments } from "../lib/settings";
import { optionalAuth } from "../plugins/auth";
import { withIdempotency } from "../lib/idempotency";
import { buildLines, checkCoupon, loadShippingSettings, loadTiers, purchasable, suggestionFor } from "../lib/cart";
import { lookupCep } from "../lib/viacep";
import { createOrder, toOrderDTO } from "../lib/orders";
import { shippingProvider } from "../providers/shipping";

export async function checkoutRoutes(app: FastifyInstance) {
  /** Resumo do checkout: itens, cupom, endereço do CEP e opções de frete com o valor final. */
  app.post("/checkout/quote", { config: { rateLimit: { max: 120, timeWindow: "1 minute" } } }, async (req): Promise<CheckoutQuoteDTO> => {
    await optionalAuth(req);
    const input = checkoutQuoteInputSchema.parse(req.body);
    const [{ lines, removed }, tiers, settings, address] = await Promise.all([
      buildLines(input.items),
      loadTiers(),
      loadShippingSettings(),
      input.cep ? lookupCep(input.cep) : Promise.resolve(null),
    ]);
    const items = purchasable(lines);

    let couponCheck: Awaited<ReturnType<typeof checkCoupon>> | null = null;
    if (input.couponCode) couponCheck = await checkCoupon(input.couponCode, { email: input.email ?? req.user?.email, profileId: req.user?.id });
    const coupon = couponCheck?.ok ? couponCheck.coupon : null;

    const payments = pricingPayments(await paymentSettings());
    const base = computePricing({ items, tiers, coupon, freeShippingThresholdCents: settings.freeShippingThresholdCents, payments });
    const raw = address ? await shippingProvider.cotar({ cep: input.cep!, uf: address.uf, pieces: base.pieces, merchandiseCents: base.merchandiseCents }) : [];
    const shippingOptions: ShippingOptionDTO[] = raw.map((o) => ({
      id: o.id,
      label: o.label,
      days: o.days,
      description: o.description,
      cents: o.cents,
      finalCents: base.freeShipping.reached && o.eligibleForFree ? 0 : o.cents,
    }));
    const selected = shippingOptions.find((o) => o.id === input.shippingMethod) ?? shippingOptions[0] ?? null;
    const rawSelected = raw.find((o) => o.id === selected?.id);

    const pricing = computePricing({
      payments,
      items,
      tiers,
      coupon,
      freeShippingThresholdCents: settings.freeShippingThresholdCents,
      shippingCents: rawSelected ? rawSelected.cents : null,
      shippingEligibleForFree: rawSelected?.eligibleForFree ?? true,
    });
    if (couponCheck && !couponCheck.ok) pricing.coupon = { code: input.couponCode!, discountCents: 0, applied: false, reason: couponCheck.message };

    return { lines, removed, pricing, tiers, suggestion: await suggestionFor(lines), address, shippingOptions, shippingMethod: selected?.id ?? null };
  });

  /** Cria o pedido. Exige Idempotency-Key: a mesma compra enviada duas vezes devolve o mesmo pedido. */
  app.post("/orders", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req, reply) => {
    await optionalAuth(req);
    const key = String(req.headers["idempotency-key"] ?? "");
    return withIdempotency(req, reply, "order", async () => {
      const input = orderInputSchema.parse(req.body);
      const order = await createOrder(input, { idempotencyKey: `order:${key}`, profileId: req.user?.id });
      const body: OrderCreatedDTO = { id: order.id, number: order.number, accessToken: order.accessToken };
      return { status: 201, body };
    });
  });

  /** Pedido para a página de confirmação: com o token do link (visitante) ou logada como dona. */
  app.get<{ Params: { id: string }; Querystring: { t?: string } }>("/orders/:id", async (req, reply) => {
    await optionalAuth(req);
    const id = z.string().uuid().parse(req.params.id);
    const token = z.string().uuid().optional().parse(req.query.t || undefined);
    const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
    const allowed =
      order &&
      ((token && order.accessToken === token) ||
        (req.user && (req.user.id === order.profileId || order.email === req.user.email || req.user.role === "ADMIN")));
    if (!order || !allowed) return reply.code(404).send({ error: "nao_encontrado", message: "Pedido não encontrado." });
    reply.header("Cache-Control", "private, no-store");
    return toOrderDTO(order);
  });
}
