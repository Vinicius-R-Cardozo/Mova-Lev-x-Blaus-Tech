import { Prisma, type Order, type OrderItem } from "@prisma/client";
import { computePricing, type OrderDTO, type OrderInput } from "@movalev/shared";
import { env } from "../env";
import { prisma } from "./prisma";
import { buildLines, checkCoupon, loadShippingSettings, loadTiers } from "./cart";
import { lookupCep } from "./viacep";
import { shippingProvider } from "../providers/shipping";
import { paymentProvider } from "../providers/payment";
import { emailProvider } from "../providers/email";
import { orderConfirmationEmail } from "../emails/orderConfirmation";

export class CheckoutError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

const RESERVATION_MINUTES = { PIX: env.ORDER_RESERVATION_MINUTES, CARTAO: env.ORDER_RESERVATION_MINUTES, BOLETO: env.BOLETO_RESERVATION_HOURS * 60 } as const;

/**
 * Cria o pedido "Aguardando pagamento" reservando o estoque — tudo numa transação.
 * - Preços, descontos, cupom e frete recalculados aqui (nada vem do navegador).
 * - Estoque: UPDATE ... WHERE stock >= qtd; se alguma peça acabou no meio, nada é gravado.
 * - Cupom com limite de usos: incremento condicional no banco (sem corrida entre instâncias).
 * - idempotencyKey é UNIQUE: a mesma compra enviada duas vezes nunca vira dois pedidos.
 */
export async function createOrder(input: OrderInput, ctx: { idempotencyKey: string; profileId?: string }): Promise<Order> {
  const existing = await prisma.order.findUnique({ where: { idempotencyKey: ctx.idempotencyKey } });
  if (existing) return existing;

  const { lines, removed } = await buildLines(input.items);
  if (removed.length || lines.length === 0) throw new CheckoutError(409, "itens_indisponiveis", "Alguns itens da sacola não estão mais disponíveis. Revise a sacola.");
  const short = lines.find((l) => l.maxQuantity < l.quantity || input.items.find((i) => i.variantId === l.variantId)!.quantity > l.maxQuantity);
  if (short) throw new CheckoutError(409, "sem_estoque", `${short.name} (${short.colorName}, ${short.size}) não tem estoque suficiente.`);

  // Frete
  const pieces = lines.reduce((n, l) => n + l.quantity, 0);
  let uf = input.shipping.address?.uf ?? "";
  if (input.shipping.address) {
    const found = await lookupCep(input.shipping.address.cep);
    if (found) uf = found.uf; // a UF vem do CEP, não do formulário
  }
  const options = await shippingProvider.cotar({ cep: input.shipping.address?.cep ?? "", uf, pieces, merchandiseCents: 0 });
  const option = options.find((o) => o.id === input.shipping.method);
  if (!option) throw new CheckoutError(422, "frete_indisponivel", "Forma de envio indisponível para este CEP.");

  // Cupom (agora com o e-mail: confere "1ª compra")
  let coupon = null as Awaited<ReturnType<typeof checkCoupon>> | null;
  if (input.couponCode) {
    coupon = await checkCoupon(input.couponCode, { email: input.customer.email, profileId: ctx.profileId });
    if (!coupon.ok) throw new CheckoutError(422, "cupom_invalido", coupon.message);
  }

  const [tiers, settings] = await Promise.all([loadTiers(), loadShippingSettings()]);
  const pricing = computePricing({
    items: lines.map((l) => ({ unitPriceCents: l.unitPriceCents, quantity: l.quantity })),
    tiers,
    coupon: coupon?.ok ? coupon.coupon : null,
    freeShippingThresholdCents: settings.freeShippingThresholdCents,
    shippingCents: option.cents,
    shippingEligibleForFree: option.eligibleForFree,
  });
  if (input.couponCode && !pricing.coupon?.applied) throw new CheckoutError(422, "cupom_invalido", pricing.coupon?.reason ?? "Cupom sem efeito nesta compra.");

  const isPix = input.payment.method === "PIX";
  const pixDiscountCents = isPix ? pricing.totalCents - pricing.pixTotalCents : 0;
  const totalCents = pricing.totalCents - pixDiscountCents;
  const installments = input.payment.method === "CARTAO" ? input.payment.installments : 1;
  const expiresAt = new Date(Date.now() + RESERVATION_MINUTES[input.payment.method] * 60_000);

  let order: Order;
  try {
    order = await prisma.$transaction(
      async (tx) => {
        const created = await tx.order.create({
          data: {
            idempotencyKey: ctx.idempotencyKey,
            profileId: ctx.profileId ?? null,
            email: input.customer.email,
            customerName: input.customer.name,
            customerPhone: input.customer.phone,
            customerCpf: input.customer.cpf ?? null,
            subtotalCents: pricing.subtotalCents,
            progressivePercent: pricing.progressive.percent,
            progressiveDiscountCents: pricing.progressive.discountCents,
            couponCode: pricing.coupon?.applied ? pricing.coupon.code : null,
            couponDiscountCents: pricing.coupon?.discountCents ?? 0,
            shippingMethod: option.id,
            shippingLabel: option.label,
            shippingDays: option.days,
            shippingCents: pricing.shippingCents ?? 0,
            pixDiscountCents,
            totalCents,
            installments,
            paymentMethod: input.payment.method,
            paymentProvider: paymentProvider.name,
            shippingAddress: input.shipping.address ? { ...input.shipping.address, uf } : { retirada: option.description },
            expiresAt,
            items: {
              create: lines.map((l) => ({
                variantId: l.variantId,
                productName: l.name,
                colorName: l.colorName,
                size: l.size,
                sku: "",
                unitPriceCents: l.unitPriceCents,
                quantity: l.quantity,
              })),
            },
            events: { create: { status: "AGUARDANDO_PAGAMENTO", message: "Pedido criado · aguardando pagamento. Estoque reservado.", actor: "sistema" } },
          },
        });

        for (const l of lines) {
          const r = await tx.variant.updateMany({ where: { id: l.variantId, stock: { gte: l.quantity } }, data: { stock: { decrement: l.quantity } } });
          if (r.count === 0) throw new CheckoutError(409, "sem_estoque", `${l.name} (${l.colorName}, ${l.size}) acabou de esgotar.`);
        }
        // SKU real na linha do pedido.
        const skus = await tx.variant.findMany({ where: { id: { in: lines.map((l) => l.variantId) } }, select: { id: true, sku: true } });
        for (const s of skus) await tx.orderItem.updateMany({ where: { orderId: created.id, variantId: s.id }, data: { sku: s.sku } });

        if (created.couponCode) {
          const n = await tx.$executeRaw`UPDATE coupons SET "redemptionsCount" = "redemptionsCount" + 1
            WHERE code = ${created.couponCode} AND active AND ("maxRedemptions" IS NULL OR "redemptionsCount" < "maxRedemptions")`;
          if (n === 0) throw new CheckoutError(422, "cupom_esgotado", "Este cupom acabou de atingir o limite de usos.");
          const c = await tx.coupon.findUniqueOrThrow({ where: { code: created.couponCode }, select: { id: true } });
          await tx.couponRedemption.create({ data: { couponId: c.id, orderId: created.id, email: created.email } });
        }
        return created;
      },
      { timeout: 20_000, maxWait: 10_000 },
    );
  } catch (err) {
    // Outra instância já criou com a mesma chave: devolve o mesmo pedido.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const again = await prisma.order.findUnique({ where: { idempotencyKey: ctx.idempotencyKey } });
      if (again) return again;
    }
    throw err;
  }

  // Cobrança (simulada) — fora da transação; se falhar o pedido continua aguardando.
  try {
    const charge = await paymentProvider.criarCobranca({
      orderId: order.id,
      orderNumber: order.number,
      method: input.payment.method,
      amountCents: totalCents,
      installments,
      customer: { name: order.customerName, email: order.email, cpf: order.customerCpf, phone: order.customerPhone },
      expiresAt,
    });
    order = await prisma.order.update({ where: { id: order.id }, data: { paymentRef: charge.ref, paymentPayload: charge.payload as Prisma.InputJsonValue } });
  } catch (err) {
    await prisma.orderEvent.create({ data: { orderId: order.id, message: `Falha ao gerar cobrança: ${(err as Error).message}`, actor: "sistema" } });
  }

  if (input.acceptsNewsletter) {
    await prisma.newsletterSubscriber.upsert({ where: { email: order.email }, create: { email: order.email, source: "checkout" }, update: { unsubscribedAt: null } }).catch(() => undefined);
  }

  void sendConfirmationEmail(order.id);
  return order;
}

/** Envia (ou reenvia) o e-mail de confirmação. Marca a data; nunca derruba o pedido. */
export async function sendConfirmationEmail(orderId: string, opts: { force?: boolean } = {}): Promise<boolean> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order || (order.confirmationEmailSentAt && !opts.force)) return false;
  const email = orderConfirmationEmail({
    number: order.number,
    customerName: order.customerName,
    items: order.items,
    subtotalCents: order.subtotalCents,
    progressivePercent: order.progressivePercent,
    progressiveDiscountCents: order.progressiveDiscountCents,
    couponCode: order.couponCode,
    couponDiscountCents: order.couponDiscountCents,
    shippingLabel: order.shippingLabel,
    shippingCents: order.shippingCents,
    totalCents: order.totalCents + order.pixDiscountCents,
    paymentMethod: order.paymentMethod,
    payableCents: order.totalCents,
    orderUrl: `${env.SITE_URL}/checkout/confirmacao/${order.id}?t=${order.accessToken}`,
  });
  try {
    await emailProvider.send({ to: order.email, ...email, idempotencyKey: opts.force ? undefined : `pedido-${order.id}` });
    await prisma.order.update({ where: { id: order.id }, data: { confirmationEmailSentAt: new Date() } });
    await prisma.orderEvent.create({ data: { orderId: order.id, message: `E-mail de confirmação enviado (${emailProvider.name}).`, actor: "sistema" } });
    return true;
  } catch (err) {
    await prisma.orderEvent.create({ data: { orderId: order.id, message: `Falha no e-mail de confirmação: ${(err as Error).message}`, actor: "sistema" } });
    return false;
  }
}

/**
 * Cancela o pedido e devolve estoque e cupom — uma única vez, mesmo com várias
 * instâncias ou execuções do job ao mesmo tempo (update condicional).
 * `from` limita de quais status pode cancelar (o job só cancela "Aguardando pagamento").
 */
export async function cancelOrder(
  orderId: string,
  reason: string,
  actor = "sistema",
  from: ("AGUARDANDO_PAGAMENTO" | "PAGO" | "EM_SEPARACAO")[] = ["AGUARDANDO_PAGAMENTO", "PAGO", "EM_SEPARACAO"],
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id: orderId, status: { in: from }, stockReleasedAt: null },
      data: { status: "CANCELADO", stockReleasedAt: new Date() },
    });
    if (claimed.count === 0) return false;
    const items = await tx.orderItem.findMany({ where: { orderId } });
    for (const i of items) await tx.variant.update({ where: { id: i.variantId }, data: { stock: { increment: i.quantity } } });
    const redemption = await tx.couponRedemption.findUnique({ where: { orderId } });
    if (redemption) {
      await tx.couponRedemption.delete({ where: { orderId } });
      await tx.coupon.update({ where: { id: redemption.couponId }, data: { redemptionsCount: { decrement: 1 } } });
    }
    await tx.orderEvent.create({ data: { orderId, status: "CANCELADO", message: reason, actor } });
    return true;
  });
}

/** Libera só pedidos ainda aguardando pagamento (job de expiração e webhook). */
export const releaseOrder = (orderId: string, reason: string, actor = "sistema") => cancelOrder(orderId, reason, actor, ["AGUARDANDO_PAGAMENTO"]);

export async function releaseExpiredOrders(): Promise<number> {
  const expired = await prisma.order.findMany({
    where: { status: "AGUARDANDO_PAGAMENTO", stockReleasedAt: null, expiresAt: { lt: new Date() } },
    select: { id: true },
    take: 200,
  });
  let n = 0;
  for (const o of expired) if (await releaseOrder(o.id, "Cancelado automaticamente: pagamento não confirmado no prazo. Estoque devolvido.")) n++;
  return n;
}

export function toOrderDTO(o: Order & { items: OrderItem[] }): OrderDTO {
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
    expiresAt: o.expiresAt.toISOString(),
    email: o.email,
    customerName: o.customerName,
    items: o.items.map((i) => ({ productName: i.productName, colorName: i.colorName, size: i.size, quantity: i.quantity, unitPriceCents: i.unitPriceCents, sku: i.sku })),
    subtotalCents: o.subtotalCents,
    progressivePercent: o.progressivePercent,
    progressiveDiscountCents: o.progressiveDiscountCents,
    couponCode: o.couponCode,
    couponDiscountCents: o.couponDiscountCents,
    shippingLabel: o.shippingLabel,
    shippingDays: o.shippingDays,
    shippingCents: o.shippingCents,
    pixDiscountCents: o.pixDiscountCents,
    totalCents: o.totalCents,
    installments: o.installments,
    paymentMethod: o.paymentMethod,
    payment: (o.paymentPayload as Record<string, unknown> | null) ?? null,
    shippingAddress: (o.shippingAddress as Record<string, string> | null) ?? null,
    trackingCode: o.trackingCode,
  };
}
