"use client";
import { useEffect } from "react";
import { formatBRL } from "@movalev/shared";
import { useCart } from "@/lib/cart";
import { CloseIcon } from "@/components/ui/icons";

/**
 * Confirmação provisória ao adicionar à sacola.
 * Na fase 3 é substituída pela gaveta completa (CartDrawer).
 */
export function CartToast() {
  const cart = useCart();
  const items = cart.lastAdded;

  useEffect(() => {
    if (!cart.isOpen) return;
    const t = setTimeout(cart.close, 5000);
    return () => clearTimeout(t);
  }, [cart.isOpen, cart.close, items]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed right-4 top-24 z-toast w-[calc(100%-2rem)] max-w-sm">
      {cart.isOpen && (
        <div className="pointer-events-auto border border-linha bg-offwhite p-5 shadow-resumo">
          <div className="flex items-start justify-between gap-4">
            <p className="label-sm text-oliva">Na sua sacola ({cart.count})</p>
            <button type="button" onClick={cart.close} aria-label="Fechar aviso" className="-m-3 flex h-11 w-11 items-center justify-center">
              <CloseIcon width={16} height={16} />
            </button>
          </div>
          {items?.length ? (
            <ul className="mt-2 space-y-1 text-body-sm">
              {items.map((l) => (
                <li key={l.variantId}>
                  Adicionado: {l.name} · {l.colorName} · Tamanho {l.size} — {formatBRL(l.unitPriceCents)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-body-sm">Sua sacola está vazia.</p>
          )}
        </div>
      )}
    </div>
  );
}
