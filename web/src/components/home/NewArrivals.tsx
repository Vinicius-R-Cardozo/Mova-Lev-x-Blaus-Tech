"use client";
import Link from "next/link";
import { useState } from "react";
import type { ProductCardDTO } from "@movalev/shared";
import { ProductCard } from "@/components/product/ProductCard";
import { cn } from "@/lib/cn";

const TABS = [
  { id: "novos", label: "Recém-chegados" },
  { id: "vendidos", label: "Mais vendidos" },
] as const;

export function NewArrivals({ newArrivals, bestSellers }: { newArrivals: ProductCardDTO[]; bestSellers: ProductCardDTO[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("novos");
  const items = tab === "novos" ? newArrivals : bestSellers;

  return (
    <section aria-labelledby="novidades-titulo" className="container-site pt-20 md:pt-[120px]">
      <div data-reveal className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <h2 id="novidades-titulo" className="text-h2-sm md:text-h2">
          Novidades
        </h2>
        <div className="flex items-center gap-6 md:pb-2">
          <div role="tablist" aria-label="Filtrar novidades" className="flex gap-6">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                id={`tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls="novidades-painel"
                onClick={() => setTab(t.id)}
                className={cn("label tab-line min-h-touch transition-colors", tab === t.id ? "text-preto" : "text-texto-2 hover:text-preto")}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Link href="/colecao/novidades" className="label min-h-touch content-center text-texto-2 hover:text-preto">
            Ver tudo
          </Link>
        </div>
      </div>
      <div id="novidades-painel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 md:mt-10 lg:grid-cols-4 lg:gap-x-4">
        {items.map((p) => (
          // A chave muda com a aba: os cards da outra aba entram de novo com o reveal.
          <div key={`${tab}-${p.id}`} data-reveal>
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
