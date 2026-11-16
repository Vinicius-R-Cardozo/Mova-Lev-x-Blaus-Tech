/**
 * Dinheiro sempre em CENTAVOS (inteiro). Nada de float para valor monetário.
 */

export const MAX_INSTALLMENTS = 6;
export const PIX_DISCOUNT_PERCENT = 5;

/** Arredonda meio-para-cima (valores positivos), ex.: 70817,75 → 70818. */
export function roundCents(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value) + Number.EPSILON * 10);
}

/** Percentual de um valor em centavos, arredondado em centavos. */
export function percentOf(cents: number, percent: number): number {
  return roundCents((cents * percent) / 100);
}

function groupThousands(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Formata centavos como "R$ 1.234,56".
 * `compact: true` omite ",00" em valores inteiros ("R$ 289") — usado nas vitrines.
 */
export function formatBRL(cents: number, opts: { compact?: boolean } = {}): string {
  const negative = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const reais = Math.floor(abs / 100);
  const centavos = abs % 100;
  const body =
    opts.compact && centavos === 0
      ? groupThousands(reais)
      : `${groupThousands(reais)},${String(centavos).padStart(2, "0")}`;
  return `${negative ? "- " : ""}R$ ${body}`;
}

/** Valor de cada parcela sem juros ("6x de R$ 48,17"). */
export function installmentCents(totalCents: number, installments = MAX_INSTALLMENTS): number {
  return roundCents(totalCents / installments);
}

export function installmentLabel(totalCents: number, installments = MAX_INSTALLMENTS): string {
  return `${installments}x de ${formatBRL(installmentCents(totalCents, installments))} sem juros`;
}

/** Total no Pix com 5% off. */
export function pixTotalCents(totalCents: number): number {
  return totalCents - percentOf(totalCents, PIX_DISCOUNT_PERCENT);
}
