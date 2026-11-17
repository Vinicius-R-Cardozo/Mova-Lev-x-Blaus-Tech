"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, formatBRL, type OrderStatus } from "@movalev/shared";
import { useAuth } from "@/lib/auth";
import { API_URL } from "@/lib/site";
import { Notice, PageTitle, downloadCsv } from "@/components/admin/ui";

type Row = { id: string; number: number; status: OrderStatus; createdAt: string; customerName: string; email: string; totalCents: number; paymentMethod: string; shippingLabel: string; pieces: number; trackingCode: string | null };

function Pedidos() {
  const params = useSearchParams();
  const { apiFetch, session } = useAuth();
  const [filters, setFilters] = useState({ status: params.get("status") ?? "", q: "", de: "", ate: "" });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; items: Row[]; pageSize: number } | null>(null);
  const [error, setError] = useState("");

  const qs = new URLSearchParams(Object.entries({ ...filters, pagina: String(page) }).filter(([, v]) => v) as [string, string][]).toString();
  useEffect(() => {
    const t = setTimeout(() => apiFetch<{ total: number; items: Row[]; pageSize: number }>(`/admin/orders?${qs}`).then(setData).catch(() => setError("Não foi possível carregar.")), 250);
    return () => clearTimeout(t);
  }, [apiFetch, qs]);

  const exportCsv = () =>
    downloadCsv(
      async (path) => (await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${session!.access_token}` } })).text(),
      `/admin/orders.csv?${qs}`,
      `pedidos-movalev-${new Date().toISOString().slice(0, 10)}.csv`,
    );

  const f = (k: keyof typeof filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setPage(1);
    setFilters({ ...filters, [k]: e.target.value });
  };

  return (
    <>
      <PageTitle actions={<button type="button" onClick={() => void exportCsv()} className="btn-secondary h-11 px-5">Exportar CSV</button>}>Pedidos</PageTitle>
      <div className="mb-4 flex flex-wrap items-end gap-3 text-[14px]">
        <label className="flex flex-col gap-1">Status
          <select value={filters.status} onChange={f("status")} className="h-10 border border-linha-forte bg-white px-2">
            <option value="">Todos</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">Busca
          <input value={filters.q} onChange={f("q")} placeholder="nº, nome ou e-mail" className="h-10 w-56 border border-linha-forte bg-white px-2" />
        </label>
        <label className="flex flex-col gap-1">De<input type="date" value={filters.de} onChange={f("de")} className="h-10 border border-linha-forte bg-white px-2" /></label>
        <label className="flex flex-col gap-1">Até<input type="date" value={filters.ate} onChange={f("ate")} className="h-10 border border-linha-forte bg-white px-2" /></label>
      </div>
      {error && <Notice kind="erro">{error}</Notice>}
      <div className="overflow-x-auto border border-linha bg-white">
        <table className="w-full min-w-[820px] text-left text-[14px]">
          <thead className="border-b border-linha bg-bege/50 text-[12px] uppercase tracking-[0.08em] text-texto-2">
            <tr><th className="p-3 font-normal">Pedido</th><th className="p-3 font-normal">Data</th><th className="p-3 font-normal">Cliente</th><th className="p-3 font-normal">Peças</th><th className="p-3 font-normal">Total</th><th className="p-3 font-normal">Pagamento</th><th className="p-3 font-normal">Status</th></tr>
          </thead>
          <tbody>
            {data?.items.map((o) => (
              <tr key={o.id} className="border-b border-linha last:border-0 hover:bg-bege/30">
                <td className="p-3"><Link href={`/admin/pedidos/${o.id}`} className="font-normal underline-offset-4 hover:underline">#{o.number}</Link></td>
                <td className="p-3">{new Date(o.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td>
                <td className="p-3">{o.customerName}<span className="block text-[12px] text-texto-2">{o.email}</span></td>
                <td className="p-3">{o.pieces}</td>
                <td className="p-3">{formatBRL(o.totalCents)}</td>
                <td className="p-3">{o.paymentMethod}</td>
                <td className="p-3">{ORDER_STATUS_LABEL[o.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.items.length === 0 && <p className="p-6 text-texto-2">Nenhum pedido com esses filtros.</p>}
        {!data && !error && <p className="p-6" role="status">Carregando…</p>}
      </div>
      {data && data.total > data.pageSize && (
        <div className="mt-4 flex items-center gap-4 text-[14px]">
          <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)} className="btn-secondary h-10 px-4 disabled:opacity-40">Anterior</button>
          <span>Página {page} de {Math.ceil(data.total / data.pageSize)}</span>
          <button type="button" disabled={page * data.pageSize >= data.total} onClick={() => setPage(page + 1)} className="btn-secondary h-10 px-4 disabled:opacity-40">Próxima</button>
        </div>
      )}
    </>
  );
}

export default function PedidosAdminPage() {
  return <Suspense fallback={<p>Carregando…</p>}><Pedidos /></Suspense>;
}
