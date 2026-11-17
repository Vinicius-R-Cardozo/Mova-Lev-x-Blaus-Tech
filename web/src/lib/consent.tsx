"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { readJSON, writeJSON } from "./storage";

/**
 * Consentimento de cookies (LGPD). Necessários: sempre. Analytics (GA4) e
 * marketing (Meta Pixel): só após aceite explícito, revogável a qualquer momento.
 */
export interface ConsentChoice {
  analytics: boolean;
  marketing: boolean;
  /** Data da decisão (ISO) e versão do texto. */
  decidedAt: string;
  version: number;
}

const KEY = "movalev:consentimento";
const VERSION = 1;

interface ConsentState {
  ready: boolean;
  choice: ConsentChoice | null;
  preferencesOpen: boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  save: (c: { analytics: boolean; marketing: boolean }) => void;
  openPreferences: () => void;
  closePreferences: () => void;
}

const Ctx = createContext<ConsentState | null>(null);

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [choice, setChoice] = useState<ConsentChoice | null>(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    const saved = readJSON<ConsentChoice | null>(KEY, null);
    setChoice(saved && saved.version === VERSION ? saved : null);
    setReady(true);
  }, []);

  const save = useCallback((c: { analytics: boolean; marketing: boolean }) => {
    const next: ConsentChoice = { ...c, decidedAt: new Date().toISOString(), version: VERSION };
    writeJSON(KEY, next);
    setChoice(next);
    setPreferencesOpen(false);
    // Revogação: recarrega para descarregar scripts de terceiros já carregados.
    if (choice && ((choice.analytics && !c.analytics) || (choice.marketing && !c.marketing))) window.location.reload();
  }, [choice]);

  const value = useMemo<ConsentState>(
    () => ({
      ready,
      choice,
      preferencesOpen,
      acceptAll: () => save({ analytics: true, marketing: true }),
      rejectAll: () => save({ analytics: false, marketing: false }),
      save,
      openPreferences: () => setPreferencesOpen(true),
      closePreferences: () => setPreferencesOpen(false),
    }),
    [ready, choice, preferencesOpen, save],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConsent(): ConsentState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useConsent fora do ConsentProvider");
  return ctx;
}
