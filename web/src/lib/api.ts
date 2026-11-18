import type { CategoryDTO, CategoryPageDTO, HomeDTO, ProductCardDTO, ProductDetailDTO, StoreConfigDTO } from "@movalev/shared";
import { API_URL } from "./site";

/** No servidor (SSR) pode usar uma URL interna; no navegador, a pública. */
const BASE = typeof window === "undefined" ? (process.env.API_URL_INTERNAL ?? API_URL) : API_URL;

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function get<T>(path: string, init?: RequestInit & { next?: { revalidate?: number; tags?: string[] } }): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { Accept: "application/json", ...init?.headers } });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new ApiError(res.status, body.error ?? "erro", body.message ?? res.statusText);
  }
  return (await res.json()) as T;
}

const REVALIDATE = 60;

export const api = {
  home: () => get<HomeDTO>("/catalog/home", { next: { revalidate: REVALIDATE, tags: ["home"] } }),
  categories: () => get<CategoryDTO[]>("/catalog/categories", { next: { revalidate: 300, tags: ["categories"] } }),
  category: (slug: string, query: string) =>
    get<CategoryPageDTO>(`/catalog/categories/${encodeURIComponent(slug)}/products${query ? `?${query}` : ""}`, {
      next: { revalidate: REVALIDATE, tags: ["catalog"] },
    }),
  product: (slug: string) => get<ProductDetailDTO>(`/catalog/products/${encodeURIComponent(slug)}`, { next: { revalidate: REVALIDATE, tags: ["catalog"] } }),
  search: (q: string) => get<{ query: string; items: ProductCardDTO[] }>(`/catalog/search?q=${encodeURIComponent(q)}`, { cache: "no-store" }),
  /** Dados da loja e formas de pagamento (Configurações do painel). */
  store: () => get<StoreConfigDTO>("/catalog/store", { next: { revalidate: REVALIDATE, tags: ["store"] } }),
  slugs: () => get<{ products: { slug: string; updatedAt: string }[]; categories: string[] }>("/catalog/slugs", { next: { revalidate: 600 } }),
};

/** POST com chave de idempotência (newsletter, pedido...). */
export async function post<T>(path: string, body: unknown, idempotencyKey: string, token?: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; message?: string };
  if (!res.ok) throw new ApiError(res.status, data.error ?? "erro", data.message ?? "Não foi possível concluir. Tente de novo.");
  return data;
}
