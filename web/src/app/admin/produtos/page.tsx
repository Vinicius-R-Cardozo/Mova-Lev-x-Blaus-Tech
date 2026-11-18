"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BADGE_LABEL, PRODUCT_STATUSES, PRODUCT_STATUS_LABEL, formatBRL, type Badge, type ProductStatus } from "@movalev/shared";
import { PageTitle } from "@/components/admin/ui";
import { EmptyState, Pagination, TableSkeleton, errorText, useFeedback } from "@/components/admin/feedback";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";

type Row = {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  priceCents: number;
  compareAtPriceCents: number | null;
  badge: Badge | null;
  stock: number;
  soldOutVariants: number;
  lowVariants: number;
  colors: { name: string; hex: string }[];
  photos: number;
  thumb: string | null;
};
type ListResponse = { total: number; page: number; perPage: number; lowStockThreshold: number; items: Row[] };
type Meta = { categories: { id: string; name: string }[]; collections: { id: string; name: string }[] };

const STATUS_TONE: Record<ProductStatus, string> = {
  ACTIVE: "bg-oliva/10 text-oliva-escuro",
  DRAFT: "bg-bege text-texto-3",
  HIDDEN: "bg-taupe-claro/40 text-texto-3",
  ARCHIVED: "bg-linha text-texto-2",
};

export default function ProdutosPage() {
  const { apiFetch } = useAuth();
  const { toast, confirm } = useFeedback();
  const router = useRouter();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [f, setF] = useState({ q: "", status: "", categoryId: "", collectionId: "", stock: "", promo: false, sort: "nome", page: 1 });

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(f.page), perPage: "25", sort: f.sort });
    for (const k of ["q", "status", "categoryId", "collectionId", "stock"] as const) if (f[k]) qs.set(k, f[k].trim());
    if (f.promo) qs.set("promo", "true");
    try {
      setData(await apiFetch<ListResponse>(`/admin/products?${qs}`));
    } catch (err) {
      toast(errorText(err), "erro");
    } finally {
      setLoading(false);
    }
  }, [apiFetch, f, toast]);

  useEffect(() => {
    apiFetch<Meta>("/admin/meta").then(setMeta).catch(() => undefined);
  }, [apiFetch]);
  // Busca com pequeno atraso para não chamar a API a cada letra.
  useEffect(() => {
    const t = window.setTimeout(() => void load(), f.q ? 300 : 0);
    return () => window.clearTimeout(t);
  }, [load, f.q]);

  const setFilter = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch, page: patch.page ?? 1 }));

  async function act(p: Row, action: "duplicate" | "archive" | "restore" | "delete") {
    if (action === "archive" && !(await confirm({ title: "Arquivar produto?", text: `“${p.name}” sai da loja. Você pode restaurar depois em “Arquivados”.`, confirm: "Arquivar" }))) return;
    if (
      action === "delete" &&
      !(await confirm({ title: "Excluir de vez?", text: <>“{p.name}” e as fotos que só ele usa serão apagados. <strong>Não dá para desfazer.</strong> Produtos que já foram vendidos não podem ser excluídos.</>, confirm: "Excluir de vez", danger: true }))
    )
      return;
    setBusy(p.id);
    try {
      if (action === "duplicate") {
        const copy = await apiFetch<{ id: string }>(`/admin/products/${p.id}/duplicate`, { method: "POST" });
        toast("Cópia criada como rascunho (estoque zerado).");
        router.push(`/admin/produtos/${copy.id}`);
        return;
      }
      if (action === "delete") await apiFetch(`/admin/products/${p.id}`, { method: "DELETE" });
      else await apiFetch(`/admin/products/${p.id}/${action}`, { method: "POST" });
      toast(action === "archive" ? "Produto arquivado." : action === "restore" ? "Produto restaurado como rascunho." : "Produto excluído.");
      await load();
    } catch (err) {
      toast(errorText(err), "erro");
    } finally {
      setBusy(null);
    }
  }

  const archivedView = f.status === "ARCHIVED";

  return (
    <>
      <PageTitle actions={<Link href="/admin/produtos/novo" className="btn-primary h-12">Novo produto</Link>}>Produtos</PageTitle>

      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_170px_170px_170px]">
        <input aria-label="Buscar produto" placeholder="Buscar por nome, endereço ou SKU" className="input h-11 bg-white" value={f.q} onChange={(e) => setFilter({ q: e.target.value })} />
        <select aria-label="Status" className="input h-11 bg-white" value={f.status} onChange={(e) => setFilter({ status: e.target.value })}>
          <option value="">Todos (sem arquivados)</option>
          {PRODUCT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "ARCHIVED" ? "Arquivados" : PRODUCT_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select aria-label="Categoria" className="input h-11 bg-white" value={f.categoryId} onChange={(e) => setFilter({ categoryId: e.target.value })}>
          <option value="">Todas as categorias</option>
          {meta?.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select aria-label="Coleção" className="input h-11 bg-white" value={f.collectionId} onChange={(e) => setFilter({ collectionId: e.target.value })}>
          <option value="">Todas as coleções</option>
          {meta?.collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-2 text-[14px]">
        {[
          { k: "", label: "Todo estoque" },
          { k: "baixo", label: `Estoque baixo${data ? ` (≤ ${data.lowStockThreshold})` : ""}` },
          { k: "esgotado", label: "Com variante esgotada" },
        ].map((o) => (
          <button key={o.k} type="button" aria-pressed={f.stock === o.k} onClick={() => setFilter({ stock: o.k })} className={cn("h-9 border px-3", f.stock === o.k ? "border-preto bg-preto text-offwhite" : "border-linha-forte bg-white hover:border-preto")}>
            {o.label}
          </button>
        ))}
        <button type="button" aria-pressed={f.promo} onClick={() => setFilter({ promo: !f.promo })} className={cn("h-9 border px-3", f.promo ? "border-preto bg-preto text-offwhite" : "border-linha-forte bg-white hover:border-preto")}>
          Em promoção
        </button>
        <label className="ml-auto flex items-center gap-2 text-texto-2">
          Ordenar
          <select className="h-9 border border-linha-forte bg-white px-2 text-texto" value={f.sort} onChange={(e) => setFilter({ sort: e.target.value })}>
            <option value="nome">Nome</option>
            <option value="recentes">Mais recentes</option>
            <option value="preco">Menor preço</option>
          </select>
        </label>
      </div>

      {loading && !data ? (
        <TableSkeleton rows={8} cols={5} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title={archivedView ? "Nada arquivado" : f.q || f.status || f.categoryId || f.collectionId || f.stock || f.promo ? "Nenhum produto com esses filtros" : "Nenhum produto ainda"}
          text={archivedView ? "Produtos arquivados aparecem aqui e podem ser restaurados." : "Ajuste a busca ou crie um produto."}
          action={!archivedView && <Link href="/admin/produtos/novo" className="btn-primary h-11">Novo produto</Link>}
        />
      ) : (
        <div className={cn("overflow-x-auto border border-linha bg-white transition-opacity", loading && "opacity-60")} aria-busy={loading}>
          <table className="w-full min-w-[860px] text-[14px]">
            <thead className="border-b border-linha text-left text-[12px] uppercase tracking-[0.08em] text-texto-2">
              <tr>
                <th className="px-4 py-3 font-normal">Produto</th>
                <th className="px-3 font-normal">Status</th>
                <th className="px-3 font-normal">Preço</th>
                <th className="px-3 font-normal">Estoque</th>
                <th className="px-3 font-normal">Fotos</th>
                <th className="px-4 text-right font-normal">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p.id} className="border-b border-linha last:border-b-0 hover:bg-offwhite/60">
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/produtos/${p.id}`} className="flex items-center gap-3 hover:underline">
                      <span className="h-14 w-11 shrink-0 bg-bege bg-cover bg-center" style={p.thumb ? { backgroundImage: `url(${p.thumb})` } : undefined} aria-hidden />
                      <span>
                        <span className="block font-normal">{p.name}</span>
                        <span className="mt-1 flex items-center gap-1.5">
                          {p.colors.map((c) => (
                            <span key={c.name} title={c.name} className="h-3 w-3 rounded-full border border-linha-forte" style={{ background: c.hex }} />
                          ))}
                          {p.badge && <span className="label-sm ml-1 bg-bege px-1.5 py-0.5 text-[9px]">{BADGE_LABEL[p.badge]}</span>}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3">
                    <span className={cn("label-sm px-2 py-1 text-[10px]", STATUS_TONE[p.status])}>{PRODUCT_STATUS_LABEL[p.status]}</span>
                  </td>
                  <td className="px-3 tabular-nums">
                    {formatBRL(p.priceCents, { compact: true })}
                    {p.compareAtPriceCents && <span className="ml-1.5 text-[12px] text-texto-2 line-through">{formatBRL(p.compareAtPriceCents, { compact: true })}</span>}
                  </td>
                  <td className="px-3">
                    <span className="tabular-nums">{p.stock} un.</span>
                    {p.soldOutVariants > 0 && <span className="block text-[12px] text-erro">{p.soldOutVariants} esgotada(s)</span>}
                    {p.lowVariants > 0 && <span className="block text-[12px] text-[#8a5a12]">{p.lowVariants} com estoque baixo</span>}
                  </td>
                  <td className="px-3 tabular-nums">{p.photos}</td>
                  <td className="px-4 text-right">
                    <div className="flex justify-end gap-3 text-[13px]">
                      {p.status === "ARCHIVED" ? (
                        <>
                          <button type="button" disabled={busy === p.id} className="underline hover:text-oliva disabled:opacity-40" onClick={() => void act(p, "restore")}>
                            Restaurar
                          </button>
                          <button type="button" disabled={busy === p.id} className="text-erro underline disabled:opacity-40" onClick={() => void act(p, "delete")}>
                            Excluir de vez
                          </button>
                        </>
                      ) : (
                        <>
                          <Link href={`/admin/produtos/${p.id}`} className="underline hover:text-oliva">
                            Editar
                          </Link>
                          <button type="button" disabled={busy === p.id} className="underline hover:text-oliva disabled:opacity-40" onClick={() => void act(p, "duplicate")}>
                            Duplicar
                          </button>
                          <button type="button" disabled={busy === p.id} className="text-texto-2 underline hover:text-erro disabled:opacity-40" onClick={() => void act(p, "archive")}>
                            Arquivar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} perPage={data.perPage} total={data.total} onPage={(page) => setFilter({ page })} />}
    </>
  );
}
