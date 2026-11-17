/**
 * Cache em memória por instância, com validade curta. Serve para não repetir no banco
 * (a ~180 ms por ida e volta) o que muda pouco: catálogo, faixas de desconto e frete.
 * Mudanças no admin limpam tudo na hora (revalidateStore); entre instâncias vale o TTL.
 */
type Entry = { at: number; value: Promise<unknown> };
const store = new Map<string, Entry>();
const MAX_ENTRIES = 500;

export function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as Promise<T>;
  if (store.size >= MAX_ENTRIES) store.clear();
  const value = fn().catch((err) => {
    store.delete(key); // erro não fica em cache
    throw err;
  });
  store.set(key, { at: Date.now(), value });
  return value;
}

export function clearCache(prefix = ""): void {
  if (!prefix) return store.clear();
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}

/** Respostas HTTP prontas (texto) para GETs públicos. */
const responses = new Map<string, { at: number; body: string; type: string }>();
export const responseCache = {
  get(key: string, ttlMs: number) {
    const r = responses.get(key);
    return r && Date.now() - r.at < ttlMs ? r : null;
  },
  set(key: string, body: string, type: string) {
    if (responses.size >= MAX_ENTRIES) responses.clear();
    responses.set(key, { at: Date.now(), body, type });
  },
  clear() {
    responses.clear();
  },
};
