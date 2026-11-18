"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatBRL, type OrderStatus } from "@movalev/shared";
import { useAuth } from "@/lib/auth";
import { Card, PageTitle } from "@/components/admin/ui";
import { errorText, useFeedback } from "@/components/admin/feedback";
import { OrderBadge } from "@/components/admin/orderStatus";
import { cn } from "@/lib/cn";

type Period = { orders: number; revenueCents: number; avgTicketCents: number; previous: { orders: number; revenueCents: number; avgTicketCents: number }; label: string; previousLabel: string };
type Dashboard = {
  periods: { today: Period; week: Period; month: Period };
  actions: { awaitingPayment: number; toShip: number; inTransit: number };
  series: { day: string; revenue: number; orders: number }[];
  bestSellers: { productId: string; name: string; pieces: number; revenue: number }[];
  stock: { threshold: number; soldOut: number; low: number; items: { id: string; sku: string; size: string; stock: number; color: string; productId: string; productName: string }[] };
  recent: { id: string; number: number; status: OrderStatus; customerName: string; totalCents: number; createdAt: string }[];
  subscribers: number;
};
const fmtDay = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
const fmtTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

/** Variação em % contra o período anterior (null quando não dá para comparar). */
function delta(now: number, before: number): number | null {
  if (before === 0) return now === 0 ? 0 : null;
  return Math.round(((now - before) / before) * 100);
}

export default function Dashboard() {
  const { apiFetch } = useAuth();
  const { toast } = useFeedback();
  const [d, setD] = useState<Dashboard | null>(null);
  const [period, setPeriod] = useState<"today" | "week" | "month">("month");

  useEffect(() => {
    apiFetch<Dashboard>("/admin/dashboard")
      .then(setD)
      .catch((err) => toast(errorText(err), "erro"));
  }, [apiFetch, toast]);

  if (!d)
    return (
      <>
        <PageTitle>Resumo</PageTitle>
        <div role="status" aria-label="Carregando" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="skeleton h-32" />
          ))}
          <div className="skeleton h-64 sm:col-span-2 xl:col-span-4" />
        </div>
      </>
    );

  const p = d.periods[period];
  const max = Math.max(1, ...d.series.map((s) => s.revenue));
  const noSales = d.series.every((s) => s.revenue === 0);

  return (
    <>
      <PageTitle
        actions={
          <div role="tablist" aria-label="Período" className="flex border border-linha-forte bg-white text-[14px]">
            {(["today", "week", "month"] as const).map((k) => (
              <button key={k} role="tab" type="button" aria-selected={period === k} onClick={() => setPeriod(k)} className={cn("h-10 px-4", period === k ? "bg-preto text-offwhite" : "hover:bg-bege")}>
                {d.periods[k].label}
              </button>
            ))}
          </div>
        }
      >
        Resumo
      </PageTitle>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Faturamento" value={formatBRL(p.revenueCents, { compact: true })} change={delta(p.revenueCents, p.previous.revenueCents)} hint={`vs. ${p.previousLabel}`} />
        <Metric label="Vendas pagas" value={String(p.orders)} change={delta(p.orders, p.previous.orders)} hint={`vs. ${p.previousLabel}`} />
        <Metric label="Ticket médio" value={p.orders ? formatBRL(p.avgTicketCents, { compact: true }) : "—"} change={p.orders && p.previous.orders ? delta(p.avgTicketCents, p.previous.avgTicketCents) : null} hint={`vs. ${p.previousLabel}`} />
        <div className="border border-linha bg-white p-5">
          <p className="label-sm text-texto-2">Pedem ação</p>
          <ul className="mt-3 space-y-1.5 text-[14px]">
            <ActionLine href="/admin/pedidos?status=AGUARDANDO_PAGAMENTO" label="Aguardando pagamento" n={d.actions.awaitingPayment} />
            <ActionLine href="/admin/pedidos?status=PAGO" label="Pagos para separar/enviar" n={d.actions.toShip} strong />
            <ActionLine href="/admin/pedidos?status=ENVIADO" label="Em trânsito" n={d.actions.inTransit} />
          </ul>
        </div>
      </div>

      <Card title="Faturamento · últimos 30 dias" className="mt-4">
        {noSales ? (
          <p className="py-10 text-center text-[14px] text-texto-2">Ainda sem vendas pagas nos últimos 30 dias. O gráfico aparece com as primeiras vendas.</p>
        ) : (
          <figure>
            <div className="flex h-44 items-end gap-[3px]" role="img" aria-label={`Faturamento diário dos últimos 30 dias; maior dia ${formatBRL(max, { compact: true })}`}>
              {d.series.map((s) => (
                <div key={s.day} className="group relative flex h-full flex-1 items-end">
                  <div className={cn("w-full origin-bottom transition-transform duration-slow ease-out", s.revenue ? "bg-oliva group-hover:bg-oliva-escuro" : "bg-linha")} style={{ height: `${Math.max(2, (s.revenue / max) * 100)}%` }} />
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap bg-preto px-2 py-1 text-[11px] text-offwhite group-hover:block">
                    {fmtDay.format(new Date(s.day))}: {formatBRL(s.revenue, { compact: true })} · {s.orders} {s.orders === 1 ? "venda" : "vendas"}
                  </span>
                </div>
              ))}
            </div>
            <figcaption className="mt-2 flex justify-between text-[12px] text-texto-2">
              <span>{fmtDay.format(new Date(d.series[0]!.day))}</span>
              <span>hoje</span>
            </figcaption>
          </figure>
        )}
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card title="Mais vendidos · 30 dias">
          {d.bestSellers.length === 0 ? (
            <p className="text-[14px] text-texto-2">Sem vendas no período.</p>
          ) : (
            <ol className="space-y-2.5 text-[14px]">
              {d.bestSellers.map((b, i) => (
                <li key={b.productId} className="flex items-baseline gap-3">
                  <span className="w-5 text-texto-2">{i + 1}</span>
                  <Link href={`/admin/produtos/${b.productId}`} className="min-w-0 flex-1 truncate hover:underline">
                    {b.name}
                  </Link>
                  <span className="tabular-nums text-texto-2">{b.pieces} pç</span>
                  <span className="w-24 text-right tabular-nums">{formatBRL(b.revenue, { compact: true })}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card title="Estoque" actions={<Link href="/admin/estoque?status=baixo" className="text-[14px] underline">Ver estoque</Link>}>
          <p className="mb-3 text-[14px]">
            <span className={cn("tabular-nums", d.stock.soldOut > 0 && "text-erro")}>{d.stock.soldOut} esgotadas</span> · <span className={cn("tabular-nums", d.stock.low > 0 && "text-[#8a5a12]")}>{d.stock.low} com até {d.stock.threshold} un.</span>
          </p>
          {d.stock.items.length === 0 ? (
            <p className="text-[14px] text-texto-2">Nada com estoque baixo.</p>
          ) : (
            <ul className="space-y-1.5 text-[13px]">
              {d.stock.items.map((v) => (
                <li key={v.id} className="flex items-baseline gap-2">
                  <Link href={`/admin/produtos/${v.productId}`} className="min-w-0 flex-1 truncate hover:underline">
                    {v.productName} · {v.color} · {v.size}
                  </Link>
                  <span className={cn("tabular-nums", v.stock === 0 ? "text-erro" : "text-[#8a5a12]")}>{v.stock === 0 ? "esgotado" : `${v.stock} un.`}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Últimos pedidos" actions={<Link href="/admin/pedidos" className="text-[14px] underline">Ver todos</Link>}>
          {d.recent.length === 0 ? (
            <p className="text-[14px] text-texto-2">Nenhum pedido ainda.</p>
          ) : (
            <ul className="space-y-2.5 text-[14px]">
              {d.recent.map((o) => (
                <li key={o.id} className="flex items-center gap-3">
                  <Link href={`/admin/pedidos/${o.id}`} className="hover:underline">
                    #{o.number}
                  </Link>
                  <span className="min-w-0 flex-1 truncate text-texto-2">
                    {o.customerName} · {fmtTime.format(new Date(o.createdAt))}
                  </span>
                  <OrderBadge status={o.status} />
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 border-t border-linha pt-3 text-[13px] text-texto-2">
            {d.subscribers} {d.subscribers === 1 ? "pessoa assina" : "pessoas assinam"} a newsletter ·{" "}
            <Link href="/admin/newsletter" className="underline">
              ver lista
            </Link>
          </p>
        </Card>
      </div>
    </>
  );
}

function Metric({ label, value, change, hint }: { label: string; value: string; change: number | null; hint: string }) {
  return (
    <div className="border border-linha bg-white p-5">
      <p className="label-sm text-texto-2">{label}</p>
      <p className="mt-2 whitespace-nowrap font-display text-[34px] leading-none tabular-nums">{value}</p>
      <p className="mt-2 text-[12px] text-texto-2">
        {change === null ? (
          "sem base para comparar"
        ) : (
          <>
            <span className={cn("tabular-nums", change > 0 ? "text-oliva-escuro" : change < 0 ? "text-erro" : "")}>
              {change > 0 ? "▲ " : change < 0 ? "▼ " : ""}
              {Math.abs(change)}%
            </span>{" "}
            {hint}
          </>
        )}
      </p>
    </div>
  );
}

function ActionLine({ href, label, n, strong }: { href: string; label: string; n: number; strong?: boolean }) {
  return (
    <li>
      <Link href={href} className="flex items-baseline justify-between gap-3 hover:underline">
        <span>{label}</span>
        <span className={cn("tabular-nums", strong && n > 0 && "font-normal text-oliva-escuro")}>{n}</span>
      </Link>
    </li>
  );
}
