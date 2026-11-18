import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";
import type { SiteContent, StoreSettings } from "@movalev/shared";
import { NewsletterForm } from "./NewsletterForm";
import { CookiePreferencesLink } from "@/components/consent/CookiePreferencesLink";

const isExternal = (href: string) => /^https?:/i.test(href);
const linkClass = "inline-flex min-h-[32px] items-center text-body-sm font-normal hover:text-oliva";
const SOCIAL = [
  ["instagram", "Instagram"],
  ["tiktok", "TikTok"],
  ["pinterest", "Pinterest"],
  ["youtube", "YouTube"],
] as const;

/** Rodapé: textos e colunas vêm de Conteúdo › Site; redes e CNPJ, de Configurações › Loja. */
export function Footer({ footer, store, fill }: { footer: SiteContent["footer"]; store: StoreSettings; fill: (text: string) => string }) {
  const social = SOCIAL.filter(([k]) => store[k]);
  const title = fill(footer.newsletterTitle);
  return (
    <footer className="border-t border-linha">
      <div className="container-site pt-16 md:pt-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,640px)_1fr] lg:gap-12">
          <div data-reveal>
            {title && <h2 className="text-h3-sm md:text-[38px] md:leading-tight">{title}</h2>}
            <NewsletterForm />
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {footer.columns.map((col) => (
              <nav key={col.title} aria-label={col.title} data-reveal>
                <h3 className="label-sm font-sans font-medium">{col.title}</h3>
                <ul className="mt-2">
                  {col.links.map((l) => (
                    <li key={`${l.label}-${l.href}`}>
                      {isExternal(l.href) ? (
                        <a href={l.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                          {l.label}
                        </a>
                      ) : (
                        <Link href={l.href} className={linkClass}>
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
          <p>
            © {store.storeName}
            {store.cnpj && ` · CNPJ ${store.cnpj}`}
          </p>
          {footer.bottomNote && <p>{fill(footer.bottomNote)}</p>}
        </div>
        <nav aria-label="Legal" className="flex flex-wrap gap-x-5 pb-8 pt-2 text-[13px] font-light text-texto-2">
          <Link href="/politica-de-privacidade" className="inline-flex min-h-touch items-center hover:text-texto">Privacidade</Link>
          <Link href="/termos-de-uso" className="inline-flex min-h-touch items-center hover:text-texto">Termos de uso</Link>
          <CookiePreferencesLink className="inline-flex min-h-touch items-center hover:text-texto" label="Preferências de cookies" />
          {social.length > 0 && <span aria-hidden className="hidden flex-1 sm:block" />}
          {social.map(([k, label]) => (
            <a key={k} href={store[k]} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-touch items-center hover:text-texto">
              {label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
