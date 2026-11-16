import type { ProductCardDTO, SizeOptionDTO } from "@movalev/shared";

/**
 * Tamanho usado pelos atalhos "Adicionar o look": M, ou o disponível mais próximo.
 * A cliente troca o tamanho na sacola (fase 3).
 */
const PREFERENCE = ["M", "P", "G", "PP", "GG"] as const;

export function defaultSize(p: ProductCardDTO): SizeOptionDTO | null {
  for (const size of PREFERENCE) {
    const s = p.sizes.find((x) => x.size === size && x.available);
    if (s) return s;
  }
  return null;
}
