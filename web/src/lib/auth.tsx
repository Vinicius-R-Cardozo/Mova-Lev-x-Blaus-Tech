"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import type { ProfileDTO } from "@movalev/shared";
import { API_URL } from "./site";
import { ApiError } from "./api";

/**
 * Sessão do Supabase Auth (link mágico e Google). O SDK é carregado sob demanda
 * para não pesar nas páginas da vitrine. A API valida o JWT em toda chamada.
 */
interface AuthState {
  ready: boolean;
  session: Session | null;
  profile: ProfileDTO | null;
  signInWithEmail: (email: string, next?: string) => Promise<void>;
  signInWithGoogle: (next?: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** fetch para a API com o token da sessão. */
  apiFetch: <T>(path: string, init?: RequestInit & { idempotencyKey?: string }) => Promise<T>;
  refreshProfile: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);
let clientPromise: Promise<SupabaseClient | null> | null = null;
export const getSupabase = () => (clientPromise ??= import("./supabase").then((m) => m.supabaseBrowser()));

const safeNext = (next?: string) => (next && next.startsWith("/") && !next.startsWith("//") ? next : "/conta");

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileDTO | null>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    void getSupabase().then((supabase) => {
      if (!supabase) return setReady(true);
      const { data } = supabase.auth.onAuthStateChange((_event, s) => {
        setSession(s);
        setReady(true);
      });
      unsub = () => data.subscription.unsubscribe();
    });
    return () => unsub?.();
  }, []);

  const apiFetch = useCallback(
    async <T,>(path: string, init: RequestInit & { idempotencyKey?: string } = {}): Promise<T> => {
      const { idempotencyKey, ...rest } = init;
      const res = await fetch(`${API_URL}${path}`, {
        ...rest,
        headers: {
          ...(rest.body ? { "Content-Type": "application/json" } : {}),
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
          ...rest.headers,
        },
      });
      if (res.status === 204) return undefined as T;
      const ct = res.headers.get("content-type") ?? "";
      const data = ct.includes("json") ? await res.json() : await res.text();
      if (!res.ok) {
        const d = data as { error?: string; message?: string };
        throw new ApiError(res.status, d?.error ?? "erro", d?.message ?? "Não foi possível concluir.");
      }
      return data as T;
    },
    [session],
  );

  const refreshProfile = useCallback(async () => {
    if (!session) return setProfile(null);
    try {
      setProfile(await apiFetch<ProfileDTO>("/me"));
    } catch {
      setProfile(null);
    }
  }, [session, apiFetch]);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      session,
      profile,
      apiFetch,
      refreshProfile,
      async signInWithEmail(email, next) {
        const supabase = await getSupabase();
        if (!supabase) throw new Error("Login indisponível.");
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(safeNext(next))}`, shouldCreateUser: true },
        });
        if (error) throw new Error(error.status === 429 ? "Muitas tentativas. Aguarde um minuto e tente de novo." : "Não foi possível enviar o link agora.");
      },
      async signInWithGoogle(next) {
        const supabase = await getSupabase();
        if (!supabase) throw new Error("Login indisponível.");
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext(next))}` },
        });
        if (error) throw new Error("Login com Google indisponível no momento.");
      },
      async signOut() {
        const supabase = await getSupabase();
        await supabase?.auth.signOut();
        setProfile(null);
      },
    }),
    [ready, session, profile, apiFetch, refreshProfile],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth fora do AuthProvider");
  return ctx;
}

export { safeNext };
