import type { Metadata } from "next";
import { api } from "@/lib/api";
import { Hero } from "@/components/home/Hero";
import { CategoryShortcuts } from "@/components/home/CategoryShortcuts";
import { NewArrivals } from "@/components/home/NewArrivals";
import { Benefits } from "@/components/home/Benefits";
import { ShopTheLook } from "@/components/home/ShopTheLook";
import { Sensations } from "@/components/home/Sensations";
import { Studio } from "@/components/home/Studio";
import { InstagramGrid } from "@/components/home/InstagramGrid";

export const metadata: Metadata = {
  title: { absolute: "MOVA LEV · Movimento é vida — moda fitness feminina" },
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
      <Sensations items={home.sensations} />
      <Studio studio={home.studio} />
      <InstagramGrid instagram={home.instagram} />
    </>
  );
}
