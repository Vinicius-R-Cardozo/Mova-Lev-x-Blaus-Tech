import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError, api } from "@/lib/api";
import { CategoryBanner } from "@/components/category/CategoryBanner";
import { ModelChips } from "@/components/category/ModelChips";
import { Filters } from "@/components/category/Filters";
import { CategoryResults } from "@/components/category/CategoryResults";
import { pickFilters } from "@/components/category/query";
import { JsonLd } from "@/components/ui/JsonLd";
import { SITE_URL } from "@/lib/site";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

async function load(slug: string, query: URLSearchParams) {
  try {
    return await api.category(slug, query.toString());
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) notFound();
    throw err;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await api.category(slug, "porPagina=1").catch(() => null);
  if (!data) return {};
  return {
    title: data.category.name,
    description: data.category.description ?? undefined,
    alternates: { canonical: `/colecao/${slug}` },
    openGraph: { title: `${data.category.name} · MOVA LEV`, description: data.category.description ?? undefined },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = pickFilters(await searchParams);
  const data = await load(slug, query);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Início", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: data.category.name, item: `${SITE_URL}/colecao/${slug}` },
          ],
        }}
      />
      <CategoryBanner category={data.category} />
      <div className="container-site pb-24 pt-5 md:pt-7">
        {slug === "leggings" && (
          <div className="mb-5 md:mb-7">
            <ModelChips slug={slug} params={query} />
          </div>
        )}
        <div className="md:grid md:grid-cols-[220px_1fr] md:gap-10 lg:grid-cols-[252px_1fr] lg:gap-[42px]">
          <aside aria-label="Filtros" className="hidden pt-1 md:block">
            <Filters colors={data.facets.colors} priceMinCents={data.facets.priceMinCents} priceMaxCents={data.facets.priceMaxCents} />
          </aside>
          <div>
            <CategoryResults slug={slug} initial={data} />
          </div>
        </div>
      </div>
    </>
  );
}
