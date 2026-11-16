"use client";
import { useState, type FormEvent } from "react";
import { formatBRL, installmentLabel, type CartLineDTO, type PricingResult, type PricingTier } from "@movalev/shared";
import { Media } from "@/components/ui/Media";
import { ProgressiveDiscountBar } from "@/components/cart/ProgressiveDiscountBar";

interface Props {
  lines: CartLineDTO[];
  pricing: PricingResult;
  tiers: PricingTier[];
  couponCode: string;
  onApplyCoupon: (code: string) => void;
  /** Sem CEP ainda: frete "A calcular". */
  shippingKnown: boolean;
  shippingLabel?: string;
  loading?: boolean;
  /** Prefixo dos ids (o resumo aparece no mobile e no desktop). */
  idPrefix?: string;
}

/** Coluna de resumo (branca): itens, desconto progressivo, cupom e totais. */
export function CheckoutSummary({ lines, pricing, tiers, couponCode, onApplyCoupon, shippingKnown, loading, idPrefix = "d" }: Props) {
  const [code, setCode] = useState(couponCode);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onApplyCoupon(code.trim().toUpperCase());
  };
  const coupon = pricing.coupon;

  return (
    <section aria-labelledby={`${idPrefix}-resumo-titulo`} aria-busy={loading} className={`bg-white px-5 py-7 shadow-resumo transition-opacity md:px-[30px] md:py-[34px] ${loading ? "opacity-60" : ""}`}>
      <h2 id={`${idPrefix}-resumo-titulo`} className="text-[30px] leading-none md:text-[34px]">
        Resumo <span aria-hidden>·</span> {pricing.pieces} {pricing.pieces === 1 ? "peça" : "peças"}
      </h2>

      <ul className="mt-6">
        {lines.map((l) => (
          <li key={l.variantId} className="flex items-center gap-4 border-b border-linha py-4">
            <div className="relative shrink-0">
              <Media
                image={l.imageUrl ? { id: l.variantId, kind: "FRENTE", url: l.imageUrl, videoUrl: null, alt: l.name, caption: null } : null}
                tone={l.placeholderHex}
                pictogram={l.pictogram}
                className="h-20 w-[62px]"
                pictogramClassName="hidden"
              />
              <span className="absolute -right-2 -top-2 flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-preto px-1 text-[11px] text-offwhite" aria-label={`Quantidade ${l.quantity}`}>
                {l.quantity}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-normal leading-snug">{l.name}</p>
              <p className="text-[14px] font-light text-texto-2">
                {l.colorName} · Tamanho {l.size}
              </p>
              {l.maxQuantity === 0 && <p className="text-[13px] text-erro">Esgotado — volte à sacola para remover</p>}
            </div>
            <p className="shrink-0 text-[15px] font-normal">{formatBRL(l.unitPriceCents * l.quantity)}</p>
          </li>
        ))}
      </ul>

      <ProgressiveDiscountBar pricing={pricing} tiers={tiers} markers={false} shipping={false} className="mt-4 px-4 py-4" />

      <form onSubmit={submit} className="mt-4 flex gap-2" aria-label="Cupom de desconto">
        <label htmlFor={`${idPrefix}-cupom`} className="sr-only">
          Cupom de desconto
        </label>
        <input
          id={`${idPrefix}-cupom`}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Cupom de desconto"
          autoComplete="off"
          aria-describedby={`${idPrefix}-cupom-msg`}
          className="h-[50px] min-w-0 flex-1 border border-linha-forte bg-bege/60 px-4 text-[15px] font-light uppercase placeholder:normal-case placeholder:text-texto-2/80 focus:border-preto focus:outline-none"
        />
        <button type="submit" className="label h-[50px] border border-preto px-5 transition-colors hover:bg-preto hover:text-offwhite">
          Aplicar
        </button>
      </form>
      <p id={`${idPrefix}-cupom-msg`} role="status" className="mt-2 min-h-[1px] text-[13px]">
        {coupon && (coupon.applied ? <span className="text-oliva">Cupom {coupon.code} aplicado.</span> : <span className="text-erro">{coupon.reason}</span>)}
      </p>

      <dl className="mt-3 space-y-2 text-[16px]">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd>{formatBRL(pricing.subtotalCents)}</dd>
        </div>
        {pricing.progressive.discountCents > 0 && (
          <div className="flex justify-between text-oliva">
            <dt>Desconto progressivo ({pricing.progressive.percent}%)</dt>
            <dd>{formatBRL(-pricing.progressive.discountCents)}</dd>
          </div>
        )}
        {coupon?.applied && (
          <div className="flex justify-between text-oliva">
            <dt>Cupom {coupon.code}</dt>
            <dd>{formatBRL(-coupon.discountCents)}</dd>
          </div>
        )}
        <div className="flex justify-between border-b border-linha pb-3">
          <dt>Frete</dt>
          <dd>{!shippingKnown || pricing.shippingCents === null ? "A calcular" : pricing.shippingCents === 0 ? "Grátis" : formatBRL(pricing.shippingCents)}</dd>
        </div>
        <div className="flex items-baseline justify-between pt-2 text-[24px] font-normal md:text-[26px]">
          <dt>Total</dt>
          <dd>{formatBRL(pricing.totalCents)}</dd>
        </div>
      </dl>
      <p className="mt-2 text-[14px] font-light text-texto-2">
        ou {installmentLabel(pricing.totalCents)} · no Pix {formatBRL(pricing.pixTotalCents)}
      </p>
    </section>
  );
}
