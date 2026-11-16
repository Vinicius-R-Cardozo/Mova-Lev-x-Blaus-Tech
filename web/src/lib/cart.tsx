"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DEFAULT_TIERS, computePricing, type CartLineDTO, type CartQuoteDTO, type PricingResult, type PricingTier, type ProductCardDTO } from "@movalev/shared";
import { API_URL } from "./site";
import { readJSON, writeJSON } from "./storage";

/**
 * Sacola: guardada no navegador para visitantes e sincronizada com a conta após o login.
 * Os valores exibidos são recalculados na hora com a regra compartilhada e confirmados
 * pela API (/cart/quote) — que é quem manda no preço, no estoque e nos descontos.
 */
export type CartLine = Omit<CartLineDTO, "maxQuantity"> & { maxQuantity?: number };

interface CartState {
  lines: CartLine[];
  count: number;
  ready: boolean;
  isOpen: boolean;
  pricing: PricingResult;
  tiers: PricingTier[];
  suggestion: ProductCardDTO | null;
  /** Orçamento do servidor ainda não confirmou o estado atual. */
  syncing: boolean;
  add: (lines: Omit<CartLine, "quantity">[], opts?: { open?: boolean }) => void;
  remove: (variantId: string) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  /** Esvazia a sacola (após o pedido ser criado). */
  clear: () => void;
  open: () => void;
  close: () => void;
}

const KEY = "movalev:sacola:v1";
const MAX = 10;
const Ctx = createContext<CartState | null>(null);

const signature = (lines: CartLine[]) => lines.map((l) => `${l.variantId}:${l.quantity}`).join("|");
const toItems = (lines: CartLine[]) => lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity }));

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [isOpen, setOpen] = useState(false);
  const [quote, setQuote] = useState<CartQuoteDTO | null>(null);
  const [quotedSig, setQuotedSig] = useState<string>("");
  const tokenRef = useRef<string | null>(null);
  const linesRef = useRef<CartLine[]>([]);
  linesRef.current = lines;
  const mergedFor = useRef<string | null>(null);

  // ── Carrega do navegador e acompanha outras abas ──
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

  // ── Login: junta a sacola de visitante com a da conta; logout limpa ──
  useEffect(() => {
    if (!ready) return;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    // Carregado depois da hidratação: o SDK do Supabase não pesa no primeiro carregamento.
    void import("./supabase").then(({ supabaseBrowser }) => {
      const supabase = supabaseBrowser();
      if (!supabase || cancelled) return;
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        tokenRef.current = session?.access_token ?? null;
        if (event === "SIGNED_OUT") {
          mergedFor.current = null;
          setLines([]);
          return;
        }
        const userId = session?.user.id;
        if (!userId || mergedFor.current === userId) return;
        mergedFor.current = userId;
        void fetch(`${API_URL}/cart/merge`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session!.access_token}` },
          body: JSON.stringify({ items: toItems(linesRef.current) }),
        })
          .then((r) => (r.ok ? (r.json() as Promise<{ items: CartLineDTO[] }>) : null))
          .then((res) => res && setLines(res.items))
          .catch(() => undefined);
      });
      unsubscribe = () => data.subscription.unsubscribe();
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [ready]);

  // ── Orçamento no servidor (debounce) + sacola da conta ──
  const sig = signature(lines);
  useEffect(() => {
    if (!ready) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/cart/quote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: toItems(lines) }),
          signal: ctrl.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as CartQuoteDTO;
        setQuote(data);
        setQuotedSig(sig);
        // Reconcilia preço/estoque com o servidor (só se algo mudou, para não entrar em laço).
        const reconciled: CartLine[] = data.lines;
        if (signature(reconciled) !== sig || reconciled.some((l, i) => l.unitPriceCents !== lines[i]?.unitPriceCents || l.maxQuantity !== lines[i]?.maxQuantity)) {
          setLines(reconciled);
        }
        if (tokenRef.current && mergedFor.current) {
          void fetch(`${API_URL}/cart`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenRef.current}` },
            body: JSON.stringify({ items: toItems(reconciled) }),
          }).catch(() => undefined);
        }
      } catch {
        /* offline ou abortado: segue com o cálculo local */
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [sig, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = useCallback<CartState["add"]>((items, opts) => {
    setLines((prev) => {
      const next = [...prev];
      for (const item of items) {
        const i = next.findIndex((l) => l.variantId === item.variantId);
        const cap = item.maxQuantity ?? MAX;
        if (i >= 0) next[i] = { ...next[i]!, quantity: Math.min(next[i]!.quantity + 1, cap, MAX) };
        else next.push({ ...item, quantity: 1 });
      }
      return next;
    });
    if (opts?.open !== false) setOpen(true);
  }, []);

  const remove = useCallback((variantId: string) => setLines((prev) => prev.filter((l) => l.variantId !== variantId)), []);
  const setQuantity = useCallback(
    (variantId: string, quantity: number) =>
      setLines((prev) =>
        quantity <= 0
          ? prev.filter((l) => l.variantId !== variantId)
          : prev.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.min(quantity, l.maxQuantity || MAX, MAX) } : l)),
      ),
    [],
  );

  const tiers = quote?.tiers ?? DEFAULT_TIERS;
  const syncing = quotedSig !== sig;
  // Enquanto o servidor não responde, calcula localmente com a mesma regra.
  const pricing = useMemo(() => {
    if (quote && !syncing) return quote.pricing;
    const buyable = lines.filter((l) => l.maxQuantity !== 0);
    return computePricing({
      items: buyable.map((l) => ({ unitPriceCents: l.unitPriceCents, quantity: l.quantity })),
      tiers,
      freeShippingThresholdCents: quote?.pricing.freeShipping.thresholdCents,
    });
  }, [quote, syncing, lines, tiers]);

  const value = useMemo<CartState>(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      ready,
      isOpen,
      pricing,
      tiers,
      suggestion: quote?.suggestion ?? null,
      syncing,
      add,
      remove,
      setQuantity,
      clear: () => setLines([]),
      open: () => setOpen(true),
      close: () => setOpen(false),
    }),
    [lines, ready, isOpen, pricing, tiers, quote, syncing, add, remove, setQuantity],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart fora do CartProvider");
  return ctx;
}
