/** Parâmetros de filtro aceitos na URL da categoria (mesmos nomes da API). */
export const FILTER_KEYS = ["modelo", "sensacao", "cor", "tamanho", "precoMin", "precoMax", "ordem"] as const;

export function pickFilters(params: URLSearchParams | Record<string, string | string[] | undefined>): URLSearchParams {
  const out = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const v = params instanceof URLSearchParams ? params.get(key) : params[key];
    const value = Array.isArray(v) ? v.join(",") : v;
    if (value) out.set(key, value);
  }
  return out;
}

export function listParam(params: URLSearchParams, key: string): string[] {
  return (params.get(key) ?? "").split(",").filter(Boolean);
}

export function activeFilterCount(params: URLSearchParams): number {
  return (
    listParam(params, "sensacao").length +
    listParam(params, "cor").length +
    listParam(params, "tamanho").length +
    (params.get("precoMin") || params.get("precoMax") ? 1 : 0)
  );
}
