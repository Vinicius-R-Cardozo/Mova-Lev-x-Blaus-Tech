"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { SENSATION_HINT, SENSATION_LABEL, SENSATIONS, SIZES, formatBRL, type ColorDTO } from "@movalev/shared";
import { cn } from "@/lib/cn";
import { listParam } from "./query";

/**
 * Última URL pedida e ainda não aplicada. Compartilhada entre todos os controles
 * para que cliques rápidos em sequência (cor, depois tamanho) se somem em vez de
 * um sobrescrever o outro enquanto a navegação anterior não terminou.
 */
let pendingQuery: string | null = null;

export function useFilterNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const current = params.toString();
  useEffect(() => {
    if (pendingQuery === current) pendingQuery = null;
  }, [current]);
  const update = (mutate: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(pendingQuery ?? current);
    mutate(next);
    next.delete("pagina");
    const qs = next.toString();
    pendingQuery = qs;
    startTransition(() => router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false }));
  };
  return { params, update, pending, clearHref: pathname + (params.get("modelo") ? `?modelo=${params.get("modelo")}` : "") };
}

function toggle(p: URLSearchParams, key: string, value: string) {
  const list = listParam(p, key);
  const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  if (next.length) p.set(key, next.join(","));
  else p.delete(key);
}

export function Filters({ colors, priceMinCents, priceMaxCents, className }: { colors: ColorDTO[]; priceMinCents: number; priceMaxCents: number; className?: string }) {
  const { params, update, clearHref } = useFilterNavigation();
  const sens = listParam(params, "sensacao");
  const cor = listParam(params, "cor");
  const tam = listParam(params, "tamanho");

  return (
    <div className={cn("space-y-9", className)}>
      <fieldset>
        <legend className="label-sm mb-4 text-texto-2">Sensação</legend>
        <div className="space-y-1">
          {SENSATIONS.map((s) => {
            const value = s.toLowerCase();
            const id = `sens-${value}`;
            return (
              <div key={s} className="flex min-h-touch items-center gap-3">
                <input
                  id={id}
                  type="checkbox"
                  checked={sens.includes(value)}
                  onChange={() => update((p) => toggle(p, "sensacao", value))}
                  className="h-5 w-5 appearance-none rounded-none border border-preto bg-transparent checked:bg-preto checked:shadow-[inset_0_0_0_3px_#F6F3EC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oliva"
                />
                <label htmlFor={id} className="cursor-pointer">
                  <span className="font-display text-[21px]">{SENSATION_LABEL[s]}</span> <span className="text-[14px] font-light text-texto-2">{SENSATION_HINT[s]}</span>
                </label>
              </div>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label-sm mb-4 text-texto-2">Cor</legend>
        <ul className="flex flex-wrap gap-4">
          {colors.map((c) => {
            const on = cor.includes(c.slug);
            return (
              <li key={c.slug}>
                <button
                  type="button"
                  aria-pressed={on}
                  aria-label={c.name}
                  title={c.name}
                  onClick={() => update((p) => toggle(p, "cor", c.slug))}
                  className={cn(
                    "h-[46px] w-[46px] rounded-full border border-linha-forte transition-shadow",
                    on && "shadow-[0_0_0_3px_#F6F3EC,0_0_0_4px_#1A1A1A]",
                  )}
                  style={{ backgroundColor: c.hex }}
                />
              </li>
            );
          })}
        </ul>
      </fieldset>

      <fieldset>
        <legend className="label-sm mb-4 text-texto-2">Tamanho</legend>
        <ul className="flex gap-1.5">
          {SIZES.map((s) => {
            const on = tam.includes(s);
            return (
              <li key={s} className="flex-1">
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => update((p) => toggle(p, "tamanho", s))}
                  className={cn(
                    "flex h-11 w-full min-w-[44px] items-center justify-center border text-[13px] font-normal transition-colors",
                    on ? "border-preto bg-preto text-offwhite" : "border-linha-forte hover:border-preto",
                  )}
                >
                  {s}
                </button>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <PriceRange min={priceMinCents} max={priceMaxCents} />

      <a href={clearHref} className="link-underline inline-flex min-h-touch items-center text-body-sm" onClick={(e) => { e.preventDefault(); update((p) => { for (const k of ["sensacao", "cor", "tamanho", "precoMin", "precoMax"]) p.delete(k); }); }}>
        Limpar filtros
      </a>
    </div>
  );
}

/** Faixa de preço com dois controles (valores em reais na URL). */
function PriceRange({ min, max }: { min: number; max: number }) {
  const { params, update } = useFilterNavigation();
  const floor = Math.floor(min / 1000) * 10;
  const ceil = Math.ceil(max / 1000) * 10;
  const fromUrl = (): [number, number] => [Number(params.get("precoMin") ?? floor), Number(params.get("precoMax") ?? ceil)];
  const [range, setRange] = useState<[number, number]>(fromUrl);
  useEffect(() => setRange(fromUrl()), [params.get("precoMin"), params.get("precoMax"), floor, ceil]); // eslint-disable-line react-hooks/exhaustive-deps

  if (ceil <= floor) return null;
  const commit = () =>
    update((p) => {
      const [a, b] = range;
      if (a > floor) p.set("precoMin", String(a));
      else p.delete("precoMin");
      if (b < ceil) p.set("precoMax", String(b));
      else p.delete("precoMax");
    });
  const pct = (v: number) => ((v - floor) / (ceil - floor)) * 100;
  const thumb =
    "pointer-events-none absolute inset-x-0 top-1/2 h-0 w-full -translate-y-1/2 appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-preto [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-preto";

  return (
    <fieldset>
      <legend className="label-sm mb-4 text-texto-2">Preço</legend>
      <div className="relative h-11">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-linha-forte" />
        <div className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-preto" style={{ left: `${pct(range[0])}%`, right: `${100 - pct(range[1])}%` }} />
        <input
          type="range"
          aria-label="Preço mínimo"
          min={floor}
          max={ceil}
          step={10}
          value={range[0]}
          onChange={(e) => setRange([Math.min(Number(e.target.value), range[1] - 10), range[1]])}
          onPointerUp={commit}
          onKeyUp={commit}
          className={thumb}
        />
        <input
          type="range"
          aria-label="Preço máximo"
          min={floor}
          max={ceil}
          step={10}
          value={range[1]}
          onChange={(e) => setRange([range[0], Math.max(Number(e.target.value), range[0] + 10)])}
          onPointerUp={commit}
          onKeyUp={commit}
          className={thumb}
        />
      </div>
      <p className="mt-1 text-body-sm font-normal" aria-live="polite">
        {formatBRL(range[0] * 100, { compact: true })} — {formatBRL(range[1] * 100, { compact: true })}
      </p>
    </fieldset>
  );
}
