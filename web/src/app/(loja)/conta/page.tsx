"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ORDER_STATUS_LABEL, formatBRL, type OrderSummaryDTO } from "@movalev/shared";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";

const TONE: Record<string, string> = {
  AGUARDANDO_PAGAMENTO: "bg-areia",
  PAGO: "bg-salvia",
  EM_SEPARACAO: "bg-salvia",
  ENVIADO: "bg-oliva text-offwhite",
  ENTREGUE: "bg-preto text-offwhite",
  CANCELADO: "bg-taupe-claro",
};

export default function PedidosPage() {
  const { apiFetch } = useAuth();
  const [orders, setOrders] = useState<OrderSummaryDTO[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    apiFetch<OrderSummaryDTO[]>("/me/orders").then(setOrders).catch(() => setError(true));
  }, [apiFetch]);

  return (
    <section aria-labelledby="pedidos-titulo">
      <h1 id="pedidos-titulo" className="text-h2-sm md:text-[56px]">
        Pedidos
      </h1>
      {error && <p className="mt-6 text-erro">Não foi possível carregar seus pedidos.</p>}
      {!orders && !error && <p className="mt-6" role="status">Carregando…</p>}
      {orders?.length === 0 && (
        <div className="mt-8">
          <p className="text-body font-light">Você ainda não fez pedidos.</p>
          <Link href="/colecao/novidades" className="btn-primary mt-6">
            Ver novidades
          </Link>
        </div>
      )}
      {orders && orders.length > 0 && (
        <ul className="mt-8 border-t border-linha">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/conta/pedidos/${o.id}`} className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-1 border-b border-linha py-5 hover:bg-bege/40 md:grid-cols-[120px_1fr_auto_auto] md:px-2">
                <span className="text-[17px] font-normal">#{o.number}</span>
                <span className="text-[14px] font-light text-texto-2 md:text-[15px]">
                  {new Date(o.createdAt).toLocaleDateString("pt-BR")} · {o.pieces} {o.pieces === 1 ? "peça" : "peças"}
                </span>
                <span className={cn("label-sm w-fit px-2.5 py-1.5 text-[10px]", TONE[o.status])}>{ORDER_STATUS_LABEL[o.status]}</span>
                <span className="text-[16px] font-normal md:text-right">{formatBRL(o.totalCents)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
