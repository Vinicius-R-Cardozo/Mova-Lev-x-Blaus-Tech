import type { MetadataRoute } from "next";
import { api } from "@/lib/api";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

const STATIC = ["", "/sobre", "/trocas-e-devolucoes", "/guia-de-tamanhos", "/contato", "/politica-de-privacidade", "/termos-de-uso"];
const SYSTEM_PAGES = new Set(STATIC);
const FALLBACK_CATEGORIES = ["novidades", "leggings", "tops", "conjuntos", "macaquinhos", "casacos", "acessorios"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const data = await api.slugs().catch(() => null);
  return [
    ...STATIC.map((p) => ({ url: `${SITE_URL}${p}`, lastModified: now, changeFrequency: p ? ("monthly" as const) : ("daily" as const), priority: p ? 0.4 : 1 })),
    ...(data?.categories ?? FALLBACK_CATEGORIES).map((c) => ({ url: `${SITE_URL}/colecao/${c}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 })),
    // Páginas extras criadas no painel (as da loja já estão em STATIC).
    ...(data?.pages ?? [])
      .filter((p) => !p.system && !SYSTEM_PAGES.has(`/${p.slug}`))
      .map((p) => ({ url: `${SITE_URL}/pagina/${p.slug}`, lastModified: new Date(p.updatedAt), changeFrequency: "monthly" as const, priority: 0.3 })),
    ...(data?.products ?? []).map((p) => ({ url: `${SITE_URL}/produto/${p.slug}`, lastModified: new Date(p.updatedAt), changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
