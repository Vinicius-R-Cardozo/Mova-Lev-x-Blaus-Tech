import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError, api } from "@/lib/api";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { JsonLd } from "@/components/ui/JsonLd";
import { ProductView } from "@/components/product/ProductView";
import { ProductCard } from "@/components/product/ProductCard";
import { SITE_URL } from "@/lib/site";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ cor?: string }> };

async function load(slug: string) {
  try {
    return await api.product(slug);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) notFound();
    throw err;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await api.product(slug).catch(() => null);
  if (!p) return {};
  const image = p.colors[0]?.images.find((i) => i.url)?.url;
  return {
    title: p.name,
    description: p.description,
    alternates: { canonical: `/produto/${p.slug}` },
    openGraph: { title: `${p.name} · MOVA LEV`, description: p.description, images: image ? [image] : undefined },
  };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { cor } = await searchParams;
  const product = await load(slug);
  const color = product.colors.find((c) => c.slug === cor)?.slug ?? product.colors[0]!.slug;

  const crumbs = [
    { name: "Início", href: "/" },
    ...(product.category ? [{ name: product.category.name, href: `/colecao/${product.category.slug}` }] : []),
    { name: product.name },
  ];
  const url = `${SITE_URL}/produto/${product.slug}`;
  const allSizes = product.colors.flatMap((c) => c.sizes);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.description,
          sku: allSizes[0]?.variantId,
          brand: { "@type": "Brand", name: "MOVA LEV" },
          image: product.colors.flatMap((c) => c.images.filter((i) => i.url).map((i) => i.url)),
          color: product.colors.map((c) => c.name).join(", "),
          offers: {
            "@type": "Offer",
            url,
            priceCurrency: "BRL",
            price: (product.priceCents / 100).toFixed(2),
            availability: allSizes.some((s) => s.available) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            itemCondition: "https://schema.org/NewCondition",
          },
          ...(product.rating ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating.average, reviewCount: product.rating.count } } : {}),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.href ? `${SITE_URL}${c.href}` : url })),
        }}
      />
      <div className="container-site pb-24 pt-5 md:pt-7 lg:pb-0">
        <Breadcrumb items={crumbs} className="mb-5 hidden md:block md:mb-6" />
        <ProductView product={product} initialColor={color} />
      </div>

      {product.youMayLike.length > 0 && (
        <section aria-labelledby="gostar-titulo" className="container-site pb-20 pt-20 md:pb-[110px] md:pt-[110px]">
          <h2 id="gostar-titulo" className="text-[40px] leading-tight md:text-h2-sm">
            Você também vai gostar
          </h2>
          <ul className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 lg:grid-cols-4 lg:gap-x-4">
            {product.youMayLike.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} variant="simple" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
