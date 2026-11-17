"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, formatBRL, type OrderStatus } from "@movalev/shared";
import { useAuth } from "@/lib/auth";
import { Card, PageTitle } from "@/components/admin/ui";

type Summary = { orders: Record<OrderStatus, number>; revenue30dCents: number; paidOrders30d: number; lowStockVariants: number; subscribers: number };

export default function AdminHome() {
  const { apiFetch } = useAuth();
  const [s, setS] = useState<Summary | null>(null);
  useEffect(() => void apiFetch<Summary>("/admin/summary").then(setS).catch(() => undefined), [apiFetch]);
  if (!s) return <p role="status">Carregando…</p>;
  return (
    <>
      <PageTitle>Resumo</PageTitle>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><p className="label-sm text-texto-2">Vendas pagas · 30 dias</p><p className="mt-2 text-[30px]">{formatBRL(s.revenue30dCents)}</p><p className="text-[14px] text-texto-2">{s.paidOrders30d} pedidos</p></Card>
        <Card><p className="label-sm text-texto-2">Variantes com estoque ≤ 2</p><p className="mt-2 text-[30px]">{s.lowStockVariants}</p><Link href="/admin/produtos" className="text-[14px] underline">Ver produtos</Link></Card>
        <Card><p className="label-sm text-texto-2">Assinantes da newsletter</p><p className="mt-2 text-[30px]">{s.subscribers}</p><Link href="/admin/newsletter" className="text-[14px] underline">Ver lista</Link></Card>
      </div>
      <Card title="Pedidos por status" className="mt-4">
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-6">
          {ORDER_STATUSES.map((st) => (
            <li key={st}>
              <Link href={`/admin/pedidos?status=${st}`} className="block border border-linha p-3 hover:border-preto">
                <span className="block text-[26px]">{s.orders[st]}</span>
                <span className="text-[13px] text-texto-2">{ORDER_STATUS_LABEL[st]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
