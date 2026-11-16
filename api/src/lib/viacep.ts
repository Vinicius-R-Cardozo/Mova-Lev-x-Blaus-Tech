export interface CepAddress {
  street: string;
  district: string;
  city: string;
  uf: string;
}

const cache = new Map<string, { at: number; value: CepAddress | null }>();

/** Consulta o ViaCEP (com cache de 1 h e timeout de 4 s). Nulo = CEP inexistente ou serviço fora. */
export async function lookupCep(cep: string): Promise<CepAddress | null> {
  const hit = cache.get(cep);
  if (hit && Date.now() - hit.at < 3_600_000) return hit.value;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const d = (await res.json()) as { erro?: boolean | string; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
    const value = d.erro || !d.uf ? null : { street: d.logradouro ?? "", district: d.bairro ?? "", city: d.localidade ?? "", uf: d.uf };
    cache.set(cep, { at: Date.now(), value });
    return value;
  } catch {
    return null;
  }
}
