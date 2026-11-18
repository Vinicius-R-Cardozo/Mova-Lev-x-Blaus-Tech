"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatBRL } from "@movalev/shared";
import { PageTitle } from "@/components/admin/ui";
import { EmptyState, Pagination, TableSkeleton, errorText, useFeedback } from "@/components/admin/feedback";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";

type Row = { email: string; name: string | null; phone: string | null; hasAccount: boolean; orders: number; paidOrders: number; spentCents: number; lastOrderAt: string | null; createdAt: string | null };
type ListResponse = { total: number; page: number; perPage: number; items: Row[] };
const fmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

/** Clientes: quem tem conta e quem comprou sem conta, juntos pelo e-mail. */
export default function ClientesPage() {
  const { apiFetch } = useAuth();
  const { toast } = useFeedback();
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState({ q: "", sort: "recentes", page: 1 });

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ sort: f.sort, page: String(f.page), perPage: "30" });
    if (f.q.trim()) qs.set("q", f.q.trim());
    try {
      setData(await apiFetch<ListResponse>(`/admin/customers?${qs}`));
    } catch (err) {
      toast(errorText(err), "erro");
    } finally {
      setLoading(false);
    }
  }, [apiFetch, f, toast]);
  useEffect(() => {
    const t = window.setTimeout(() => void load(), f.q ? 300 : 0);
    return () => window.clearTimeout(t);
  }, [load, f.q]);
  const setFilter = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch, page: patch.page ?? 1 }));

  return (
    <>
      <PageTitle>Clientes</PageTitle>
      <div className="mb-5 grid gap-3 md:grid-cols-[1fr_220px]">
        <input aria-label="Buscar cliente" placeholder="Buscar por nome, e-mail ou telefone" className="input h-11 bg-white" value={f.q} onChange={(e) => setFilter({ q: e.target.value })} />
        <select aria-label="Ordenar" className="input h-11 bg-white" value={f.sort} onChange={(e) => setFilter({ sort: e.target.value })}>
          <option value="recentes">Compra mais recente</option>
          <option value="gasto">Quem mais gastou</option>
          <option value="pedidos">Mais pedidos</option>
          <option value="nome">Nome (A–Z)</option>
        </select>
      </div>
      {loading && !data ? (
        <TableSkeleton rows={8} cols={5} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title={f.q ? "Ninguém encontrado" : "Nenhum cliente ainda"} text={f.q ? "Confira a busca." : "Quem criar conta ou comprar aparece aqui."} />
      ) : (
        <div className={cn("overflow-x-auto border border-linha bg-white transition-opacity", loading && "opacity-60")} aria-busy={loading}>
          <table className="w-full min-w-[760px] text-left text-[14px]">
            <thead className="border-b border-linha text-[12px] uppercase tracking-[0.08em] text-texto-2">
              <tr>
                <th className="px-4 py-3 font-normal">Cliente</th>
                <th className="px-3 font-normal">Conta</th>
                <th className="px-3 text-right font-normal">Pedidos</th>
                <th className="px-3 text-right font-normal">Total gasto</th>
                <th className="px-4 font-normal">Última compra</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((c) => (
                <tr key={c.email} className="border-b border-linha last:border-0 hover:bg-offwhite/60">
                  <td className="px-4 py-3">
                    <Link href={`/admin/clientes/ficha?email=${encodeURIComponent(c.email)}`} className="font-normal hover:underline">
                      {c.name ?? c.email}
                    </Link>
                    <span className="block text-[12px] text-texto-2">
                      {c.email}
                      {c.phone ? ` · ${c.phone}` : ""}
                    </span>
                  </td>
                  <td className="px-3 text-[13px]">{c.hasAccount ? "Com conta" : <span className="text-texto-2">Sem conta</span>}</td>
                  <td className="px-3 text-right tabular-nums">
                    {c.orders}
                    {c.orders > c.paidOrders && <span className="block text-[11px] text-texto-2">{c.paidOrders} pagos</span>}
                  </td>
                  <td className="px-3 text-right tabular-nums">{formatBRL(c.spentCents)}</td>
                  <td className="px-4 text-[13px] text-texto-2">{c.lastOrderAt ? fmt.format(new Date(c.lastOrderAt)) : "—"}</td>
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
