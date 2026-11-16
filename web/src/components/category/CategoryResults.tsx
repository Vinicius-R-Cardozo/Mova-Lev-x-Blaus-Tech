"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { SORT_LABEL, SORTS, type CategoryPageDTO, type ProductCardDTO, type Sort } from "@movalev/shared";
import { ProductCard } from "@/components/product/ProductCard";
import { CloseIcon } from "@/components/ui/icons";
import { API_URL } from "@/lib/site";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { cn } from "@/lib/cn";
import { Filters, useFilterNavigation } from "./Filters";
import { activeFilterCount } from "./query";

export function CategoryResults({ slug, initial }: { slug: string; initial: CategoryPageDTO }) {
  const { params, update, pending } = useFilterNavigation();
  const [items, setItems] = useState<ProductCardDTO[]>(initial.items);
  const [page, setPage] = useState(initial.page);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [drawer, setDrawer] = useState<null | "filtros" | "ordem">(null);

  // Novo resultado do servidor (filtro mudou): recomeça a lista.
  useEffect(() => {
    setItems(initial.items);
    setPage(initial.page);
  }, [initial]);

  const sort = (params.get("ordem") as Sort | null) ?? "relevancia";
  const count = activeFilterCount(params);
  const hasMore = items.length < initial.total;

  async function loadMore() {
    setLoading(true);
    setError(false);
    try {
      const qs = new URLSearchParams(params.toString());
      qs.set("pagina", String(page + 1));
      qs.set("porPagina", String(initial.pageSize));
      const res = await fetch(`${API_URL}/catalog/categories/${slug}/products?${qs}`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as CategoryPageDTO;
      setItems((prev) => [...prev, ...data.items.filter((d) => !prev.some((p) => p.id === d.id && p.color.slug === d.color.slug))]);
      setPage(data.page);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const setSort = (value: Sort) =>
    update((p) => {
      if (value === "relevancia") p.delete("ordem");
      else p.set("ordem", value);
    });

  const clearAll = () =>
    update((p) => {
      for (const k of ["sensacao", "cor", "tamanho", "precoMin", "precoMax"]) p.delete(k);
    });

  return (
    <>
      {/* Mobile: Filtrar (n) / Ordenar */}
      <div className="grid grid-cols-2 border border-linha-forte md:hidden">
        <button type="button" className="label-sm h-12 border-r border-linha-forte" onClick={() => setDrawer("filtros")} aria-haspopup="dialog">
          Filtrar{count ? ` (${count})` : ""}
        </button>
        <button type="button" className="label-sm h-12" onClick={() => setDrawer("ordem")} aria-haspopup="dialog">
          Ordenar
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between border-b border-linha pb-4 md:mt-0 md:pb-4">
        <p className="text-body font-light" aria-live="polite">
          {initial.total} {initial.total === 1 ? "peça" : "peças"}
        </p>
        <label className="hidden items-center gap-3 md:flex">
          <span className="text-body-sm font-light text-texto-2">Ordenar por</span>
          <span className="relative">
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-[46px] w-[180px] appearance-none border border-linha-forte bg-transparent pl-4 pr-10 text-body-sm font-normal focus:border-preto focus:outline-none">
              {SORTS.map((s) => (
                <option key={s} value={s}>
                  {SORT_LABEL[s]}
                </option>
              ))}
            </select>
            <svg aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </label>
      </div>

      <div className={cn("transition-opacity", pending && "opacity-50")} aria-busy={pending}>
        {items.length === 0 ? (
          <div className="py-24 text-center">
            <p className="font-display text-h3-sm">Nenhuma peça com esses filtros.</p>
            <button type="button" onClick={clearAll} className="link-underline mt-4 min-h-touch text-body">
              Limpar filtros
            </button>
          </div>
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-10 md:mt-6 lg:grid-cols-3 lg:gap-x-4 lg:gap-y-12">
            {items.map((p, i) => (
              <li key={`${p.id}-${p.color.slug}`}>
                <ProductCard product={p} variant="grid" priority={i < 3} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {items.length > 0 && (
        <div className="mt-14 flex flex-col items-center gap-4">
          <p className="text-body-sm font-light text-texto-2">
            Mostrando {items.length} de {initial.total} {initial.total === 1 ? "peça" : "peças"}
          </p>
          {hasMore && (
            <button type="button" onClick={loadMore} disabled={loading} className="btn-secondary">
              {loading ? "Carregando" : "Carregar mais"}
            </button>
          )}
          {error && <p className="text-body-sm text-erro" role="alert">Não foi possível carregar mais peças. Tente de novo.</p>}
        </div>
      )}

      <MobileDrawer open={drawer === "filtros"} title="Filtrar" onClose={() => setDrawer(null)}>
        <Filters colors={initial.facets.colors} priceMinCents={initial.facets.priceMinCents} priceMaxCents={initial.facets.priceMaxCents} />
        <button type="button" className="btn-primary mt-8 w-full" onClick={() => setDrawer(null)}>
          Ver {initial.total} {initial.total === 1 ? "peça" : "peças"}
        </button>
      </MobileDrawer>
      <MobileDrawer open={drawer === "ordem"} title="Ordenar" onClose={() => setDrawer(null)}>
        <fieldset>
          <legend className="sr-only">Ordenar por</legend>
          {SORTS.map((s) => (
            <label key={s} className="flex min-h-[52px] items-center gap-3 border-b border-linha">
              <input type="radio" name="ordem" checked={sort === s} onChange={() => { setSort(s); setDrawer(null); }} className="h-5 w-5 accent-oliva" />
              {SORT_LABEL[s]}
            </label>
          ))}
        </fieldset>
      </MobileDrawer>
    </>
  );
}

function MobileDrawer({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => onClose(), [onClose]);
  useFocusTrap(ref, open, close);
  return (
    <div className={cn("fixed inset-0 z-drawer md:hidden", open ? "visible" : "invisible")} aria-hidden={!open}>
      <div className={cn("absolute inset-0 bg-preto/40 transition-opacity duration-300", open ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-sheet bg-offwhite px-5 pb-8 pt-3 transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-linha-forte" />
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-h3-sm">{title}</h2>
          <button type="button" onClick={onClose} aria-label={`Fechar ${title.toLowerCase()}`} className="flex h-11 w-11 items-center justify-center">
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
