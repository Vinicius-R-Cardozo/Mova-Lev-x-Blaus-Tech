"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { readJSON, writeJSON } from "./storage";

/** Favoritos no navegador (sincronização com a conta na fase 5). */
interface FavState {
  has: (productId: string) => boolean;
  toggle: (productId: string) => void;
  ids: string[];
}

const KEY = "movalev:favoritos:v1";
const Ctx = createContext<FavState | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setIds(readJSON<string[]>(KEY, []));
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) writeJSON(KEY, ids);
  }, [ids, ready]);
  const toggle = useCallback((id: string) => setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])), []);
  const value = useMemo(() => ({ ids, toggle, has: (id: string) => ids.includes(id) }), [ids, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFavorites(): FavState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFavorites fora do FavoritesProvider");
  return ctx;
}
