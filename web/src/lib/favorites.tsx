"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { readJSON, writeJSON } from "./storage";
import { useAuth } from "./auth";

/** Favoritos: no navegador para visitantes; ao entrar, juntam-se aos da conta e passam a ser salvos nela. */
interface FavState {
  has: (productId: string) => boolean;
  toggle: (productId: string) => void;
  ids: string[];
}

const KEY = "movalev:favoritos:v1";
const Ctx = createContext<FavState | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { session, apiFetch } = useAuth();
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const mergedFor = useRef<string | null>(null);
  const idsRef = useRef(ids);
  idsRef.current = ids;

  useEffect(() => {
    setIds(readJSON<string[]>(KEY, []));
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) writeJSON(KEY, ids);
  }, [ids, ready]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!ready || !userId || mergedFor.current === userId) return;
    mergedFor.current = userId;
    apiFetch<{ productIds: string[] }>("/me/favorites/merge", { method: "POST", body: JSON.stringify({ productIds: idsRef.current }) })
      .then((r) => setIds(r.productIds))
      .catch(() => undefined);
  }, [session, ready, apiFetch]);

  const toggle = useCallback(
    (id: string) => {
      const on = !idsRef.current.includes(id);
      setIds((prev) => (on ? [...prev, id] : prev.filter((x) => x !== id)));
      if (session) void apiFetch(`/me/favorites/${id}`, { method: on ? "PUT" : "DELETE" }).catch(() => undefined);
    },
    [session, apiFetch],
  );
  const value = useMemo(() => ({ ids, toggle, has: (id: string) => ids.includes(id) }), [ids, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFavorites(): FavState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFavorites fora do FavoritesProvider");
  return ctx;
}
