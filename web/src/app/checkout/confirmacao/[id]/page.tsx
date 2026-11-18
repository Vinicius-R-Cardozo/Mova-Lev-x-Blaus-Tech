import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ORDER_STATUS_LABEL, formatBRL, installmentLabel, type OrderDTO } from "@movalev/shared";
import { API_URL } from "@/lib/site";

export const metadata: Metadata = { title: "Pedido recebido", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> };

const PAY = { PIX: "Pix", CARTAO: "Cartão de crédito", BOLETO: "Boleto" } as const;

export default async function ConfirmationPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { t } = await searchParams;
  const res = await fetch(`${process.env.API_URL_INTERNAL ?? API_URL}/orders/${encodeURIComponent(id)}?t=${encodeURIComponent(t ?? "")}`, { cache: "no-store" });
  if (!res.ok) notFound();
  const o = (await res.json()) as OrderDTO;
  const firstName = o.customerName.split(" ")[0];
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "America/Sao_Paulo" })
      .formatToParts(new Date(o.expiresAt))
      .map((p) => [p.type, p.value]),
  );
  const until = `${parts.day}/${parts.month} às ${parts.hour}:${parts.minute}`;
  const pay = o.payment as { copiaECola?: string; linhaDigitavel?: string; instrucoes?: string } | null;

  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-24 pt-10 md:px-6 md:pt-16">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_506px]">
        <div>
          <p className="label text-oliva">
            Pedido #{o.number} · {ORDER_STATUS_LABEL[o.status]}
          </p>
          <h1 className="mt-4 text-[44px] leading-[1.04] md:text-h2">
            Pedido criado, <em>{firstName}.</em>
          </h1>
          <p className="mt-4 max-w-lg text-body-lg font-light text-texto-3">
            Enviamos a confirmação para <strong className="font-normal">{o.email}</strong>. Suas peças estão reservadas até {until}.
          </p>

          <section aria-labelledby="pag-titulo" className="mt-10 border border-linha-forte bg-white p-6 md:p-8">
            <h2 id="pag-titulo" className="font-display text-[30px]">
              Pagamento · {PAY[o.paymentMethod]}
            </h2>
            <p className="mt-2 text-[16px]">
              {o.paymentMethod === "CARTAO" ? `${o.installments}x de ${formatBRL(Math.round(o.totalCents / o.installments))} sem juros` : formatBRL(o.totalCents)}
            </p>
            {pay?.copiaECola && (
              <p className="mt-4 break-all bg-bege px-4 py-3 font-mono text-[13px]" aria-label="Pix copia e cola">
                {pay.copiaECola}
              </p>
            )}
            {pay?.linhaDigitavel && <p className="mt-4 break-all bg-bege px-4 py-3 font-mono text-[13px]">{pay.linhaDigitavel}</p>}
            <p className="mt-4 text-[14px] font-light text-texto-2">{pay?.instrucoes ?? "Instruções de pagamento enviadas por e-mail."}</p>
          </section>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/" className="btn-primary">
              Voltar à loja
            </Link>
            <Link href="/conta" className="btn-secondary">
              Acompanhar pedidos
            </Link>
          </div>
        </div>

        <section aria-labelledby="resumo-pedido" className="self-start bg-white px-5 py-7 shadow-resumo md:px-[30px] md:py-[34px]">
          <h2 id="resumo-pedido" className="text-[30px] leading-none md:text-[34px]">
            Resumo
          </h2>
          <ul className="mt-5">
            {o.items.map((i) => (
              <li key={i.sku + i.size} className="flex justify-between gap-4 border-b border-linha py-3 text-[15px]">
                <span>
                  {i.productName}
                  <span className="block text-[14px] font-light text-texto-2">
                    {i.colorName} · Tamanho {i.size} · {i.quantity}×
                  </span>
                </span>
                <span className="shrink-0">{formatBRL(i.unitPriceCents * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 text-[16px]">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{formatBRL(o.subtotalCents)}</dd>
            </div>
            {o.progressiveDiscountCents > 0 && (
              <div className="flex justify-between text-oliva">
                <dt>Desconto progressivo ({o.progressivePercent}%)</dt>
                <dd>{formatBRL(-o.progressiveDiscountCents)}</dd>
              </div>
            )}
            {o.couponDiscountCents > 0 && (
              <div className="flex justify-between text-oliva">
                <dt>Cupom {o.couponCode}</dt>
                <dd>{formatBRL(-o.couponDiscountCents)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt>Frete · {o.shippingLabel}</dt>
              <dd>{o.shippingCents ? formatBRL(o.shippingCents) : "Grátis"}</dd>
            </div>
            {o.pixDiscountCents > 0 && (
              <div className="flex justify-between text-oliva">
                <dt>Desconto no Pix</dt>
                <dd>{formatBRL(-o.pixDiscountCents)}</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between border-t border-linha pt-3 text-[24px] font-normal">
              <dt>Total</dt>
              <dd>{formatBRL(o.totalCents)}</dd>
            </div>
          </dl>
          {o.paymentMethod === "CARTAO" && <p className="mt-1 text-[14px] font-light text-texto-2">{installmentLabel(o.totalCents, o.installments)}</p>}
          {o.shippingAddress && !("retirada" in o.shippingAddress) && (
            <p className="mt-5 text-[14px] font-light text-texto-2">
              Entrega em {o.shippingAddress.street}, {o.shippingAddress.number}
              {o.shippingAddress.complement ? ` · ${o.shippingAddress.complement}` : ""} — {o.shippingAddress.city}/{o.shippingAddress.uf}
              {o.shippingDays ? ` · ${o.shippingDays} dias úteis após o pagamento` : ""}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
