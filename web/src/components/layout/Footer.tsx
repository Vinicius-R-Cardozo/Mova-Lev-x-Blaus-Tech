import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";
import { CNPJ } from "@/lib/site";
import { NewsletterForm } from "./NewsletterForm";
import { CookiePreferencesLink } from "@/components/consent/CookiePreferencesLink";

const columns = [
  {
    title: "Loja",
    links: [
      { label: "Novidades", href: "/colecao/novidades" },
      { label: "Leggings", href: "/colecao/leggings" },
      { label: "Tops", href: "/colecao/tops" },
      { label: "Conjuntos", href: "/colecao/conjuntos" },
    ],
  },
  {
    title: "Ajuda",
    links: [
      { label: "Trocas e devoluções", href: "/trocas-e-devolucoes" },
      { label: "Guia de tamanhos", href: "/guia-de-tamanhos" },
      { label: "Entregas", href: "/trocas-e-devolucoes#entregas" },
      { label: "Contato", href: "/contato" },
    ],
  },
  {
    title: "Marca",
    links: [
      { label: "Manifesto", href: "/sobre" },
      { label: "Studio MOVA", href: "/#studio" },
      { label: "Instagram", href: "https://instagram.com/movalev", external: true },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-linha">
      <div className="container-site pt-16 md:pt-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,640px)_1fr] lg:gap-12">
          <div data-reveal>
            <h2 className="text-h3-sm md:text-[38px] md:leading-tight">
              Receba novidades e 10% na 1<sup className="text-[0.55em]">a</sup> compra
            </h2>
            <NewsletterForm />
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((col) => (
              <nav key={col.title} aria-label={col.title} data-reveal>
                <h3 className="label-sm font-sans font-medium">{col.title}</h3>
                <ul className="mt-2">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      {"external" in l ? (
                        <a href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[32px] items-center text-body-sm font-normal hover:text-oliva">
                          {l.label}
                        </a>
                      ) : (
                        <Link href={l.href} className="inline-flex min-h-[32px] items-center text-body-sm font-normal hover:text-oliva">
                          {l.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div data-reveal className="mt-12 text-areia md:mt-14">
          <BrandMark variant="completa" decorative className="block w-full" />
        </div>

        <div className="flex flex-col gap-2 pt-8 text-[13px] font-light text-texto-2 sm:flex-row sm:justify-between">
          <p>© MOVA LEV · {CNPJ}</p>
          <p>Pix · Cartão em até 6x · Boleto</p>
        </div>
        <nav aria-label="Legal" className="flex flex-wrap gap-x-5 pb-8 pt-2 text-[13px] font-light text-texto-2">
          <Link href="/politica-de-privacidade" className="inline-flex min-h-touch items-center hover:text-texto">Privacidade</Link>
          <Link href="/termos-de-uso" className="inline-flex min-h-touch items-center hover:text-texto">Termos de uso</Link>
          <CookiePreferencesLink className="inline-flex min-h-touch items-center hover:text-texto" label="Preferências de cookies" />
        </nav>
      </div>
    </footer>
  );
}
