"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ORDER_STATUS_LABEL, formatBRL, type OrderDTO } from "@movalev/shared";
import { useAuth } from "@/lib/auth";
import { ArrowLeftIcon } from "@/components/ui/icons";

const STEPS = ["AGUARDANDO_PAGAMENTO", "PAGO", "EM_SEPARACAO", "ENVIADO", "ENTREGUE"] as const;

export default function PedidoPage() {
  const { id } = useParams<{ id: string }>();
  const { apiFetch } = useAuth();
  const [o, setO] = useState<OrderDTO | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    apiFetch<OrderDTO>(`/orders/${id}`).then(setO).catch(() => setError(true));
  }, [apiFetch, id]);

  if (error) return <p className="text-erro">Pedido não encontrado.</p>;
  if (!o) return <p role="status">Carregando…</p>;
  const current = STEPS.indexOf(o.status as (typeof STEPS)[number]);

  return (
    <article>
      <Link href="/conta" className="inline-flex min-h-touch items-center gap-2 text-[15px]">
        <ArrowLeftIcon /> Meus pedidos
      </Link>
      <h1 className="mt-3 text-h2-sm">Pedido #{o.number}</h1>
      <p className="mt-2 text-body font-light text-texto-2">Feito em {new Date(o.createdAt).toLocaleDateString("pt-BR")}</p>

      {o.status === "CANCELADO" ? (
        <p className="mt-6 bg-taupe-claro/50 px-4 py-3 text-[15px]">Pedido cancelado.</p>
      ) : (
        <ol className="mt-8 grid grid-cols-5 gap-1.5" aria-label="Andamento do pedido">
          {STEPS.map((s, i) => (
            <li key={s} aria-current={i === current ? "step" : undefined}>
              <span aria-hidden className={`block h-[3px] ${i <= current ? "bg-oliva" : "bg-linha-forte"}`} />
              <span className={`mt-2 block text-[12px] md:text-[13px] ${i === current ? "font-medium" : "font-light text-texto-2"}`}>{ORDER_STATUS_LABEL[s]}</span>
            </li>
          ))}
        </ol>
      )}
      {o.trackingCode && (
        <p className="mt-6 text-[15px]">
          Código de rastreio: <strong className="font-medium">{o.trackingCode}</strong>
        </p>
      )}

      <ul className="mt-8 border-t border-linha">
        {o.items.map((i) => (
          <li key={i.sku} className="flex justify-between gap-4 border-b border-linha py-4 text-[15px]">
            <span>
              {i.productName}
              <span className="block text-[14px] font-light text-texto-2">
                {i.colorName} · Tamanho {i.size} · {i.quantity}×
              </span>
            </span>
            <span>{formatBRL(i.unitPriceCents * i.quantity)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-4 max-w-sm space-y-1.5 text-[15px] md:ml-auto">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatBRL(o.subtotalCents)}</dd></div>
        {o.progressiveDiscountCents > 0 && <div className="flex justify-between text-oliva"><dt>Desconto progressivo ({o.progressivePercent}%)</dt><dd>{formatBRL(-o.progressiveDiscountCents)}</dd></div>}
        {o.couponDiscountCents > 0 && <div className="flex justify-between text-oliva"><dt>Cupom {o.couponCode}</dt><dd>{formatBRL(-o.couponDiscountCents)}</dd></div>}
        <div className="flex justify-between"><dt>Frete · {o.shippingLabel}</dt><dd>{o.shippingCents ? formatBRL(o.shippingCents) : "Grátis"}</dd></div>
        {o.pixDiscountCents > 0 && <div className="flex justify-between text-oliva"><dt>Desconto no Pix</dt><dd>{formatBRL(-o.pixDiscountCents)}</dd></div>}
        <div className="flex justify-between border-t border-linha pt-2 text-[20px]"><dt>Total</dt><dd>{formatBRL(o.totalCents)}</dd></div>
      </dl>
    </article>
  );
}
