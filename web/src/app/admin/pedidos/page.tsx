"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, PAYMENT_METHODS, formatBRL, type OrderStatus } from "@movalev/shared";
import { useAuth } from "@/lib/auth";
import { API_URL } from "@/lib/site";
import { PageTitle, downloadCsv } from "@/components/admin/ui";
import { EmptyState, Pagination, TableSkeleton, errorText, useFeedback } from "@/components/admin/feedback";
import { OrderBadge, PAYMENT_LABEL } from "@/components/admin/orderStatus";
import { cn } from "@/lib/cn";

type Row = { id: string; number: number; status: OrderStatus; createdAt: string; customerName: string; email: string; totalCents: number; paymentMethod: string; shippingLabel: string; pieces: number; trackingCode: string | null; refundCents: number };
type ListResponse = { total: number; items: Row[]; pageSize: number; page: number };
const fmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

function Pedidos() {
  const params = useSearchParams();
  const { apiFetch, session } = useAuth();
  const { toast } = useFeedback();
  const [f, setF] = useState({ status: params.get("status") ?? "", pagamento: "", q: "", email: params.get("email") ?? "", de: "", ate: "", pagina: 1 });
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v !== "" && v !== null).map(([k, v]) => [k, String(v)])).toString();
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await apiFetch<ListResponse>(`/admin/orders?${qs}`));
    } catch (err) {
      toast(errorText(err), "erro");
    } finally {
      setLoading(false);
    }
  }, [apiFetch, qs, toast]);
  useEffect(() => {
    const t = window.setTimeout(() => void load(), f.q ? 300 : 0);
    return () => window.clearTimeout(t);
  }, [load, f.q]);

  const setFilter = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch, pagina: patch.pagina ?? 1 }));
  const exportCsv = () =>
    downloadCsv(
      async (path) => (await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${session!.access_token}` } })).text(),
      `/admin/orders.csv?${qs}`,
      `pedidos-movalev-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  const filtered = !!(f.status || f.pagamento || f.q || f.email || f.de || f.ate);

  return (
    <>
      <PageTitle actions={<button type="button" onClick={() => void exportCsv()} className="btn-secondary h-11 px-5">Exportar CSV</button>}>Pedidos</PageTitle>

      <div className="mb-3 flex flex-wrap gap-2 text-[14px]">
        {["", ...ORDER_STATUSES].map((s) => (
          <button key={s || "todos"} type="button" aria-pressed={f.status === s} onClick={() => setFilter({ status: s })} className={cn("h-9 border px-3", f.status === s ? "border-preto bg-preto text-offwhite" : "border-linha-forte bg-white hover:border-preto")}>
            {s ? ORDER_STATUS_LABEL[s as OrderStatus] : "Todos"}
          </button>
        ))}
      </div>
      <div className="mb-5 grid gap-3 md:grid-cols-[1fr_160px_160px_160px]">
        <input aria-label="Buscar pedido" placeholder="Nº do pedido, nome ou e-mail" className="input h-11 bg-white" value={f.q} onChange={(e) => setFilter({ q: e.target.value })} />
        <select aria-label="Pagamento" className="input h-11 bg-white" value={f.pagamento} onChange={(e) => setFilter({ pagamento: e.target.value })}>
          <option value="">Todo pagamento</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {PAYMENT_LABEL[m]}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-[14px] text-texto-2">
          De
          <input type="date" className="input h-11 bg-white" value={f.de} onChange={(e) => setFilter({ de: e.target.value })} />
        </label>
        <label className="flex items-center gap-2 text-[14px] text-texto-2">
          Até
          <input type="date" className="input h-11 bg-white" value={f.ate} onChange={(e) => setFilter({ ate: e.target.value })} />
        </label>
      </div>
      {f.email && (
        <p className="mb-4 text-[14px]">
          Pedidos de <strong className="font-normal">{f.email}</strong> ·{" "}
          <button type="button" className="underline" onClick={() => setFilter({ email: "" })}>
            ver todos
          </button>
        </p>
      )}

      {loading && !data ? (
        <TableSkeleton rows={8} cols={6} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title={filtered ? "Nenhum pedido com esses filtros" : "Nenhum pedido ainda"} text={filtered ? "Ajuste a busca ou os filtros." : "Os pedidos da loja aparecem aqui assim que forem feitos."} />
      ) : (
        <div className={cn("overflow-x-auto border border-linha bg-white transition-opacity", loading && "opacity-60")} aria-busy={loading}>
          <table className="w-full min-w-[860px] text-left text-[14px]">
            <thead className="border-b border-linha text-[12px] uppercase tracking-[0.08em] text-texto-2">
              <tr>
                <th className="px-4 py-3 font-normal">Pedido</th>
                <th className="px-3 font-normal">Data</th>
                <th className="px-3 font-normal">Cliente</th>
                <th className="px-3 font-normal">Peças</th>
                <th className="px-3 font-normal">Total</th>
                <th className="px-3 font-normal">Pagamento</th>
                <th className="px-4 font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((o) => (
                <tr key={o.id} className="border-b border-linha last:border-0 hover:bg-offwhite/60">
                  <td className="px-4 py-3">
                    <Link href={`/admin/pedidos/${o.id}`} className="font-normal underline-offset-4 hover:underline">
                      #{o.number}
                    </Link>
                  </td>
                  <td className="px-3 text-[13px] tabular-nums text-texto-2">{fmt.format(new Date(o.createdAt))}</td>
                  <td className="px-3">
                    {o.customerName}
                    <Link href={`/admin/clientes/ficha?email=${encodeURIComponent(o.email)}`} className="block text-[12px] text-texto-2 hover:underline">
                      {o.email}
                    </Link>
                  </td>
                  <td className="px-3 tabular-nums">{o.pieces}</td>
                  <td className="px-3 tabular-nums">
                    {formatBRL(o.totalCents)}
                    {o.refundCents > 0 && <span className="block text-[12px] text-erro">estorno {formatBRL(o.refundCents)}</span>}
                  </td>
                  <td className="px-3">{PAYMENT_LABEL[o.paymentMethod] ?? o.paymentMethod}</td>
                  <td className="px-4">
                    <OrderBadge status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={f.pagina} perPage={data.pageSize} total={data.total} onPage={(pagina) => setFilter({ pagina })} />}
    </>
  );
}

export default function PedidosAdminPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={8} cols={6} />}>
      <Pedidos />
    </Suspense>
  );
}
