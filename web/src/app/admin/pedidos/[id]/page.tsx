"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ORDER_STATUS_LABEL, adminRefundSchema, formatBRL, type OrderDTO, type OrderStatus } from "@movalev/shared";
import { useAuth } from "@/lib/auth";
import { Card, Input, MoneyInput, PageTitle } from "@/components/admin/ui";
import { errorText, useFeedback } from "@/components/admin/feedback";
import { OrderBadge, PAYMENT_LABEL } from "@/components/admin/orderStatus";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

type AdminOrder = OrderDTO & {
  customerPhone: string | null;
  customerCpf: string | null;
  paymentRef: string | null;
  paymentProvider: string;
  profileId: string | null;
  cancelReason: string | null;
  refundedAt: string | null;
  refundCents: number;
  refundRef: string | null;
  canRefund: boolean;
  confirmationEmailSentAt: string | null;
  events: { id: string; message: string; actor: string | null; createdAt: string }[];
  allowedTransitions: OrderStatus[];
};
const fmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export default function PedidoAdminPage() {
  const { id } = useParams<{ id: string }>();
  const { apiFetch } = useAuth();
  const { toast, confirm } = useFeedback();
  const [o, setO] = useState<AdminOrder | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tracking, setTracking] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<null | "cancelar" | "estornar">(null);

  const load = useCallback(async () => {
    const d = await apiFetch<AdminOrder>(`/admin/orders/${id}`);
    setO(d);
    setTracking(d.trackingCode ?? "");
  }, [apiFetch, id]);
  useEffect(() => void load().catch(() => setNotFound(true)), [load]);

  async function act(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try {
      await fn();
      toast(ok);
      await load();
      return true;
    } catch (err) {
      toast(errorText(err), "erro");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(status: OrderStatus) {
    if (status === "CANCELADO") return setDialog("cancelar");
    if (status === "ENVIADO" && !tracking.trim() && !(await confirm({ title: "Enviar sem rastreio?", text: "A cliente não terá o código para acompanhar a entrega. Você pode adicionar depois.", confirm: "Marcar como enviado" }))) return;
    void act(() => apiFetch(`/admin/orders/${id}/status`, { method: "POST", body: JSON.stringify({ status, ...(status === "ENVIADO" && tracking.trim() ? { trackingCode: tracking.trim() } : {}) }) }), `Pedido agora está “${ORDER_STATUS_LABEL[status]}”.`);
  }

  if (notFound) return <p className="text-erro">Pedido não encontrado.</p>;
  if (!o)
    return (
      <div role="status" aria-label="Carregando" className="space-y-4">
        <div className="skeleton h-12 w-64" />
        <div className="skeleton h-80" />
      </div>
    );
  const addr = (o.shippingAddress ?? {}) as Record<string, string>;
  const shipped = o.status === "ENVIADO" || o.status === "ENTREGUE";

  return (
    <>
      <Link href="/admin/pedidos" className="mb-3 inline-flex min-h-touch items-center gap-2 text-[14px]">
        <ArrowLeftIcon /> Pedidos
      </Link>
      <PageTitle actions={<OrderBadge status={o.status} className="text-[12px]" />}>Pedido #{o.number}</PageTitle>
      {o.cancelReason && <p className="mb-4 border-l-2 border-taupe bg-white px-4 py-3 text-[14px]">Motivo do cancelamento: {o.cancelReason}</p>}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card title="Andamento">
            <div className="flex flex-wrap gap-2">
              {o.allowedTransitions
                .filter((s) => s !== "CANCELADO")
                .map((s) => (
                  <button key={s} type="button" disabled={busy} onClick={() => void changeStatus(s)} className="btn-primary h-11 px-5">
                    Marcar como {ORDER_STATUS_LABEL[s].toLowerCase()}
                  </button>
                ))}
              {o.allowedTransitions.includes("CANCELADO") && (
                <button type="button" disabled={busy} onClick={() => setDialog("cancelar")} className="btn-secondary h-11 px-5 text-erro">
                  Cancelar pedido
                </button>
              )}
              {o.canRefund && (
                <button type="button" disabled={busy} onClick={() => setDialog("estornar")} className="btn-secondary h-11 px-5">
                  Estornar
                </button>
              )}
              {o.allowedTransitions.length === 0 && !o.canRefund && <p className="text-[14px] text-texto-2">Pedido finalizado.</p>}
            </div>
            <div className="mt-5 flex flex-wrap items-end gap-3">
              <Input label="Código de rastreio" value={tracking} onChange={(e) => setTracking(e.target.value)} wrapClassName="w-64" />
              <button type="button" disabled={busy} onClick={() => void act(() => apiFetch(`/admin/orders/${id}/tracking`, { method: "PUT", body: JSON.stringify({ trackingCode: tracking.trim() }) }), "Rastreio salvo.")} className="btn-secondary h-11 px-5">
                Salvar rastreio
              </button>
            </div>
          </Card>

          <Card title="Itens">
            <ul>
              {o.items.map((i) => (
                <li key={i.sku} className="flex justify-between gap-4 border-b border-linha py-2 text-[14px] last:border-0">
                  <span>
                    {i.quantity}× {i.productName} · {i.colorName} · {i.size}
                    <span className="block font-mono text-[12px] text-texto-2">{i.sku}</span>
                  </span>
                  <span className="tabular-nums">{formatBRL(i.unitPriceCents * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 text-[14px]">
              <Line label="Subtotal" value={formatBRL(o.subtotalCents)} />
              {o.progressiveDiscountCents > 0 && <Line label={`Progressivo (${o.progressivePercent}%)`} value={formatBRL(-o.progressiveDiscountCents)} tone="oliva" />}
              {o.couponDiscountCents > 0 && <Line label={`Cupom ${o.couponCode}`} value={formatBRL(-o.couponDiscountCents)} tone="oliva" />}
              <Line label={`Frete · ${o.shippingLabel}`} value={o.shippingCents ? formatBRL(o.shippingCents) : "Grátis"} />
              {o.pixDiscountCents > 0 && <Line label="Pix 5%" value={formatBRL(-o.pixDiscountCents)} tone="oliva" />}
              <div className="flex justify-between border-t border-linha pt-2 text-[18px]">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatBRL(o.totalCents)}</dd>
              </div>
              {o.refundCents > 0 && <Line label="Estornado" value={formatBRL(-o.refundCents)} tone="erro" />}
            </dl>
          </Card>

          <Card title="Histórico">
            <ol className="space-y-2.5 text-[14px]">
              {o.events.map((e) => (
                <li key={e.id} className="grid gap-1 sm:grid-cols-[130px_1fr]">
                  <span className="text-[13px] tabular-nums text-texto-2">{fmt.format(new Date(e.createdAt))}</span>
                  <span>
                    {e.message} <span className="text-[12px] text-texto-2">({e.actor?.replace(/^admin:/, "") ?? "sistema"})</span>
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Cliente">
            <p className="text-[14px]">
              {o.customerName}
              <br />
              {o.email}
              {o.customerPhone && (
                <>
                  <br />
                  {o.customerPhone}
                </>
              )}
              {o.customerCpf && (
                <>
                  <br />
                  CPF {o.customerCpf}
                </>
              )}
            </p>
            <Link href={`/admin/clientes/ficha?email=${encodeURIComponent(o.email)}`} className="mt-3 inline-block text-[14px] underline">
              Ver ficha e outros pedidos
            </Link>
          </Card>
          <Card title="Entrega">
            <p className="text-[14px]">{"retirada" in addr ? `Retirada: ${addr.retirada}` : `${addr.street}, ${addr.number}${addr.complement ? ` · ${addr.complement}` : ""} — ${addr.district}, ${addr.city}/${addr.uf} · CEP ${addr.cep}`}</p>
          </Card>
          <Card title="Pagamento">
            <p className="text-[14px]">
              {PAYMENT_LABEL[o.paymentMethod] ?? o.paymentMethod}
              {o.paymentMethod === "CARTAO" && ` · ${o.installments}x`}
              <br />
              <span className="text-texto-2">
                {o.paymentProvider === "mock" ? "Modo de teste (sem cobrança real)" : o.paymentProvider} · Ref.: {o.paymentRef ?? "—"}
              </span>
            </p>
            {o.refundedAt && (
              <p className="mt-3 border-t border-linha pt-3 text-[14px] text-erro">
                Estorno de {formatBRL(o.refundCents)} em {fmt.format(new Date(o.refundedAt))}
                <span className="block text-[12px] text-texto-2">Ref.: {o.refundRef}</span>
              </p>
            )}
          </Card>
          <Card title="E-mail">
            <p className="text-[14px] text-texto-2">{o.confirmationEmailSentAt ? `Confirmação enviada em ${fmt.format(new Date(o.confirmationEmailSentAt))}` : "Confirmação ainda não enviada."}</p>
            <button type="button" disabled={busy} onClick={() => void act(() => apiFetch(`/admin/orders/${id}/resend-email`, { method: "POST" }), "E-mail reenviado.")} className="btn-secondary mt-3 h-10 px-4">
              Reenviar e-mail
            </button>
          </Card>
        </div>
      </div>

      {dialog === "cancelar" && (
        <ReasonDialog
          title={`Cancelar o pedido #${o.number}?`}
          text={o.status === "AGUARDANDO_PAGAMENTO" ? "O estoque e o cupom voltam na hora." : "O estoque e o cupom voltam na hora. Pedido já pago: use “Estornar” para devolver o dinheiro e cancelar de uma vez."}
          confirmLabel="Cancelar pedido"
          danger
          onClose={() => setDialog(null)}
          onConfirm={async (reason) => {
            const ok = await act(() => apiFetch(`/admin/orders/${id}/status`, { method: "POST", body: JSON.stringify({ status: "CANCELADO", reason }) }), "Pedido cancelado. Estoque devolvido.");
            if (ok) setDialog(null);
          }}
        />
      )}
      {dialog === "estornar" && (
        <RefundDialog
          order={o}
          shipped={shipped}
          onClose={() => setDialog(null)}
          onConfirm={async (body) => {
            const ok = await act(() => apiFetch(`/admin/orders/${id}/refund`, { method: "POST", body: JSON.stringify(body) }), "Estorno registrado.");
            if (ok) setDialog(null);
          }}
        />
      )}
    </>
  );
}

function Line({ label, value, tone }: { label: string; value: string; tone?: "oliva" | "erro" }) {
  return (
    <div className={cn("flex justify-between", tone === "oliva" && "text-oliva", tone === "erro" && "text-erro")}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function useModal() {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => ref.current?.showModal(), []);
  return ref;
}

function ReasonDialog({ title, text, confirmLabel, danger, onClose, onConfirm }: { title: string; text: string; confirmLabel: string; danger?: boolean; onClose: () => void; onConfirm: (reason: string) => Promise<void> }) {
  const ref = useModal();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <dialog ref={ref} onCancel={(e) => (e.preventDefault(), onClose())} aria-labelledby="dlg-titulo" className="w-[min(480px,calc(100vw-2rem))] bg-offwhite p-0 text-texto backdrop:bg-preto/50">
      <form
        className="p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          if (reason.trim().length < 3) return setError("Informe o motivo (fica no pedido e no registro de atividades).");
          setBusy(true);
          await onConfirm(reason.trim());
          setBusy(false);
        }}
      >
        <h2 id="dlg-titulo" className="font-display text-[28px] leading-tight">
          {title}
        </h2>
        <p className="mt-2 text-[14px] font-light text-texto-3">{text}</p>
        <label htmlFor="motivo" className="mb-1.5 mt-5 block text-[13px] text-texto-2">
          Motivo
        </label>
        <input id="motivo" className={cn("input h-12 bg-white", error && "border-erro")} maxLength={200} placeholder="Ex.: cliente desistiu, pagamento não confirmado…" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
        {error && <p className="mt-1 text-[12px] text-erro">{error}</p>}
        <div className="mt-7 flex justify-end gap-3">
          <button type="button" className="btn-secondary h-11 px-6" onClick={onClose}>
            Voltar
          </button>
          <button type="submit" disabled={busy} className={cn("btn h-11 px-6 text-offwhite", danger ? "bg-erro hover:bg-[#7f2619]" : "bg-oliva hover:bg-oliva-escuro")}>
            {busy ? "Aguarde…" : confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}

function RefundDialog({ order, shipped, onClose, onConfirm }: { order: AdminOrder; shipped: boolean; onClose: () => void; onConfirm: (body: { amountCents?: number; reason: string; restock: boolean }) => Promise<void> }) {
  const ref = useModal();
  const [amount, setAmount] = useState<number | null>(order.totalCents);
  const [reason, setReason] = useState("");
  const [restock, setRestock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  return (
    <dialog ref={ref} onCancel={(e) => (e.preventDefault(), onClose())} aria-labelledby="estorno-titulo" className="w-[min(500px,calc(100vw-2rem))] bg-offwhite p-0 text-texto backdrop:bg-preto/50">
      <form
        className="p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          const body = { amountCents: amount && amount !== order.totalCents ? amount : undefined, reason: reason.trim(), restock: shipped ? restock : false };
          const parsed = adminRefundSchema.safeParse(body);
          const errs: Record<string, string> = {};
          if (!parsed.success) for (const i of parsed.error.issues) errs[String(i.path[0])] = i.message;
          if (!amount || amount <= 0) errs.amountCents = "Informe o valor";
          else if (amount > order.totalCents) errs.amountCents = `Máximo ${formatBRL(order.totalCents)}`;
          setErrors(errs);
          if (Object.keys(errs).length) return;
          setBusy(true);
          await onConfirm(body);
          setBusy(false);
        }}
      >
        <h2 id="estorno-titulo" className="font-display text-[28px] leading-tight">
          Estornar pedido #{order.number}
        </h2>
        <p className="mt-2 text-[14px] font-light text-texto-3">
          {shipped ? "Devolução: o valor volta para a cliente pelo mesmo meio de pagamento. O pedido continua como " + ORDER_STATUS_LABEL[order.status].toLowerCase() + "." : "O valor volta para a cliente e o pedido é cancelado (estoque devolvido)."} O estorno só pode ser feito uma vez.
        </p>
        <div className="mt-5 grid gap-4">
          <div>
            <MoneyInput label={`Valor (total ${formatBRL(order.totalCents)})`} cents={amount} error={errors.amountCents} onChange={setAmount} />
          </div>
          <div>
            <label htmlFor="motivo-estorno" className="mb-1.5 block text-[13px] text-texto-2">
              Motivo
            </label>
            <input id="motivo-estorno" className={cn("input h-12 bg-white", errors.reason && "border-erro")} maxLength={200} placeholder="Ex.: troca não disponível, peça com defeito" value={reason} onChange={(e) => setReason(e.target.value)} />
            {errors.reason && <p className="mt-1 text-[12px] text-erro">{errors.reason}</p>}
          </div>
          {shipped && (
            <label className="flex items-start gap-3 text-[14px]">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-oliva" checked={restock} onChange={(e) => setRestock(e.target.checked)} />
              <span>
                Devolver as peças ao estoque
                <span className="block text-[12px] text-texto-2">Marque se as peças voltaram e estão boas para venda.</span>
              </span>
            </label>
          )}
          {order.paymentProvider === "mock" && <p className="text-[12px] text-texto-2">Modo de teste: nenhum dinheiro é movimentado.</p>}
        </div>
        <div className="mt-7 flex justify-end gap-3">
          <button type="button" className="btn-secondary h-11 px-6" onClick={onClose}>
            Voltar
          </button>
          <button type="submit" disabled={busy} className="btn h-11 bg-erro px-6 text-offwhite hover:bg-[#7f2619]">
            {busy ? "Estornando…" : "Confirmar estorno"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
