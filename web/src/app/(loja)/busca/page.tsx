import type { Metadata } from "next";
import { api } from "@/lib/api";
import { ProductCard } from "@/components/product/ProductCard";

export const metadata: Metadata = { title: "Buscar", robots: { index: false } };

type Props = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const q = ((await searchParams).q ?? "").trim().slice(0, 60);
  const result = q.length >= 2 ? await api.search(q).catch(() => null) : null;

  return (
    <div className="container-site pb-24 pt-12 md:pt-16">
      <h1 className="text-h2-sm md:text-h2">Buscar</h1>
      <form action="/busca" role="search" className="mt-6 flex max-w-xl gap-2">
        <label htmlFor="busca-q" className="sr-only">
          O que você procura?
        </label>
        <input id="busca-q" name="q" type="search" defaultValue={q} placeholder="Legging, top, macaquinho…" autoFocus className="input" minLength={2} maxLength={60} />
        <button type="submit" className="btn-dark h-14 px-8">
          Buscar
        </button>
      </form>

      {q.length >= 2 && (
        <section aria-live="polite" className="mt-12">
          {!result ? (
            <p className="text-body text-erro">Não foi possível buscar agora. Tente de novo.</p>
          ) : result.items.length === 0 ? (
            <p className="text-body">Nenhuma peça encontrada para “{q}”.</p>
          ) : (
            <>
              <p className="text-body font-light">
                {result.items.length} {result.items.length === 1 ? "peça" : "peças"} para “{q}”
              </p>
              <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-10 lg:grid-cols-4 lg:gap-x-4">
                {result.items.map((p) => (
                  <li key={p.id}>
                    <ProductCard product={p} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </div>
  );
}
