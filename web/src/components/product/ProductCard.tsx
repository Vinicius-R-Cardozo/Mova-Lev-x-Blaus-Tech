"use client";
import Image from "next/image";
import Link from "next/link";
import { useId, useRef, useState } from "react";
import { SENSATION_LABEL, formatBRL, type ProductCardDTO, type SizeOptionDTO } from "@movalev/shared";
import { Media } from "@/components/ui/Media";
import { Price } from "./Price";
import { SwatchDot } from "@/components/ui/Swatch";
import { Badge } from "@/components/ui/Badge";
import { CloseIcon, FavoriteHeart, PlusIcon } from "@/components/ui/icons";
import { useCart, type CartLine } from "@/lib/cart";
import { useFavorites } from "@/lib/favorites";
import { installmentText, useStoreConfig } from "@/lib/storeConfig";
import { cn } from "@/lib/cn";

export function cardToCartLine(p: ProductCardDTO, s: SizeOptionDTO): Omit<CartLine, "quantity"> {
  return {
    variantId: s.variantId,
    productId: p.id,
    slug: p.slug,
    name: p.name,
    colorSlug: p.color.slug,
    colorName: p.color.name,
    placeholderHex: p.color.placeholderHex,
    pictogram: p.pictogram,
    imageUrl: p.image?.url ?? null,
    size: s.size,
    unitPriceCents: s.priceCents,
  };
}

export function productHref(p: Pick<ProductCardDTO, "slug" | "color">) {
  return `/produto/${p.slug}?cor=${p.color.slug}`;
}

type Variant = "home" | "grid" | "simple";
const CARD_SIZES = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";

export function ProductCard({ product, variant = "home", priority = false }: { product: ProductCardDTO; variant?: Variant; priority?: boolean }) {
  const href = productHref(product);
  const fav = useFavorites();
  const installments = installmentText(useStoreConfig(), product.priceCents);
  const isFav = fav.has(product.id);

  return (
    <article className="group relative">
      <div className="card-frame">
        <Link href={href} tabIndex={-1} aria-hidden className="block overflow-hidden">
          <div className="card-zoom relative">
            <Media
              image={product.image}
              tone={product.color.placeholderHex}
              pictogram={product.pictogram}
              className="aspect-[3/4]"
              sizes={CARD_SIZES}
              priority={priority}
            />
            {product.hoverImage?.url && product.image?.url && (
              <Image src={product.hoverImage.url} alt="" fill sizes={CARD_SIZES} className="card-alt object-cover" />
            )}
          </div>
        </Link>
        {product.badge && variant !== "simple" && (
          <span className="pointer-events-none absolute left-3 top-3">
            <Badge badge={product.badge} />
          </span>
        )}
        {variant !== "simple" && (
          <>
            <button
              type="button"
              onClick={() => fav.toggle(product.id)}
              aria-pressed={isFav}
              aria-label={isFav ? `Remover ${product.name} dos favoritos` : `Favoritar ${product.name}`}
              className="icon-btn-round absolute right-1.5 top-1.5 z-10 text-preto"
            >
              <FavoriteHeart on={isFav} width={18} height={18} />
            </button>
            <QuickAdd product={product} />
          </>
        )}
      </div>

      {variant === "home" && (
        <ul className="mt-3.5 flex gap-1.5" aria-label="Cores disponíveis">
          {product.colors.map((c) => (
            <li key={c.slug} title={c.name}>
              <SwatchDot color={c} />
              <span className="sr-only">{c.name}</span>
            </li>
          ))}
        </ul>
      )}
      {variant === "grid" && (
        <p className="mt-3 flex items-center gap-2 text-[13px] font-light text-texto-2">
          <SwatchDot color={product.color} />
          {product.color.name} · {SENSATION_LABEL[product.sensation]}
        </p>
      )}

      <div className={cn("flex items-baseline justify-between gap-3", variant === "simple" ? "mt-3" : "mt-2.5")}>
        <h3 className="font-sans text-[16px] font-normal leading-snug">
          <Link href={href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-focus-within:underline">
            {product.name}
          </Link>
        </h3>
        <p className="shrink-0 text-[16px] font-normal"><Price cents={product.priceCents} compareAt={product.compareAtPriceCents} compareClassName="text-[14px]" /></p>
      </div>
      {variant === "home" && installments && <p className="mt-1 text-[14px] font-light text-texto-2">ou {installments}</p>}
    </article>
  );
}

/** "+ Compra rápida": escolhe o tamanho no próprio card, adiciona e abre a sacola. */
function QuickAdd({ product }: { product: ProductCardDTO }) {
  const [open, setOpen] = useState(false);
  const cart = useCart();
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const soldOut = product.sizes.every((s) => !s.available);

  const choose = (s: SizeOptionDTO) => {
    cart.add([cardToCartLine(product, s)]);
    setOpen(false);
  };

  return (
    <div className="absolute inset-x-3 bottom-3 z-10">
      {open ? (
        <div
          id={panelId}
          role="group"
          aria-label={`Escolha o tamanho de ${product.name}`}
          className="bg-offwhite p-3"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              triggerRef.current?.focus();
            }
          }}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="label-sm text-texto-2">Tamanho</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fechar seleção de tamanho" className="-m-3 flex h-11 w-11 items-center justify-center">
              <CloseIcon width={16} height={16} />
            </button>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {product.sizes.map((s) => (
              <button
                key={s.size}
                type="button"
                disabled={!s.available}
                onClick={() => choose(s)}
                aria-label={s.available ? `Adicionar tamanho ${s.size} à sacola` : `Tamanho ${s.size} esgotado`}
                className="flex h-11 items-center justify-center border border-linha-forte text-[13px] transition-colors hover:border-preto hover:bg-preto hover:text-offwhite disabled:border-linha disabled:text-texto-2/60 disabled:line-through disabled:hover:bg-transparent disabled:hover:text-texto-2/60"
              >
                {s.size}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen(true)}
            disabled={soldOut}
            aria-expanded={false}
            className="card-quick label-sm hidden h-12 w-full items-center justify-center gap-2 bg-offwhite/95 text-preto hover:bg-offwhite disabled:opacity-60 md:flex"
          >
            {soldOut ? "Esgotado" : "+ Compra rápida"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={soldOut}
            aria-label={`Compra rápida: ${product.name}`}
            className="icon-btn-round ml-auto flex bg-offwhite text-preto md:hidden"
          >
            <PlusIcon />
          </button>
        </>
      )}
    </div>
  );
}
