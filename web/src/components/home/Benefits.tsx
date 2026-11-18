import { DEFAULT_PAYMENT_SETTINGS, DEFAULT_SITE_CONTENT, DEFAULT_STORE_SETTINGS, fillPlaceholders, placeholderValues, type SiteContent } from "@movalev/shared";
import { api } from "@/lib/api";
import { CardIcon, ExchangeIcon, ShieldIcon, TruckIcon } from "@/components/ui/icons";

const ICONS = { truck: TruckIcon, exchange: ExchangeIcon, card: CardIcon, shield: ShieldIcon } satisfies Record<SiteContent["benefits"][number]["icon"], unknown>;

/** Faixa de vantagens da home (Conteúdo › Site). Aceita {{parcelas}} e {{pix_desconto}}. */
export async function Benefits() {
  const [site, config] = await Promise.all([api.site().catch(() => DEFAULT_SITE_CONTENT), api.store().catch(() => null)]);
  if (!site.benefits.length) return null;
  const values = placeholderValues(config?.store ?? DEFAULT_STORE_SETTINGS, config?.payments ?? DEFAULT_PAYMENT_SETTINGS);
  return (
    <section aria-label="Vantagens" className="mt-20 border-y border-linha md:mt-[100px]">
      <ul className="container-site grid grid-cols-2 gap-y-6 py-7 md:grid-cols-4">
        {site.benefits.map((b, i) => {
          const Icon = ICONS[b.icon];
          return (
            <li key={i} data-reveal className="flex items-center gap-4">
              <Icon className="shrink-0 text-oliva" />
              <p className="text-[15px] leading-snug">
                <span className="block font-normal">{fillPlaceholders(b.title, values)}</span>
                {b.text && <span className="block font-light text-texto-2">{fillPlaceholders(b.text, values)}</span>}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
