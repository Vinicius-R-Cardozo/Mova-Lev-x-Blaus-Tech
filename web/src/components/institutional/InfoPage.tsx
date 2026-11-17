import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { JsonLd } from "@/components/ui/JsonLd";
import { SITE_URL } from "@/lib/site";

/** Página institucional: faixa com trilha, título e índice opcional + texto corrido. */
export function InfoPage({
  slug,
  kicker,
  title,
  emphasis,
  intro,
  updatedAt,
  toc,
  children,
}: {
  slug: string;
  kicker: string;
  title: string;
  emphasis?: string;
  intro?: string;
  updatedAt?: string;
  toc?: { id: string; label: string }[];
  children: React.ReactNode;
}) {
  const name = emphasis ? `${title} ${emphasis}` : title;
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Início", item: SITE_URL },
            { "@type": "ListItem", position: 2, name, item: `${SITE_URL}/${slug}` },
          ],
        }}
      />
      <section className="bg-bege">
        <div className="container-site py-12 md:px-[60px] md:py-20">
          <Breadcrumb items={[{ name: "Início", href: "/" }, { name }]} className="text-[10px] md:text-label" />
          <p className="label mt-8 text-texto-3">{kicker}</p>
          <h1 className="mt-4 text-[48px] leading-[1.02] md:text-[80px]">
            {title} {emphasis && <em>{emphasis}</em>}
          </h1>
          {intro && <p className="mt-5 max-w-[620px] text-body-lg font-light text-texto-3">{intro}</p>}
          {updatedAt && <p className="mt-4 text-[13px] text-texto-2">Atualizada em {updatedAt}</p>}
        </div>
      </section>
      <div className="container-site grid gap-12 py-14 md:px-[60px] md:py-20 lg:grid-cols-[220px_1fr]">
        {toc ? (
          <nav aria-label="Nesta página" className="lg:sticky lg:top-28 lg:self-start">
            <p className="label-sm text-texto-2">Nesta página</p>
            <ul className="mt-3 space-y-1">
              {toc.map((t) => (
                <li key={t.id}>
                  <a href={`#${t.id}`} className="inline-flex min-h-[36px] items-center text-[15px] font-light hover:text-oliva hover:underline">
                    {t.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : (
          <div className="hidden lg:block" />
        )}
        <article className="prose-mova [&>h2:first-child]:mt-0">{children}</article>
      </div>
    </>
  );
}
