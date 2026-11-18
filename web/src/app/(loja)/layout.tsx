import { DEFAULT_PAYMENT_SETTINGS, DEFAULT_SITE_CONTENT, DEFAULT_STORE_SETTINGS, fillPlaceholders, placeholderValues, type CategoryDTO } from "@movalev/shared";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { CartDrawerLazy } from "@/components/cart/CartDrawerLazy";
import { RevealObserver } from "@/components/motion/RevealObserver";
import { NavTransition } from "@/components/motion/NavTransition";
import { api } from "@/lib/api";

const FALLBACK: CategoryDTO[] = ["Novidades", "Leggings", "Tops", "Conjuntos"].map((name) => ({
  slug: name.toLowerCase(),
  name,
  description: null,
  bannerCaption: null,
  bannerUrl: null,
  pictogram: "LEGGING",
  tone: "#E6D5C5",
  showInMenu: true,
}));

export default async function LojaLayout({ children }: { children: React.ReactNode }) {
  const [categories, site, config] = await Promise.all([
    api.categories().catch(() => FALLBACK),
    api.site().catch(() => DEFAULT_SITE_CONTENT),
    api.store().catch(() => null),
  ]);
  const store = config?.store ?? DEFAULT_STORE_SETTINGS;
  const values = placeholderValues(store, config?.payments ?? DEFAULT_PAYMENT_SETTINGS);
  const fill = (text: string) => fillPlaceholders(text, values);
  return (
    <>
      <AnnouncementBar announcement={site.announcement} fill={fill} />
      <Header categories={categories} nav={site.nav} />
      <main id="conteudo" tabIndex={-1} className="focus:outline-none">
        {children}
      </main>
      <Footer footer={site.footer} store={store} fill={fill} />
      <CartDrawerLazy />
      <RevealObserver />
      <NavTransition />
    </>
  );
}
