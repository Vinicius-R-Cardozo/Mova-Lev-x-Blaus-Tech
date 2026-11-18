"use client";
import Link from "next/link";
import { useCallback, useRef } from "react";
import { formatBRL } from "@movalev/shared";
import { Media } from "@/components/ui/Media";
import { CloseIcon, MinusIcon, PlusIcon } from "@/components/ui/icons";
import { cardToCartLine } from "@/components/product/ProductCard";
import { defaultSize } from "@/components/home/lookToCart";
import { useCart, type CartLine } from "@/lib/cart";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { cn } from "@/lib/cn";
import { ProgressiveDiscountBar } from "./ProgressiveDiscountBar";

/** Sacola lateral: gaveta de 460px à direita; no mobile, bottom sheet. */
export function CartDrawer() {
  const cart = useCart();
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => cart.close(), [cart]);
  useFocusTrap(ref, cart.isOpen, close);

  const { pricing } = cart;
  const hasSoldOut = cart.lines.some((l) => l.maxQuantity === 0);
  // Enquanto o servidor responde, não sugere algo que acabou de entrar na sacola.
  const suggestion = cart.suggestion && !cart.lines.some((l) => l.productId === cart.suggestion!.id) ? cart.suggestion : null;
  const suggestionSize = suggestion ? defaultSize(suggestion) : null;

  return (
    <div className={cn("fixed inset-0 z-drawer", cart.isOpen ? "visible" : "invisible")} aria-hidden={!cart.isOpen}>
      <div className={cn("absolute inset-0 bg-preto/45 transition-opacity duration-base", cart.isOpen ? "opacity-100" : "opacity-0")} onClick={cart.close} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sacola-titulo"
        tabIndex={-1}
        className={cn(
          "absolute flex flex-col bg-offwhite transition-transform duration-slow ease-out focus:outline-none",
          // mobile: bottom sheet com cantos superiores de 24px
          "inset-x-0 bottom-0 max-h-[92vh] rounded-t-sheet",
          // desktop: gaveta de 460px vinda da direita
          "md:inset-x-auto md:bottom-0 md:right-0 md:top-0 md:max-h-none md:w-[460px] md:rounded-none",
          cart.isOpen ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-x-full md:translate-y-0",
        )}
      >
        <div aria-hidden className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-linha-forte md:hidden" />
        <header className="flex shrink-0 items-center justify-between px-5 pb-4 pt-3 md:px-7 md:pb-6 md:pt-7">
          <h2 id="sacola-titulo" className="text-[28px] leading-none md:text-[34px]">
            Sua sacola <span className="text-[20px] text-texto-2 md:text-[22px]">({cart.count})</span>
          </h2>
          <button type="button" onClick={cart.close} aria-label="Fechar sacola" className="-mr-3 flex h-11 w-11 items-center justify-center">
            <CloseIcon />
          </button>
        </header>

        {cart.lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-start gap-6 px-5 pb-10 md:px-7">
            <ProgressiveDiscountBar pricing={pricing} tiers={cart.tiers} shipping={false} className="-mx-5 w-[calc(100%+2.5rem)] px-5 py-5 md:-mx-7 md:w-[calc(100%+3.5rem)] md:px-7" />
            <p className="text-body font-light text-texto-3">Sua sacola está vazia.</p>
            <Link href="/colecao/novidades" onClick={cart.close} className="btn-primary">
              Ver novidades
            </Link>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <ProgressiveDiscountBar pricing={pricing} tiers={cart.tiers} className="px-5 py-5 md:px-7 md:py-6" />

              <ul className="px-5 md:px-7" aria-label="Itens na sacola">
                {cart.lines.map((l) => (
                  <CartItem key={l.variantId} line={l} />
                ))}
              </ul>

              {suggestion && suggestionSize && (
                <div className="mx-5 mb-6 mt-1 flex items-center gap-4 border border-dashed border-taupe-claro p-4 md:mx-7">
                  <Media image={suggestion.image} tone={suggestion.color.placeholderHex} pictogram={suggestion.pictogram} className="h-[68px] w-[54px] shrink-0" pictogramClassName="hidden" />
                  <p className="flex-1 text-[14px] font-light leading-snug">
                    Complete com <strong className="font-medium">{suggestion.name}</strong> · {formatBRL(suggestion.priceCents, { compact: true })}
                  </p>
                  <button
                    type="button"
                    onClick={() => cart.add([cardToCartLine(suggestion, suggestionSize)], { open: true })}
                    aria-label={`Adicionar ${suggestion.name}, tamanho ${suggestionSize.size}`}
                    className="icon-btn-round h-[46px] w-[46px] shrink-0 bg-oliva text-offwhite"
                  >
                    <PlusIcon />
                  </button>
                </div>
              )}
            </div>

            <footer className="shrink-0 border-t border-linha px-5 pb-4 pt-4 md:px-7 md:pb-8 md:pt-6">
              <dl className="space-y-1 text-[15px] md:space-y-2 md:text-[16px]">
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
                <div className="flex justify-between">
                  <dt>Frete</dt>
                  <dd>{pricing.freeShipping.reached ? "Grátis" : "Calculado no checkout"}</dd>
                </div>
                <div className="flex items-baseline justify-between pt-2 text-[20px] font-normal md:pt-3 md:text-[24px]">
                  <dt>Total</dt>
                  <dd>{formatBRL(pricing.totalCents)}</dd>
                </div>
              </dl>
              {pricing.installments.count > 1 && <p className="mt-1 text-[14px] font-light text-texto-2">ou {pricing.installments.count}x de {formatBRL(pricing.installments.valueCents)} sem juros</p>}
              {hasSoldOut && (
                <p role="alert" className="mt-3 text-body-sm text-erro">
                  Remova os itens esgotados para finalizar.
                </p>
              )}
              <Link
                href="/checkout"
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                  if (hasSoldOut) e.preventDefault();
                  else cart.close();
                }}
                aria-disabled={hasSoldOut}
                className={cn("btn-primary mt-4 h-[52px] w-full md:mt-5 md:h-[58px]", hasSoldOut && "pointer-events-none opacity-50")}
              >
                Finalizar compra
              </Link>
              <button type="button" onClick={cart.close} className="mx-auto mt-1 flex min-h-touch items-center text-[15px] md:mt-3 font-normal underline decoration-1 underline-offset-4 hover:text-oliva">
                Continuar comprando
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

function CartItem({ line }: { line: CartLine }) {
  const cart = useCart();
  const soldOut = line.maxQuantity === 0;
  const max = line.maxQuantity ?? 10;
  return (
    <li className={cn("flex gap-4 border-b border-linha py-5", soldOut && "opacity-70")}>
      <Link href={`/produto/${line.slug}?cor=${line.colorSlug}`} onClick={cart.close} className="shrink-0" tabIndex={-1} aria-hidden>
        <Media
          image={line.imageUrl ? { id: line.variantId, kind: "FRENTE", url: line.imageUrl, videoUrl: null, alt: line.name, caption: null } : null}
          tone={line.placeholderHex}
          pictogram={line.pictogram}
          className="h-[95px] w-[76px]"
          pictogramClassName="hidden"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-sans text-[16px] font-normal leading-snug">
            <Link href={`/produto/${line.slug}?cor=${line.colorSlug}`} onClick={cart.close} className="hover:underline">
              {line.name}
            </Link>
          </h3>
          <p key={line.quantity} className="swap-in shrink-0 text-[16px] font-normal">{formatBRL(line.unitPriceCents * line.quantity, { compact: true })}</p>
        </div>
        <p className="mt-1 text-[14px] font-light text-texto-2">
          {line.colorName} · Tamanho {line.size}
        </p>
        {soldOut ? (
          <p className="mt-2 text-[14px] text-erro">Esgotado neste tamanho</p>
        ) : (
          <div className="mt-2 inline-flex items-center border border-linha-forte" role="group" aria-label={`Quantidade de ${line.name}`}>
            <button
              type="button"
              onClick={() => cart.setQuantity(line.variantId, line.quantity - 1)}
              aria-label={line.quantity === 1 ? `Remover ${line.name}` : "Diminuir quantidade"}
              className="press flex h-11 w-11 items-center justify-center"
            >
              <MinusIcon width={14} height={14} />
            </button>
            <span className="w-6 text-center text-[15px] tabular-nums" aria-live="polite">
              <span key={line.quantity} className="swap-up inline-block">
                {line.quantity}
              </span>
            </span>
            <button
              type="button"
              onClick={() => cart.setQuantity(line.variantId, line.quantity + 1)}
              disabled={line.quantity >= max}
              aria-label="Aumentar quantidade"
              className="press flex h-11 w-11 items-center justify-center disabled:opacity-30"
            >
              <PlusIcon width={14} height={14} />
            </button>
          </div>
        )}
        <div>
          <button type="button" onClick={() => cart.remove(line.variantId)} className="mt-1 min-h-[36px] text-[14px] font-light text-texto-2 underline decoration-1 underline-offset-4 hover:text-preto">
            Remover<span className="sr-only"> {line.name}</span>
          </button>
        </div>
      </div>
    </li>
  );
}
