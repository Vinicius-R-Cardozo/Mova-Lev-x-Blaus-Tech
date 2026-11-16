import { sortTiers, type PricingResult, type PricingTier } from "@movalev/shared";
import { cn } from "@/lib/cn";

/**
 * Barra de DESCONTO PROGRESSIVO: mensagem, barra preenchida por peças e
 * marcadores (1 peça · 2·10% · 3·15% · 4·20%). Opcionalmente a linha do frete grátis.
 */
export function ProgressiveDiscountBar({
  pricing,
  tiers,
  markers = true,
  shipping = true,
  className,
}: {
  pricing: PricingResult;
  tiers: PricingTier[];
  markers?: boolean;
  shipping?: boolean;
  className?: string;
}) {
  const sorted = sortTiers(tiers);
  const max = sorted[sorted.length - 1]?.minItems ?? 4;
  const fill = Math.min(pricing.pieces / max, 1) * 100;
  const labels = ["1 peça", ...sorted.map((t) => `${t.minItems} · ${t.percent}%`)];

  return (
    <div className={cn("bg-bege", className)}>
      <p className="text-[15px] font-normal" aria-live="polite">
        {pricing.progressive.message}
      </p>
      <div
        role="progressbar"
        aria-label="Desconto progressivo"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.min(pricing.pieces, max)}
        aria-valuetext={pricing.progressive.message}
        className="mt-3 h-[5px] w-full bg-[#DAD3C9]"
      >
        <div className="h-full bg-oliva transition-[width] duration-300 ease-out" style={{ width: `${fill}%` }} />
      </div>
      {markers && (
        <ol aria-hidden className="mt-2.5 flex justify-between">
          {labels.map((l) => (
            <li key={l} className="label-sm text-[9.5px] text-texto-2">
              {l}
            </li>
          ))}
        </ol>
      )}
      {shipping && (
        <p className="mt-4 text-[15px] font-light" aria-live="polite">
          {pricing.freeShipping.message}
        </p>
      )}
    </div>
  );
}
