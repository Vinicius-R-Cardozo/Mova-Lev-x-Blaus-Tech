import { formatBRL, installmentLabel } from "@movalev/shared";

export interface OrderEmailData {
  number: number;
  customerName: string;
  items: { productName: string; colorName: string; size: string; quantity: number; unitPriceCents: number }[];
  subtotalCents: number;
  progressivePercent: number;
  progressiveDiscountCents: number;
  couponCode: string | null;
  couponDiscountCents: number;
  shippingLabel: string;
  shippingCents: number;
  totalCents: number;
  paymentMethod: "PIX" | "CARTAO" | "BOLETO";
  /** Parcelas escolhidas (cartão). */
  installments: number;
  payableCents: number;
  orderUrl: string;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const PAY: Record<OrderEmailData["paymentMethod"], string> = { PIX: "Pix", CARTAO: "Cartão", BOLETO: "Boleto" };

export function orderConfirmationEmail(d: OrderEmailData) {
  const first = d.customerName.split(" ")[0] ?? d.customerName;
  const row = (label: string, value: string, color = "#1A1A1A") =>
    `<tr><td style="padding:4px 0;color:${color}">${label}</td><td style="padding:4px 0;text-align:right;color:${color}">${value}</td></tr>`;

  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F6F3EC;font-family:Montserrat,Helvetica,Arial,sans-serif;color:#1A1A1A">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F3EC"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF">
<tr><td style="background:#1A1A1A;color:#F6F3EC;text-align:center;padding:10px;font-size:11px;letter-spacing:.2em">FRETE GRÁTIS ACIMA DE R$ 299 · TROCA GRÁTIS EM 30 DIAS</td></tr>
<tr><td style="padding:32px 32px 8px;text-align:center;font-size:26px;letter-spacing:.18em">MOVA LEV</td></tr>
<tr><td style="padding:16px 32px 0">
<p style="font-size:11px;letter-spacing:.2em;color:#4C5A39;margin:0">PEDIDO #${d.number} · AGUARDANDO PAGAMENTO</p>
<h1 style="font-family:'Cormorant Garamond',Georgia,serif;font-weight:400;font-size:34px;line-height:1.1;margin:12px 0">${esc(first)}, recebemos o seu pedido.</h1>
<p style="font-size:15px;line-height:1.6;color:#3D3832;margin:0 0 20px">Ele já está sendo preparado aqui, com todo o cuidado. Assim que o pagamento for confirmado, avisamos você por e-mail.</p>
</td></tr>
<tr><td style="padding:0 32px"><table role="presentation" width="100%" style="border-top:1px solid #E7D6C6;font-size:15px">
${d.items.map((i) => `<tr><td style="padding:12px 0;border-bottom:1px solid #ECE6DD">${esc(i.productName)}<br><span style="color:#5E564D;font-size:13px">${esc(i.colorName)} · Tamanho ${esc(i.size)} · ${i.quantity}×</span></td><td style="padding:12px 0;border-bottom:1px solid #ECE6DD;text-align:right">${formatBRL(i.unitPriceCents * i.quantity)}</td></tr>`).join("")}
</table></td></tr>
<tr><td style="padding:16px 32px"><table role="presentation" width="100%" style="font-size:15px">
${row("Subtotal", formatBRL(d.subtotalCents))}
${d.progressiveDiscountCents ? row(`Desconto progressivo (${d.progressivePercent}%)`, formatBRL(-d.progressiveDiscountCents), "#4C5A39") : ""}
${d.couponDiscountCents ? row(`Cupom ${esc(d.couponCode ?? "")}`, formatBRL(-d.couponDiscountCents), "#4C5A39") : ""}
${row(`Frete · ${esc(d.shippingLabel)}`, d.shippingCents ? formatBRL(d.shippingCents) : "Grátis")}
<tr><td style="padding:12px 0 0;font-size:20px">Total</td><td style="padding:12px 0 0;font-size:20px;text-align:right">${formatBRL(d.totalCents)}</td></tr>
<tr><td colspan="2" style="padding:4px 0 0;font-size:13px;color:#5E564D">Pagamento: ${PAY[d.paymentMethod]} · ${d.paymentMethod === "PIX" ? `${formatBRL(d.payableCents)} no Pix` : d.paymentMethod === "CARTAO" ? installmentLabel(d.totalCents, d.installments) : formatBRL(d.payableCents)}</td></tr>
</table></td></tr>
<tr><td style="padding:8px 32px 24px"><a href="${d.orderUrl}" style="display:inline-block;background:#4C5A39;color:#F6F3EC;text-decoration:none;font-size:12px;letter-spacing:.2em;padding:16px 28px">VER MEU PEDIDO</a></td></tr>
<tr><td style="padding:0 32px 32px;font-size:15px;line-height:1.6;color:#3D3832">Obrigada por escolher a MOVA LEV. Que ela acompanhe cada movimento seu.</td></tr>
<tr><td style="padding:20px 32px;background:#ECE6DD;font-size:12px;color:#5E564D"><span style="font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-size:16px;color:#1A1A1A">Vista seu movimento. Viva seu leve.</span><br>Ficou alguma dúvida? É só responder este e-mail: estamos com você. © MOVA LEV</td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    `Pedido #${d.number} — aguardando pagamento`,
    `${first}, recebemos o seu pedido. Ele já está sendo preparado aqui, com todo o cuidado.`,
    ...d.items.map((i) => `- ${i.productName} (${i.colorName}, ${i.size}) ${i.quantity}× ${formatBRL(i.unitPriceCents * i.quantity)}`),
    `Total: ${formatBRL(d.totalCents)}`,
    `Acompanhe: ${d.orderUrl}`,
    "",
    "Obrigada por escolher a MOVA LEV. Que ela acompanhe cada movimento seu.",
    "Vista seu movimento. Viva seu leve.",
  ].join("\n");

  return { subject: `${first}, recebemos o seu pedido #${d.number} · MOVA LEV`, html, text };
}
