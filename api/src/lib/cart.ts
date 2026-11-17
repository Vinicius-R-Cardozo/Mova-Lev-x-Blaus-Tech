import type { CartLineDTO, PricingCoupon, PricingTier, ProductCardDTO, ShippingSettings } from "@movalev/shared";
import { DEFAULT_TIERS, shippingSettingsSchema } from "@movalev/shared";
import { prisma } from "./prisma";
import { publicImageUrl } from "./supabase";
import { cardInclude, toCard } from "./catalog";
import { cached } from "./cache";

export const MAX_PER_LINE = 10;

export function loadTiers(): Promise<PricingTier[]> {
  return cached("regras:tiers", 60_000, async () => {
    const rows = await prisma.progressiveTier.findMany({ orderBy: { minItems: "asc" } });
    return rows.length ? rows.map((r) => ({ minItems: r.minItems, percent: r.percent })) : DEFAULT_TIERS;
  });
}

export function loadShippingSettings(): Promise<ShippingSettings> {
  return cached("regras:frete", 60_000, () => readShippingSettings());
}

async function readShippingSettings(): Promise<ShippingSettings> {
  const row = await prisma.setting.findUnique({ where: { key: "shipping" } });
  return shippingSettingsSchema.parse(row?.value ?? { freeShippingThresholdCents: 29900, pickup: { enabled: false, label: "Retirar na loja", address: "", days: 1 } });
}

/** Junta linhas repetidas e mantém a ordem de chegada. */
export function normalizeItems(items: { variantId: string; quantity: number }[]) {
  const map = new Map<string, number>();
  for (const i of items) map.set(i.variantId, Math.min((map.get(i.variantId) ?? 0) + i.quantity, MAX_PER_LINE));
  return [...map.entries()].map(([variantId, quantity]) => ({ variantId, quantity }));
}

/**
 * Monta as linhas com preço e estoque ATUAIS do banco.
 * Quantidade acima do estoque é reduzida; variante inexistente/inativa sai.
 */
export async function buildLines(items: { variantId: string; quantity: number }[]): Promise<{ lines: CartLineDTO[]; removed: string[] }> {
  const normalized = normalizeItems(items);
  const variants = await prisma.variant.findMany({
    where: { id: { in: normalized.map((i) => i.variantId) } },
    include: {
      color: true,
      product: { select: { id: true, slug: true, name: true, priceCents: true, pictogram: true, status: true, images: { where: { kind: "FRENTE" }, orderBy: { sortOrder: "asc" } } } },
    },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));
  const lines: CartLineDTO[] = [];
  const removed: string[] = [];
  for (const item of normalized) {
    const v = byId.get(item.variantId);
    if (!v || v.product.status !== "ACTIVE") {
      removed.push(item.variantId);
      continue;
    }
    const image = v.product.images.find((i) => i.colorId === v.colorId && i.storagePath);
    const maxQuantity = Math.max(0, Math.min(v.stock, MAX_PER_LINE));
    lines.push({
      variantId: v.id,
      productId: v.product.id,
      slug: v.product.slug,
      name: v.product.name,
      colorSlug: v.color.slug,
      colorName: v.color.name,
      placeholderHex: v.color.placeholderHex,
      pictogram: v.product.pictogram,
      imageUrl: image?.storagePath ? publicImageUrl(image.storagePath) : null,
      size: v.size,
      unitPriceCents: v.priceCents ?? v.product.priceCents,
      // Esgotado: mantém a quantidade pedida para a cliente ver o item marcado como indisponível.
      quantity: maxQuantity > 0 ? Math.min(item.quantity, maxQuantity) : item.quantity,
      maxQuantity,
    });
  }
  return { lines, removed };
}

/** Só linhas que podem ser compradas agora entram no cálculo. */
export function purchasable(lines: CartLineDTO[]) {
  return lines.filter((l) => l.maxQuantity > 0).map((l) => ({ unitPriceCents: l.unitPriceCents, quantity: Math.min(l.quantity, l.maxQuantity) }));
}

export type CouponCheck = { ok: true; coupon: PricingCoupon; firstPurchaseOnly: boolean } | { ok: false; message: string };

/**
 * Valida o cupom no banco. "1ª compra" só é conferida quando o e-mail é conhecido
 * (no checkout); no orçamento da sacola ele aparece como aplicado, sujeito a isso.
 */
export async function checkCoupon(code: string, opts: { email?: string; profileId?: string } = {}): Promise<CouponCheck> {
  const c = await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  const now = new Date();
  if (!c || !c.active) return { ok: false, message: "Cupom inválido." };
  if (c.startsAt && c.startsAt > now) return { ok: false, message: "Este cupom ainda não está valendo." };
  if (c.endsAt && c.endsAt < now) return { ok: false, message: "Este cupom expirou." };
  if (c.maxRedemptions !== null && c.redemptionsCount >= c.maxRedemptions) return { ok: false, message: "Este cupom já atingiu o limite de usos." };
  if (c.firstPurchaseOnly && (opts.email || opts.profileId)) {
    const previous = await prisma.order.count({
      where: {
        status: { not: "CANCELADO" },
        OR: [...(opts.email ? [{ email: opts.email.toLowerCase() }] : []), ...(opts.profileId ? [{ profileId: opts.profileId }] : [])],
      },
    });
    if (previous > 0) return { ok: false, message: "Cupom válido só na primeira compra." };
  }
  return {
    ok: true,
    firstPurchaseOnly: c.firstPurchaseOnly,
    coupon: {
      code: c.code,
      type: c.type,
      value: c.value,
      minSubtotalCents: c.minSubtotalCents,
      stacksWithProgressive: c.stacksWithProgressive,
    },
  };
}

/** "Complete com…": 1ª peça do Complete o look dos itens da sacola que ainda não está nela. */
export async function suggestionFor(lines: CartLineDTO[]): Promise<ProductCardDTO | null> {
  const inCart = new Set(lines.map((l) => l.productId));
  const order = [...new Set(lines.map((l) => l.productId))];
  if (order.length) {
    const relations = await prisma.productRelation.findMany({
      where: { productId: { in: order }, kind: "COMPLETE_LOOK", related: { status: "ACTIVE" } },
      orderBy: { sortOrder: "asc" },
      include: { related: { include: cardInclude } },
    });
    relations.sort((a, b) => order.indexOf(a.productId) - order.indexOf(b.productId) || a.sortOrder - b.sortOrder);
    for (const r of relations) {
      if (inCart.has(r.relatedId)) continue;
      const card = toCard(r.related);
      if (card.sizes.some((s) => s.available)) return card;
    }
  }
  const fallback = await prisma.product.findMany({
    where: { status: "ACTIVE", id: { notIn: [...inCart] } },
    orderBy: { salesCount: "desc" },
    take: 3,
    include: cardInclude,
  });
  for (const p of fallback) {
    const card = toCard(p);
    if (card.sizes.some((s) => s.available)) return card;
  }
  return null;
}
