import type { CategoryDTO } from "@movalev/shared";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartDrawerLazy } from "@/components/cart/CartDrawerLazy";
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
  const categories = await api.categories().catch(() => FALLBACK);
  return (
    <>
      <AnnouncementBar />
      <Header categories={categories} />
      <main id="conteudo" tabIndex={-1} className="focus:outline-none">
        {children}
      </main>
      <Footer />
      <CartDrawerLazy />
    </>
  );
}
