"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ORDER_STATUS_LABEL, formatBRL, type OrderDTO, type OrderStatus } from "@movalev/shared";
import { useAuth } from "@/lib/auth";
import { Card, Input, Notice, PageTitle } from "@/components/admin/ui";
import { ArrowLeftIcon } from "@/components/ui/icons";

type AdminOrder = OrderDTO & {
  customerPhone: string | null;
  customerCpf: string | null;
  paymentRef: string | null;
  confirmationEmailSentAt: string | null;
  events: { id: string; message: string; actor: string | null; createdAt: string }[];
  allowedTransitions: OrderStatus[];
};

export default function PedidoAdminPage() {
  const { id } = useParams<{ id: string }>();
  const { apiFetch } = useAuth();
  const [o, setO] = useState<AdminOrder | null>(null);
  const [tracking, setTracking] = useState("");
  const [notice, setNotice] = useState<{ kind: "ok" | "erro"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const d = await apiFetch<AdminOrder>(`/admin/orders/${id}`);
    setO(d);
    setTracking(d.trackingCode ?? "");
  }, [apiFetch, id]);
  useEffect(() => void load().catch(() => setNotice({ kind: "erro", text: "Pedido não encontrado." })), [load]);

  async function act(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    setNotice(null);
    try {
      await fn();
      setNotice({ kind: "ok", text: ok });
      await load();
    } catch (err) {
      setNotice({ kind: "erro", text: err instanceof Error ? err.message : "Erro." });
    } finally {
      setBusy(false);
    }
  }

  const changeStatus = (status: OrderStatus) => {
    if (status === "CANCELADO" && !window.confirm("Cancelar o pedido? O estoque e o cupom serão devolvidos.")) return;
    void act(() => apiFetch(`/admin/orders/${id}/status`, { method: "POST", body: JSON.stringify({ status, ...(status === "ENVIADO" && tracking ? { trackingCode: tracking } : {}) }) }), `Status: ${ORDER_STATUS_LABEL[status]}.`);
  };

  if (!o) return notice ? <Notice kind="erro">{notice.text}</Notice> : <p role="status">Carregando…</p>;
  const addr = o.shippingAddress ?? {};

  return (
    <>
      <Link href="/admin/pedidos" className="mb-3 inline-flex min-h-touch items-center gap-2 text-[14px]"><ArrowLeftIcon /> Pedidos</Link>
      <PageTitle>Pedido #{o.number}</PageTitle>
      {notice && <div className="mb-4"><Notice kind={notice.kind}>{notice.text}</Notice></div>}
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card title={ORDER_STATUS_LABEL[o.status]}>
            <div className="flex flex-wrap gap-2">
              {o.allowedTransitions.map((s) => (
                <button key={s} type="button" disabled={busy} onClick={() => changeStatus(s)} className={s === "CANCELADO" ? "btn-secondary h-11 px-5 text-erro" : "btn-primary h-11 px-5"}>
                  {s === "CANCELADO" ? "Cancelar pedido" : `Marcar como ${ORDER_STATUS_LABEL[s].toLowerCase()}`}
                </button>
              ))}
              {o.allowedTransitions.length === 0 && <p className="text-[14px] text-texto-2">Pedido finalizado.</p>}
            </div>
            <div className="mt-5 flex flex-wrap items-end gap-3">
              <Input label="Código de rastreio" value={tracking} onChange={(e) => setTracking(e.target.value)} wrapClassName="w-64" />
              <button type="button" disabled={busy} onClick={() => void act(() => apiFetch(`/admin/orders/${id}/tracking`, { method: "PUT", body: JSON.stringify({ trackingCode: tracking }) }), "Rastreio salvo.")} className="btn-secondary h-11 px-5">Salvar rastreio</button>
            </div>
          </Card>
          <Card title="Itens">
            <ul>
              {o.items.map((i) => (
                <li key={i.sku} className="flex justify-between border-b border-linha py-2 text-[14px] last:border-0">
                  <span>{i.quantity}× {i.productName} · {i.colorName} · {i.size}<span className="block text-[12px] text-texto-2">{i.sku}</span></span>
                  <span>{formatBRL(i.unitPriceCents * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 text-[14px]">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatBRL(o.subtotalCents)}</dd></div>
              {o.progressiveDiscountCents > 0 && <div className="flex justify-between text-oliva"><dt>Progressivo ({o.progressivePercent}%)</dt><dd>{formatBRL(-o.progressiveDiscountCents)}</dd></div>}
              {o.couponDiscountCents > 0 && <div className="flex justify-between text-oliva"><dt>Cupom {o.couponCode}</dt><dd>{formatBRL(-o.couponDiscountCents)}</dd></div>}
              <div className="flex justify-between"><dt>Frete · {o.shippingLabel}</dt><dd>{o.shippingCents ? formatBRL(o.shippingCents) : "Grátis"}</dd></div>
              {o.pixDiscountCents > 0 && <div className="flex justify-between text-oliva"><dt>Pix 5%</dt><dd>{formatBRL(-o.pixDiscountCents)}</dd></div>}
              <div className="flex justify-between border-t border-linha pt-2 text-[18px]"><dt>Total</dt><dd>{formatBRL(o.totalCents)}</dd></div>
            </dl>
          </Card>
          <Card title="Histórico">
            <ol className="space-y-2 text-[14px]">
              {o.events.map((e) => (
                <li key={e.id}><span className="text-texto-2">{new Date(e.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span> · {e.message} <span className="text-[12px] text-texto-2">({e.actor})</span></li>
              ))}
            </ol>
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Cliente">
            <p className="text-[14px]">{o.customerName}<br />{o.email}<br />{o.customerPhone}{o.customerCpf && <><br />CPF {o.customerCpf}</>}</p>
          </Card>
          <Card title="Entrega">
            <p className="text-[14px]">{"retirada" in addr ? `Retirada: ${addr.retirada}` : `${addr.street}, ${addr.number}${addr.complement ? ` · ${addr.complement}` : ""} — ${addr.district}, ${addr.city}/${addr.uf} · CEP ${addr.cep}`}</p>
          </Card>
          <Card title="Pagamento">
            <p className="text-[14px]">{o.paymentMethod}{o.paymentMethod === "CARTAO" && ` · ${o.installments}x`}<br /><span className="text-texto-2">Ref.: {o.paymentRef ?? "—"}</span></p>
          </Card>
          <Card title="E-mail">
            <p className="text-[14px] text-texto-2">{o.confirmationEmailSentAt ? `Confirmação enviada em ${new Date(o.confirmationEmailSentAt).toLocaleString("pt-BR")}` : "Confirmação ainda não enviada."}</p>
            <button type="button" disabled={busy} onClick={() => void act(() => apiFetch(`/admin/orders/${id}/resend-email`, { method: "POST" }), "E-mail reenviado.")} className="btn-secondary mt-3 h-10 px-4">Reenviar e-mail</button>
          </Card>
        </div>
      </div>
    </>
  );
}
