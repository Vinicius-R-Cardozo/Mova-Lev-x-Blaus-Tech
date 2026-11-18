"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { formatBRL, type OrderStatus } from "@movalev/shared";
import { Card, PageTitle } from "@/components/admin/ui";
import { EmptyState, errorText } from "@/components/admin/feedback";
import { OrderBadge, PAYMENT_LABEL } from "@/components/admin/orderStatus";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { useAuth } from "@/lib/auth";

type Address = { id: string; label: string | null; recipient: string | null; street: string; number: string; complement: string | null; district: string; city: string; uf: string; cep: string; isDefault: boolean };
type Ficha = {
  email: string;
  name: string | null;
  phone: string | null;
  cpf: string | null;
  hasAccount: boolean;
  isStaff: boolean;
  accountCreatedAt: string | null;
  addresses: Address[];
  metrics: { orders: number; paidOrders: number; spentCents: number; avgTicketCents: number; firstOrderAt: string | null; lastOrderAt: string | null };
  orders: { id: string; number: number; status: OrderStatus; createdAt: string; totalCents: number; refundCents: number; paymentMethod: string; pieces: number }[];
};
const fmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });
const fmtTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

function FichaCliente() {
  const email = useSearchParams().get("email") ?? "";
  const { apiFetch } = useAuth();
  const [c, setC] = useState<Ficha | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!email) return setError("Cliente não informado.");
    apiFetch<Ficha>(`/admin/customers/detail?email=${encodeURIComponent(email)}`)
      .then(setC)
      .catch((err) => setError(errorText(err)));
  }, [apiFetch, email]);

  if (error) return <EmptyState title="Cliente não encontrado" text={error} action={<Link href="/admin/clientes" className="btn-secondary h-11">Voltar</Link>} />;
  if (!c)
    return (
      <div role="status" aria-label="Carregando" className="space-y-4">
        <div className="skeleton h-12 w-72" />
        <div className="skeleton h-64" />
      </div>
    );

  const m = c.metrics;
  return (
    <>
      <Link href="/admin/clientes" className="mb-3 inline-flex min-h-touch items-center gap-2 text-[14px]">
        <ArrowLeftIcon /> Clientes
      </Link>
      <PageTitle>{c.name ?? c.email}</PageTitle>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Pedidos" value={String(m.orders)} hint={m.orders > m.paidOrders ? `${m.paidOrders} pagos` : undefined} />
        <Stat label="Total gasto" value={formatBRL(m.spentCents)} />
        <Stat label="Ticket médio" value={m.paidOrders ? formatBRL(m.avgTicketCents) : "—"} />
        <Stat label="Última compra" value={m.lastOrderAt ? fmt.format(new Date(m.lastOrderAt)) : "—"} hint={m.firstOrderAt ? `cliente desde ${fmt.format(new Date(m.firstOrderAt))}` : undefined} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card title="Pedidos">
          {c.orders.length === 0 ? (
            <p className="text-[14px] text-texto-2">Ainda não comprou.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-[14px]">
                <thead className="text-[12px] uppercase tracking-[0.08em] text-texto-2">
                  <tr>
                    <th className="py-2 font-normal">Pedido</th>
                    <th className="font-normal">Data</th>
                    <th className="font-normal">Peças</th>
                    <th className="font-normal">Total</th>
                    <th className="font-normal">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {c.orders.map((o) => (
                    <tr key={o.id} className="border-t border-linha">
                      <td className="py-2.5">
                        <Link href={`/admin/pedidos/${o.id}`} className="underline-offset-4 hover:underline">
                          #{o.number}
                        </Link>
                        <span className="block text-[12px] text-texto-2">{PAYMENT_LABEL[o.paymentMethod] ?? o.paymentMethod}</span>
                      </td>
                      <td className="text-[13px] tabular-nums text-texto-2">{fmtTime.format(new Date(o.createdAt))}</td>
                      <td className="tabular-nums">{o.pieces}</td>
                      <td className="tabular-nums">
                        {formatBRL(o.totalCents)}
                        {o.refundCents > 0 && <span className="block text-[12px] text-erro">estorno {formatBRL(o.refundCents)}</span>}
                      </td>
                      <td>
                        <OrderBadge status={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <div className="space-y-4">
          <Card title="Contato">
            <p className="text-[14px]">
              {c.email}
              {c.phone && (
                <>
                  <br />
                  {c.phone}
                </>
              )}
              {c.cpf && (
                <>
                  <br />
                  CPF {c.cpf}
                </>
              )}
            </p>
            <p className="mt-3 text-[13px] text-texto-2">
              {c.hasAccount ? `Conta criada em ${fmt.format(new Date(c.accountCreatedAt!))}` : "Comprou sem criar conta."}
              {c.isStaff && " · Faz parte da equipe."}
            </p>
          </Card>
          {c.addresses.length > 0 && (
            <Card title="Endereços">
              <ul className="space-y-3 text-[14px]">
                {c.addresses.map((a) => (
                  <li key={a.id}>
                    {a.label && <span className="label-sm block text-texto-2">{a.label}{a.isDefault ? " · padrão" : ""}</span>}
                    {a.street}, {a.number}
                    {a.complement ? ` · ${a.complement}` : ""} — {a.district}, {a.city}/{a.uf} · CEP {a.cep}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border border-linha bg-white p-5">
      <p className="label-sm text-texto-2">{label}</p>
      <p className="mt-2 whitespace-nowrap font-display text-[28px] leading-none tabular-nums">{value}</p>
      {hint && <p className="mt-1.5 text-[12px] text-texto-2">{hint}</p>}
    </div>
  );
}

export default function FichaClientePage() {
  return (
    <Suspense fallback={null}>
      <FichaCliente />
    </Suspense>
  );
}
