"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatBRL, type HomeDTO } from "@movalev/shared";
import { Media, PhotoPlaceholder } from "@/components/ui/Media";
import { cardToCartLine, productHref } from "@/components/product/ProductCard";
import { useCart } from "@/lib/cart";
import { cn } from "@/lib/cn";
import { defaultSize } from "./lookToCart";

/**
 * Recorte da foto do look nas telas em que o quadro não é retrato (tablet).
 * No desktop o quadro tem a proporção da foto (3:4) e ela aparece inteira.
 */
const FOCUS = { x: 0.5, y: 0.45 };

/**
 * Com foto, os pontos (x, y em % da FOTO) viram posição no quadro levando em conta
 * o recorte do object-cover — assim continuam em cima da peça em qualquer tela.
 * Sem foto (desenho), ficam em % do quadro, como antes.
 */
function useCoverPoints(hasPhoto: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [ratio, setRatio] = useState(3 / 4); // largura/altura da foto (até carregar)
  useEffect(() => {
    const el = ref.current;
    if (!el || !hasPhoto) return;
    const ro = new ResizeObserver(([e]) => e && setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasPhoto]);
  const place = (x: number, y: number) => {
    if (!hasPhoto || !box) return { left: `${x}%`, top: `${y}%` };
    const scale = Math.max(box.w / ratio, box.h); // altura renderizada da foto
    const dw = scale * ratio;
    const dh = scale;
    const left = (box.w - dw) * FOCUS.x + (x / 100) * dw;
    const top = (box.h - dh) * FOCUS.y + (y / 100) * dh;
    return { left: `${(left / box.w) * 100}%`, top: `${(top / box.h) * 100}%` };
  };
  return { ref, place, onImageLoad: (img: HTMLImageElement) => img.naturalHeight && setRatio(img.naturalWidth / img.naturalHeight) };
}

export function ShopTheLook({ look }: { look: HomeDTO["shopTheLook"] }) {
  const cart = useCart();
  const [active, setActive] = useState<string | null>(null);
  const cover = useCoverPoints(Boolean(look.imageUrl));

  const addAll = () => {
    const lines = look.items.flatMap(({ product }) => {
      const s = defaultSize(product);
      return s ? [cardToCartLine(product, s)] : [];
    });
    if (lines.length) cart.add(lines);
  };

  return (
    <section aria-labelledby="look-titulo" className="grid lg:grid-cols-[auto_minmax(0,1fr)]">
      <div ref={cover.ref} className="relative lg:aspect-[3/4] lg:h-[clamp(560px,58vw,860px)]">
      <PhotoPlaceholder
        caption={look.imageUrl ? undefined : look.caption}
        captionClassName="bottom-7 left-4 text-texto-3 md:left-gutter"
        className="h-[520px] md:h-[780px] lg:h-full"
        style={{ background: "linear-gradient(160deg,#E3D3C3 0%,#D8C8B8 55%,#CFC1B2 100%)" }}
      >
        {look.imageUrl && (
          <Image
            src={look.imageUrl}
            alt={look.caption}
            fill
            sizes="(min-width: 1024px) 645px, 100vw"
            className="object-cover"
            style={{ objectPosition: `${FOCUS.x * 100}% ${FOCUS.y * 100}%` }}
            onLoad={(e: React.SyntheticEvent<HTMLImageElement>) => cover.onImageLoad(e.currentTarget)}
          />
        )}
        {!look.imageUrl && (
          <div aria-hidden className="absolute left-1/2 top-[8%] h-[84%] w-[34%] -translate-x-1/2 rounded-[50%] bg-[#D6C3AF]/80">
            <div className="absolute -top-[6%] left-1/2 aspect-square w-[40%] -translate-x-1/2 rounded-full bg-[#C9B5A2]" />
          </div>
        )}
        {look.items.map(({ product, hotspot }) => {
          const isActive = active === product.id;
          return (
            <div key={product.id} className="absolute" style={cover.place(hotspot.x, hotspot.y)}>
              <button
                type="button"
                aria-label={`${product.name}, ${formatBRL(product.priceCents, { compact: true })}`}
                aria-expanded={isActive}
                onClick={() => setActive(isActive ? null : product.id)}
                className="relative -translate-x-1/2 -translate-y-1/2 rounded-full bg-offwhite/40 p-2.5 transition-transform hover:scale-102"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-offwhite text-[18px] font-light text-preto">+</span>
              </button>
              {isActive && (
                <Link
                  href={productHref(product)}
                  className="absolute left-6 top-4 z-10 block w-56 bg-offwhite p-4 text-preto shadow-resumo hover:underline"
                >
                  <span className="block text-[15px] font-normal">{product.name}</span>
                  <span className="block text-[14px] text-texto-2">{formatBRL(product.priceCents, { compact: true })} · ver peça</span>
                </Link>
              )}
            </div>
          );
        })}
      </PhotoPlaceholder>
      </div>

      <div className="flex flex-col justify-center bg-bege px-4 py-14 md:px-16 lg:py-0 xl:px-24">
        <div data-reveal className="lg:max-w-[640px]">
        <p className="label text-texto-3">{look.kicker}</p>
        <h2 id="look-titulo" className="mt-5 text-h2-sm md:text-h2">
          {look.title} <em>{look.titleEmphasis}</em>
        </h2>
        <ul className="mt-6 border-t border-linha-forte">
          {look.items.map(({ product }) => (
            <li key={product.id} className={cn("border-b border-linha-forte transition-colors", active === product.id && "bg-offwhite/50")}>
              <Link href={productHref(product)} className="flex items-center gap-4 py-4 hover:underline">
                <Media image={product.image} tone={product.color.placeholderHex} pictogram={product.pictogram} className="h-20 w-16 shrink-0" pictogramClassName="hidden" />
                <span className="flex-1 text-[16px] font-normal">{product.name}</span>
                <span className="text-[16px] font-normal">{formatBRL(product.priceCents, { compact: true })}</span>
              </Link>
            </li>
          ))}
        </ul>
        </div>
        <p className="mt-9 text-[15px] font-light text-texto-3">{look.note}</p>
        <button type="button" onClick={addAll} className="btn-primary mt-8 self-start">
          {look.cta}
        </button>
      </div>
    </section>
  );
}
