"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Pictogram, Size } from "@movalev/shared";
import { readJSON, writeJSON } from "./storage";

/**
 * Sacola do navegador. Guarda só o que a vitrine precisa exibir;
 * preço e descontos são SEMPRE recalculados pela API no checkout.
 * (Fase 3: gaveta completa e sincronização com a conta.)
 */
export interface CartLine {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  colorSlug: string;
  colorName: string;
  placeholderHex: string;
  pictogram: Pictogram;
  imageUrl: string | null;
  size: Size;
  unitPriceCents: number;
  quantity: number;
}

interface CartState {
  lines: CartLine[];
  count: number;
  ready: boolean;
  isOpen: boolean;
  lastAdded: CartLine[] | null;
  add: (lines: Omit<CartLine, "quantity">[], opts?: { open?: boolean }) => void;
  remove: (variantId: string) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  open: () => void;
  close: () => void;
}

const KEY = "movalev:sacola:v1";
const Ctx = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [isOpen, setOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<CartLine[] | null>(null);

  useEffect(() => {
    setLines(readJSON<CartLine[]>(KEY, []));
    setReady(true);
    const onStorage = (e: StorageEvent) => e.key === KEY && setLines(readJSON<CartLine[]>(KEY, []));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (ready) writeJSON(KEY, lines);
  }, [lines, ready]);

  const add = useCallback<CartState["add"]>((items, opts) => {
    setLines((prev) => {
      const next = [...prev];
      for (const item of items) {
        const i = next.findIndex((l) => l.variantId === item.variantId);
        if (i >= 0) next[i] = { ...next[i]!, quantity: Math.min(next[i]!.quantity + 1, 20) };
        else next.push({ ...item, quantity: 1 });
      }
      return next;
    });
    setLastAdded(items.map((i) => ({ ...i, quantity: 1 })));
    if (opts?.open !== false) setOpen(true);
  }, []);

  const remove = useCallback((variantId: string) => setLines((prev) => prev.filter((l) => l.variantId !== variantId)), []);
  const setQuantity = useCallback(
    (variantId: string, quantity: number) =>
      setLines((prev) =>
        quantity <= 0 ? prev.filter((l) => l.variantId !== variantId) : prev.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.min(quantity, 20) } : l)),
      ),
    [],
  );

  const value = useMemo<CartState>(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      ready,
      isOpen,
      lastAdded,
      add,
      remove,
      setQuantity,
      open: () => setOpen(true),
      close: () => setOpen(false),
    }),
    [lines, ready, isOpen, lastAdded, add, remove, setQuantity],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart fora do CartProvider");
  return ctx;
}
