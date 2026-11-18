import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DEFAULT_PAYMENT_SETTINGS, DEFAULT_STORE_SETTINGS, fillPlaceholders, placeholderValues, type PageDTO } from "@movalev/shared";
import { InfoPage } from "@/components/institutional/InfoPage";
import { Markdown, tocFrom } from "./Markdown";
import { api, ApiError } from "@/lib/api";

/** Páginas legais mostram "Atualizada em". */
const DATED = new Set(["politica-de-privacidade", "termos-de-uso"]);
const dateBR = (iso: string) => new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date(iso));

async function load(slug: string): Promise<PageDTO | null> {
  try {
    return await api.page(slug);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/** Título e descrição da página para o Google (campos SEO do painel). */
export async function cmsMetadata(slug: string, path: string): Promise<Metadata> {
  const p = await load(slug).catch(() => null);
  if (!p) return { title: "Página não encontrada", robots: { index: false } };
  return {
    title: p.seoTitle || [p.title, p.emphasis].filter(Boolean).join(" "),
    description: p.seoDescription || p.intro || undefined,
    alternates: { canonical: path },
  };
}

/** Página de texto editada no painel (Conteúdo › Páginas). */
export async function CmsPage({ slug, path }: { slug: string; path: string }) {
  const [page, config] = await Promise.all([load(slug), api.store().catch(() => null)]);
  if (!page) notFound();
  const values = placeholderValues(config?.store ?? DEFAULT_STORE_SETTINGS, config?.payments ?? DEFAULT_PAYMENT_SETTINGS);
  const body = fillPlaceholders(page.body, values);
  return (
    <InfoPage
      slug={path.replace(/^\//, "")}
      kicker={page.kicker ?? ""}
      title={page.title}
      emphasis={page.emphasis ?? undefined}
      intro={page.intro ? fillPlaceholders(page.intro, values) : undefined}
      updatedAt={DATED.has(page.slug) ? dateBR(page.updatedAt) : undefined}
      toc={page.showToc ? tocFrom(body) : undefined}
    >
      <Markdown source={body} />
    </InfoPage>
  );
}
