/**
 * Regras de preço da MOVA LEV — fonte única para a sacola (navegador) e para a API.
 * A loja usa o resultado só para exibir; o pedido é SEMPRE recalculado no servidor
 * com estes mesmos cálculos e com preços/regras lidos do banco.
 *
 * Ordem do cálculo:
 *   1. subtotal = Σ preço × quantidade
 *   2. desconto progressivo pela quantidade de peças (2 = 10%, 3 = 15%, 4+ = 20%)
 *   3. cupom: acumula sobre o valor já com o progressivo, ou — se não acumular —
 *      vale o maior entre cupom e progressivo
 *   4. frete grátis quando o valor JÁ COM DESCONTO atinge o mínimo (só no envio padrão)
 *   5. total, parcelas (6x sem juros) e Pix (5% off)
 * Tudo em centavos inteiros, arredondando cada desconto em centavos.
 */
import { MAX_INSTALLMENTS, formatBRL, installmentCents, percentOf, pixTotalCents } from "./money";

export interface PricingTier {
  minItems: number;
  percent: number;
}

export const DEFAULT_TIERS: PricingTier[] = [
  { minItems: 2, percent: 10 },
  { minItems: 3, percent: 15 },
  { minItems: 4, percent: 20 },
];

export const DEFAULT_FREE_SHIPPING_CENTS = 29900;

export interface PricingCoupon {
  code: string;
  type: "PERCENT" | "FIXED";
  /** PERCENT: 10 = 10%. FIXED: centavos. */
  value: number;
  minSubtotalCents?: number;
  stacksWithProgressive?: boolean;
}

export interface PricingItem {
  unitPriceCents: number;
  quantity: number;
}

export interface PricingInput {
  items: PricingItem[];
  tiers?: PricingTier[];
  coupon?: PricingCoupon | null;
  freeShippingThresholdCents?: number;
  /** Custo do frete escolhido; null = ainda não calculado (sem CEP). */
  shippingCents?: number | null;
  /** O método escolhido participa do frete grátis? (padrão: sim; expressa: não). */
  shippingEligibleForFree?: boolean;
}

export interface PricingResult {
  pieces: number;
  subtotalCents: number;
  progressive: {
    percent: number;
    discountCents: number;
    /** Próxima faixa e quantas peças faltam (null no desconto máximo). */
    next: { percent: number; piecesMissing: number } | null;
    message: string;
  };
  coupon: {
    code: string;
    discountCents: number;
    applied: boolean;
    reason: string | null;
  } | null;
  discountCents: number;
  /** Valor das peças já com todos os descontos — base do frete grátis. */
  merchandiseCents: number;
  freeShipping: {
    thresholdCents: number;
    reached: boolean;
    remainingCents: number;
    message: string;
  };
  /** Frete cobrado (0 = grátis); null = a calcular. */
  shippingCents: number | null;
  totalCents: number;
  installments: { count: number; valueCents: number };
  pixTotalCents: number;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export function sortTiers(tiers: PricingTier[]): PricingTier[] {
  return [...tiers].filter((t) => t.minItems > 0 && t.percent > 0 && t.percent < 100).sort((a, b) => a.minItems - b.minItems);
}

/** Faixa atingida e a próxima, para uma quantidade de peças. */
export function progressiveTier(pieces: number, tiers: PricingTier[] = DEFAULT_TIERS) {
  const sorted = sortTiers(tiers);
  const current = [...sorted].reverse().find((t) => pieces >= t.minItems) ?? null;
  const next = sorted.find((t) => pieces < t.minItems) ?? null;
  return { current, next, sorted };
}

/**
 * Mensagens da barra de desconto progressivo:
 * 0 → "Leve 2 peças e ganhe 10% off" · 1 → "Falta 1 peça para 10% off" ·
 * 2 → "Você ganhou 10% · falta 1 peça para 15%" · 3 → "Você ganhou 15% · falta 1 peça para 20%" ·
 * 4+ → "Desconto máximo: 20% off no kit"
 */
export function progressiveMessage(pieces: number, tiers: PricingTier[] = DEFAULT_TIERS): string {
  const { current, next, sorted } = progressiveTier(pieces, tiers);
  const first = sorted[0];
  if (!first) return "";
  if (!next) return `Desconto máximo: ${current!.percent}% off no kit`;
  const missing = next.minItems - pieces;
  const falta = `${plural(missing, "falta", "faltam")} ${missing} ${plural(missing, "peça", "peças")}`;
  if (pieces === 0) return `Leve ${first.minItems} peças e ganhe ${first.percent}% off`;
  if (!current) return `${falta.charAt(0).toUpperCase()}${falta.slice(1)} para ${next.percent}% off`;
  return `Você ganhou ${current.percent}% · ${falta} para ${next.percent}%`;
}

export function computePricing(input: PricingInput): PricingResult {
  const tiers = input.tiers ?? DEFAULT_TIERS;
  const threshold = input.freeShippingThresholdCents ?? DEFAULT_FREE_SHIPPING_CENTS;

  const items = input.items.filter((i) => i.quantity > 0 && i.unitPriceCents >= 0);
  const pieces = items.reduce((n, i) => n + Math.floor(i.quantity), 0);
  const subtotalCents = items.reduce((s, i) => s + Math.round(i.unitPriceCents) * Math.floor(i.quantity), 0);

  // 2. Progressivo
  const { current, next } = progressiveTier(pieces, tiers);
  let progressivePercent = current?.percent ?? 0;
  let progressiveCents = percentOf(subtotalCents, progressivePercent);

  // 3. Cupom
  let coupon: PricingResult["coupon"] = null;
  if (input.coupon) {
    const c = input.coupon;
    const min = c.minSubtotalCents ?? 0;
    if (subtotalCents < min) {
      coupon = { code: c.code, discountCents: 0, applied: false, reason: `Válido para compras a partir de ${formatBRL(min, { compact: true })}.` };
    } else if (c.stacksWithProgressive ?? true) {
      const base = subtotalCents - progressiveCents;
      const value = c.type === "PERCENT" ? percentOf(base, Math.min(c.value, 100)) : Math.min(c.value, base);
      coupon = { code: c.code, discountCents: value, applied: value > 0, reason: value > 0 ? null : "Cupom sem efeito nesta sacola." };
    } else {
      const value = c.type === "PERCENT" ? percentOf(subtotalCents, Math.min(c.value, 100)) : Math.min(c.value, subtotalCents);
      if (value > progressiveCents) {
        // Não acumula: o cupom vale mais e substitui o progressivo.
        progressivePercent = 0;
        progressiveCents = 0;
        coupon = { code: c.code, discountCents: value, applied: true, reason: null };
      } else {
        coupon = { code: c.code, discountCents: 0, applied: false, reason: "Este cupom não acumula com o desconto progressivo, que já é maior." };
      }
    }
  }

  const discountCents = progressiveCents + (coupon?.discountCents ?? 0);
  const merchandiseCents = Math.max(0, subtotalCents - discountCents);

  // 4. Frete grátis sobre o valor já com desconto
  const reached = pieces > 0 && merchandiseCents >= threshold;
  const remainingCents = reached ? 0 : Math.max(0, threshold - merchandiseCents);
  const freeShipping = {
    thresholdCents: threshold,
    reached,
    remainingCents,
    message: reached ? "Você ganhou frete grátis" : `Faltam ${formatBRL(remainingCents)} para frete grátis`,
  };

  const eligible = input.shippingEligibleForFree ?? true;
  const shippingCents = input.shippingCents == null ? null : reached && eligible ? 0 : Math.max(0, Math.round(input.shippingCents));

  // 5. Total
  const totalCents = merchandiseCents + (shippingCents ?? 0);

  return {
    pieces,
    subtotalCents,
    progressive: {
      percent: progressivePercent,
      discountCents: progressiveCents,
      next: next ? { percent: next.percent, piecesMissing: next.minItems - pieces } : null,
      message: progressiveMessage(pieces, tiers),
    },
    coupon,
    discountCents,
    merchandiseCents,
    freeShipping,
    shippingCents,
    totalCents,
    installments: { count: MAX_INSTALLMENTS, valueCents: installmentCents(totalCents) },
    pixTotalCents: pixTotalCents(totalCents),
  };
}
