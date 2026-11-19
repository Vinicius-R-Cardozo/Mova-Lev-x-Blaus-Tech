import type { Metadata } from "next";
import { api } from "@/lib/api";
import { Hero } from "@/components/home/Hero";
import { CategoryShortcuts } from "@/components/home/CategoryShortcuts";
import { NewArrivals } from "@/components/home/NewArrivals";
import { Benefits } from "@/components/home/Benefits";
import { ShopTheLook } from "@/components/home/ShopTheLook";
import { InstagramGrid } from "@/components/home/InstagramGrid";

// Renderizada por requisição (o build não depende da API); os dados ficam em cache por 60 s.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "MOVA LEV · Vista seu movimento. Viva seu leve." },
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const home = await api.home();
  return (
    <>
      <Hero hero={home.hero} campaign={home.campaign} />
      <CategoryShortcuts categories={home.categories} />
      <NewArrivals newArrivals={home.newArrivals} bestSellers={home.bestSellers} />
      <Benefits />
      <ShopTheLook look={home.shopTheLook} />
      <InstagramGrid instagram={home.instagram} />
    </>
  );
}
