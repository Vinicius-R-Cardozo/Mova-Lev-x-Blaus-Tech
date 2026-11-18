/**
 * Contrato de pagamento. Hoje: MockPaymentProvider (não cobra nada).
 * Para ligar o gateway real (Mercado Pago, Pagar.me, Asaas, Stripe…):
 *   1. crie XPaymentProvider implementando esta interface;
 *   2. troque a instância em ./index.ts;
 *   3. cadastre no gateway a URL do webhook: POST {API}/payments/webhook/{name};
 *   4. processarWebhook deve VALIDAR A ASSINATURA do gateway antes de confiar no corpo.
 * O pedido já nasce "Aguardando pagamento" com estoque reservado; o webhook só move para "Pago".
 */
export type PaymentMethodId = "PIX" | "CARTAO" | "BOLETO";
export type PaymentStatus = "PENDENTE" | "PAGO" | "CANCELADO" | "EXPIRADO";

export interface ChargeInput {
  orderId: string;
  orderNumber: number;
  method: PaymentMethodId;
  /** Valor a cobrar (no Pix já com os 5% off). */
  amountCents: number;
  installments: number;
  customer: { name: string; email: string; cpf?: string | null; phone?: string | null };
  expiresAt: Date;
}

export interface Charge {
  ref: string;
  status: PaymentStatus;
  /** Dados para a tela de pagamento (QR do Pix, linha do boleto, link do cartão…). */
  payload: Record<string, unknown>;
}

export interface WebhookResult {
  ref: string;
  status: PaymentStatus;
}

export interface RefundInput {
  /** Referência da cobrança no gateway. */
  ref: string | null;
  orderNumber: number;
  amountCents: number;
}
export type RefundResult = { ok: true; ref: string } | { ok: false; message: string };

export interface PaymentProvider {
  readonly name: string;
  criarCobranca(input: ChargeInput): Promise<Charge>;
  /** Estorno total ou parcial. Se o gateway não permitir, devolve ok: false com o motivo. */
  estornar(input: RefundInput): Promise<RefundResult>;
  consultarStatus(ref: string): Promise<PaymentStatus>;
  /** Recebe o corpo cru e os headers; lança erro se a assinatura for inválida. */
  processarWebhook(rawBody: string, headers: Record<string, string | string[] | undefined>): Promise<WebhookResult>;
}
