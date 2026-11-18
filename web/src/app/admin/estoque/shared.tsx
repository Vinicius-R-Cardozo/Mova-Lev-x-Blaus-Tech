"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { STOCK_MOVEMENT_LABEL, type StockMovementType } from "@movalev/shared";
import { EmptyState, Pagination, TableSkeleton, errorText, useFeedback } from "@/components/admin/feedback";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";

export function StockTabs({ active }: { active: "visao" | "movimentacoes" }) {
  return (
    <nav aria-label="Estoque" className="mb-6 flex gap-6 border-b border-linha">
      {[
        { k: "visao", href: "/admin/estoque", label: "Visão geral" },
        { k: "movimentacoes", href: "/admin/estoque/movimentacoes", label: "Movimentações" },
      ].map((t) => (
        <Link key={t.k} href={t.href} aria-current={active === t.k ? "page" : undefined} className={cn("label -mb-px inline-flex min-h-touch items-center border-b-2", active === t.k ? "border-preto" : "border-transparent text-texto-2 hover:text-preto")}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

type Movement = {
  id: string;
  type: StockMovementType;
  delta: number;
  stockAfter: number;
  note: string | null;
  actorEmail: string | null;
  createdAt: string;
  order: { id: string; number: number | null } | null;
  variant: { id: string; sku: string; size: string; color: string; productId: string; productName: string };
};
type Page = { total: number; page: number; perPage: number; items: Movement[] };

const fmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
export const TYPE_TONE: Record<StockMovementType, string> = {
  VENDA: "bg-bege text-texto-3",
  CANCELAMENTO: "bg-salvia text-oliva-escuro",
  ENTRADA: "bg-oliva/10 text-oliva-escuro",
  DEVOLUCAO: "bg-oliva/10 text-oliva-escuro",
  SAIDA: "bg-erro/10 text-erro",
  AJUSTE: "bg-areia/60 text-texto-3",
};

/** Histórico de movimentações (de uma variante, ou geral com filtros). */
export function MovementList({ variantId, type, from, to, compact }: { variantId?: string; type?: string; from?: string; to?: string; compact?: boolean }) {
  const { apiFetch } = useAuth();
  const { toast } = useFeedback();
  const [data, setData] = useState<Page | null>(null);
  const [page, setPage] = useState(1);

  const load = useCallback(
    async (p: number) => {
      const qs = new URLSearchParams({ page: String(p), perPage: compact ? "10" : "30" });
      if (variantId) qs.set("variantId", variantId);
      if (type) qs.set("type", type);
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      try {
        setData(await apiFetch<Page>(`/admin/stock/movements?${qs}`));
        setPage(p);
      } catch (err) {
        toast(errorText(err), "erro");
      }
    },
    [apiFetch, variantId, type, from, to, compact, toast],
  );
  useEffect(() => void load(1), [load]);

  if (!data) return <TableSkeleton rows={compact ? 3 : 8} cols={5} />;
  if (data.items.length === 0)
    return compact ? <p className="text-[14px] text-texto-2">Sem movimentações registradas ainda.</p> : <EmptyState title="Nenhuma movimentação" text="Vendas, cancelamentos e ajustes aparecem aqui." />;

  return (
    <>
      <div className="overflow-x-auto border border-linha bg-white">
        <table className="w-full min-w-[760px] text-[14px]">
          <thead className="border-b border-linha text-left text-[12px] uppercase tracking-[0.08em] text-texto-2">
            <tr>
              <th className="px-4 py-2.5 font-normal">Quando</th>
              {!variantId && <th className="px-3 font-normal">Variante</th>}
              <th className="px-3 font-normal">Tipo</th>
              <th className="px-3 text-right font-normal">Qtd.</th>
              <th className="px-3 text-right font-normal">Saldo</th>
              <th className="px-3 font-normal">Detalhe</th>
              <th className="px-4 font-normal">Quem</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((m) => (
              <tr key={m.id} className="border-b border-linha last:border-b-0">
                <td className="whitespace-nowrap px-4 py-2 text-[13px] tabular-nums text-texto-2">{fmt.format(new Date(m.createdAt))}</td>
                {!variantId && (
                  <td className="px-3">
                    <Link href={`/admin/produtos/${m.variant.productId}`} className="hover:underline">
                      {m.variant.productName}
                    </Link>
                    <span className="block text-[12px] text-texto-2">
                      {m.variant.color} · {m.variant.size} · <span className="font-mono">{m.variant.sku}</span>
                    </span>
                  </td>
                )}
                <td className="px-3">
                  <span className={cn("label-sm px-2 py-1 text-[10px]", TYPE_TONE[m.type])}>{STOCK_MOVEMENT_LABEL[m.type]}</span>
                </td>
                <td className={cn("px-3 text-right tabular-nums", m.delta > 0 ? "text-oliva-escuro" : "text-erro")}>
                  {m.delta > 0 ? "+" : ""}
                  {m.delta}
                </td>
                <td className="px-3 text-right tabular-nums">{m.stockAfter}</td>
                <td className="px-3 text-[13px]">
                  {m.order ? (
                    <Link href={`/admin/pedidos/${m.order.id}`} className="underline">
                      Pedido #{m.order.number}
                    </Link>
                  ) : null}
                  {m.note && <span className={cn("text-texto-3", m.order && "block text-[12px]")}>{m.order ? m.note.replace(/^Pedido #\d+:?\s*/, "") : m.note}</span>}
                </td>
                <td className="px-4 text-[12px] text-texto-2">{m.actorEmail?.replace(/^admin:/, "") ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} perPage={data.perPage} total={data.total} onPage={(p) => void load(p)} />
    </>
  );
}
