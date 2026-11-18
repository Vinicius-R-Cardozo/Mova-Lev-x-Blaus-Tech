"use client";
import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_PAYMENT_SETTINGS, DEFAULT_STORE_SETTINGS, formatBRL, installmentCents, installmentsFor, type StoreConfigDTO } from "@movalev/shared";

/**
 * Configurações da loja vindas do painel (dados da empresa e formas de pagamento),
 * buscadas no servidor (layout) e entregues aos componentes do navegador.
 * Sem resposta da API, valem os padrões (6x sem juros, 5% no Pix).
 */
const Ctx = createContext<StoreConfigDTO>({ store: DEFAULT_STORE_SETTINGS, payments: DEFAULT_PAYMENT_SETTINGS });

export function StoreConfigProvider({ value, children }: { value: StoreConfigDTO; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStoreConfig = () => useContext(Ctx);

/** "6x de R$ 48,17 sem juros" (ou null se o cartão está desligado ou só cabe 1x). */
export function installmentText(cfg: StoreConfigDTO, cents: number): string | null {
  const p = cfg.payments;
  if (!p.cardEnabled) return null;
  const n = installmentsFor(cents, p.maxInstallments, p.minInstallmentCents);
  return n > 1 ? `${n}x de ${formatBRL(installmentCents(cents, n))} sem juros` : null;
}

/** "5% off no Pix" (ou null se o Pix está desligado ou sem desconto). */
export function pixText(cfg: StoreConfigDTO): string | null {
  const p = cfg.payments;
  return p.pixEnabled && p.pixDiscountPercent > 0 ? `${p.pixDiscountPercent}% off no Pix` : null;
}
