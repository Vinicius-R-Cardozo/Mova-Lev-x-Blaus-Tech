"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import {
  SENSATION_LABEL,
  formatBRL,
  installmentLabel,
  type ProductCardDTO,
  type ProductColorDetailDTO,
  type ProductDetailDTO,
  type SizeOptionDTO,
} from "@movalev/shared";
import { Gallery } from "./Gallery";
import { cardToCartLine, productHref } from "./ProductCard";
import { Media } from "@/components/ui/Media";
import { HeartIcon, MinusIcon, PlusIcon } from "@/components/ui/icons";
import { defaultSize } from "@/components/home/lookToCart";
import { useCart } from "@/lib/cart";
import { useFavorites } from "@/lib/favorites";
import { cn } from "@/lib/cn";

export function ProductView({ product, initialColor }: { product: ProductDetailDTO; initialColor: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const cart = useCart();
  const fav = useFavorites();
  const [colorSlug, setColorSlug] = useState(initialColor);
  const [size, setSize] = useState<SizeOptionDTO | null>(null);
  const [showSizeError, setShowSizeError] = useState(false);
  const sizesRef = useRef<HTMLDivElement>(null);
  const errorId = useId();

  const color: ProductColorDetailDTO = product.colors.find((c) => c.slug === colorSlug) ?? product.colors[0]!;
  const price = size?.priceCents ?? product.priceCents;
  const isFav = fav.has(product.id);
  const soldOut = color.sizes.every((s) => !s.available);
  const nameMain = product.nameEmphasis && product.name.endsWith(product.nameEmphasis) ? product.name.slice(0, -product.nameEmphasis.length).trim() : product.name;

  const chooseColor = (slug: string) => {
    setColorSlug(slug);
    const next = product.colors.find((c) => c.slug === slug);
    // Mantém o tamanho se existir disponível na nova cor.
    setSize((cur) => (cur ? (next?.sizes.find((s) => s.size === cur.size && s.available) ?? null) : null));
    router.replace(`${pathname}?cor=${slug}`, { scroll: false });
  };

  const addToBag = () => {
    if (!size) {
      setShowSizeError(true);
      sizesRef.current?.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus();
      return;
    }
    const card: ProductCardDTO = {
      id: product.id,
      slug: product.slug,
      name: product.name,
      priceCents: product.priceCents,
      badge: product.badge,
      sensation: product.sensation,
      model: product.model,
      pictogram: product.pictogram,
      color,
      colors: product.colors,
      image: color.images[0] ?? null,
      sizes: color.sizes,
    };
    cart.add([cardToCartLine(card, size)]);
  };

  const kicker = [product.collection ? `Coleção ${product.collection.name}` : null, SENSATION_LABEL[product.sensation]].filter(Boolean).join(" · ");

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,58fr)_minmax(0,42fr)] lg:gap-14">
        <Gallery images={color.images} tone={color.placeholderHex} pictogram={product.pictogram} name={`${product.name} ${color.name}`} />

        <div className="pb-8 lg:sticky lg:top-[108px] lg:self-start lg:pb-0">
          <p className="label-sm text-texto-3">{kicker}</p>
          <h1 className="mt-3 text-[40px] leading-[1.02] md:mt-4 md:text-h2">
            {nameMain}
            {product.nameEmphasis && nameMain !== product.name && (
              <>
                <br />
                <em>{product.nameEmphasis}</em>
              </>
            )}
          </h1>
          <p className="mt-4 flex flex-wrap items-baseline gap-x-2">
            <span className="text-[24px] font-normal">{formatBRL(price, { compact: true })}</span>
            <span className="text-body-sm font-light text-texto-2">· {installmentLabel(price)} · 5% off no Pix</span>
          </p>
          <p className="mt-3 text-body-sm font-light text-texto-2">
            {product.rating ? (
              <a href="#avaliacoes" className="link-underline">
                {product.rating.average.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} · {product.rating.count} avaliações
              </a>
            ) : (
              "Ainda sem avaliações"
            )}
          </p>

          {/* Cor */}
          <fieldset className="mt-8">
            <legend className="text-body-sm">
              Cor: <span className="font-normal">{color.name}</span>
            </legend>
            <div className="mt-3 flex gap-4">
              {product.colors.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  aria-pressed={c.slug === color.slug}
                  aria-label={c.name}
                  title={c.name}
                  onClick={() => chooseColor(c.slug)}
                  className={cn(
                    "h-[46px] w-[46px] rounded-full border border-linha-forte transition-shadow",
                    c.slug === color.slug && "shadow-[0_0_0_3px_#F5F2EE,0_0_0_4px_#1A1A1A]",
                  )}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </fieldset>

          {/* Tamanho */}
          <fieldset className="mt-8" aria-describedby={showSizeError && !size ? errorId : undefined}>
            <div className="flex items-baseline justify-between">
              <legend className="text-body-sm">
                Tamanho{size && <>: <span className="font-normal">{size.size}</span></>}
              </legend>
              <Link href="/guia-de-tamanhos" className="link-underline text-body-sm font-normal">
                Guia de tamanhos
              </Link>
            </div>
            <div ref={sizesRef} className="mt-3 grid grid-cols-5 gap-2">
              {color.sizes.map((s) => (
                <button
                  key={s.size}
                  type="button"
                  disabled={!s.available}
                  aria-pressed={size?.size === s.size}
                  aria-label={s.available ? `Tamanho ${s.size}` : `Tamanho ${s.size}, esgotado`}
                  onClick={() => {
                    setSize(s);
                    setShowSizeError(false);
                  }}
                  className={cn(
                    "flex h-[54px] items-center justify-center border text-[15px] font-normal transition-colors",
                    size?.size === s.size ? "border-preto bg-preto text-offwhite" : "border-linha-forte hover:border-preto",
                    "disabled:cursor-not-allowed disabled:border-linha disabled:text-texto-2/50 disabled:line-through disabled:hover:border-linha",
                  )}
                >
                  {s.size}
                </button>
              ))}
            </div>
            {showSizeError && !size && (
              <p id={errorId} role="alert" className="mt-3 text-body-sm text-erro">
                Escolha um tamanho para continuar
              </p>
            )}
          </fieldset>

          <div className="mt-7 flex gap-3">
            <button type="button" onClick={addToBag} disabled={soldOut} className="btn-primary h-[60px] flex-1">
              {soldOut ? "Esgotado nesta cor" : "Adicionar à sacola"}
            </button>
            <button
              type="button"
              onClick={() => fav.toggle(product.id)}
              aria-pressed={isFav}
              aria-label={isFav ? "Remover dos favoritos" : "Favoritar"}
              className="flex h-[60px] w-[60px] items-center justify-center border border-linha-forte transition-colors hover:border-preto"
            >
              <HeartIcon filled={isFav} />
            </button>
          </div>

          <p className="mt-7 bg-bege px-5 py-4 text-[15px] font-light">
            Leve 2 peças e ganhe <strong className="font-medium">10% off</strong> · 3 peças 15% · 4 peças 20%
          </p>

          {product.completeLook.length > 0 && (
            <section aria-labelledby="look-produto" className="mt-9">
              <h2 id="look-produto" className="label-sm font-sans text-texto-3">
                Complete o look
              </h2>
              <ul className="mt-3 space-y-2.5">
                {product.completeLook.map((p) => (
                  <CompleteLookItem key={p.id} product={p} />
                ))}
              </ul>
            </section>
          )}

          <Details product={product} />
        </div>
      </div>

      {/* CTA fixo no mobile */}
      <div className="fixed inset-x-0 bottom-0 z-header border-t border-linha bg-offwhite/95 p-3 backdrop-blur lg:hidden">
        <button type="button" onClick={addToBag} disabled={soldOut} className="btn-primary h-[52px] w-full">
          {soldOut ? "Esgotado nesta cor" : `Adicionar à sacola · ${formatBRL(price, { compact: true })}`}
        </button>
      </div>
    </>
  );
}

function CompleteLookItem({ product }: { product: ProductCardDTO }) {
  const cart = useCart();
  const s = defaultSize(product);
  return (
    <li className="flex items-center gap-4">
      <Link href={productHref(product)} className="flex flex-1 items-center gap-4 hover:underline">
        <Media image={product.image} tone={product.color.placeholderHex} pictogram={product.pictogram} className="h-[76px] w-[60px] shrink-0" pictogramClassName="hidden" />
        <span>
          <span className="block text-[16px] font-normal">{product.name}</span>
          <span className="block text-[15px] font-light text-texto-2">{formatBRL(product.priceCents, { compact: true })}</span>
        </span>
      </Link>
      <button
        type="button"
        disabled={!s}
        onClick={() => s && cart.add([cardToCartLine(product, s)])}
        aria-label={`Adicionar ${product.name} (tamanho ${s?.size ?? "esgotado"}) à sacola`}
        className="icon-btn-round h-[46px] w-[46px] border border-preto disabled:opacity-40"
      >
        <PlusIcon />
      </button>
    </li>
  );
}

function Details({ product }: { product: ProductDetailDTO }) {
  const [open, setOpen] = useState<string | null>("detalhes");
  const sections = [
    { id: "detalhes", title: "Detalhes", body: product.description },
    { id: "tecido", title: "Tecido e cuidados", body: product.fabricCare },
    {
      id: "trocas",
      title: "Trocas e devoluções",
      body: "A primeira troca é grátis em até 30 dias após o recebimento, com a peça sem uso e com etiqueta. Devoluções por arrependimento em até 7 dias. Tudo pela sua conta, em Meus pedidos.",
    },
  ];
  return (
    <div className="mt-9 border-t border-linha-forte">
      {sections.map((s) => {
        const isOpen = open === s.id;
        return (
          <div key={s.id} className="border-b border-linha-forte">
            <h3>
              <button
                type="button"
                id={`aba-${s.id}`}
                aria-expanded={isOpen}
                aria-controls={`painel-${s.id}`}
                onClick={() => setOpen(isOpen ? null : s.id)}
                className="flex min-h-[60px] w-full items-center justify-between text-left font-sans text-[17px] font-normal"
              >
                {s.title}
                {isOpen ? <MinusIcon /> : <PlusIcon />}
              </button>
            </h3>
            <div id={`painel-${s.id}`} role="region" aria-labelledby={`aba-${s.id}`} hidden={!isOpen} className="pb-6 text-[15px] font-light leading-relaxed text-texto-3">
              {s.body}
            </div>
          </div>
        );
      })}
    </div>
  );
}
