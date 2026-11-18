import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { Charge, ChargeInput, PaymentProvider, PaymentStatus, RefundInput, RefundResult, WebhookResult } from "./PaymentProvider";

/**
 * Pagamento simulado: gera uma referência e dados ILUSTRATIVOS (sem valor real).
 * O webhook de teste aceita {ref, status} assinado com HMAC-SHA256 de MOCK_WEBHOOK_SECRET
 * no header x-mock-signature — o mesmo desenho que um gateway real usa.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";
  constructor(private readonly secret: string | undefined) {}

  async criarCobranca(input: ChargeInput): Promise<Charge> {
    const ref = `mock_${randomUUID()}`;
    const base = { simulado: true, valorCents: input.amountCents, venceEm: input.expiresAt.toISOString() };
    const payload =
      input.method === "PIX"
        ? { ...base, tipo: "pix", copiaECola: "PIX SIMULADO — nenhuma cobrança foi gerada", instrucoes: "Pagamento por Pix será ativado quando o gateway for conectado." }
        : input.method === "BOLETO"
          ? { ...base, tipo: "boleto", linhaDigitavel: "00000.00000 00000.000000 00000.000000 0 00000000000000", instrucoes: "Boleto simulado — sem valor de pagamento." }
          : { ...base, tipo: "cartao", parcelas: input.installments, instrucoes: "Cartão será cobrado quando o gateway for conectado." };
    return { ref, status: "PENDENTE", payload };
  }

  /** Simula o estorno (nada é devolvido de verdade no modo de teste). */
  async estornar(input: RefundInput): Promise<RefundResult> {
    return { ok: true, ref: `mock-estorno-${input.orderNumber}-${Date.now().toString(36)}` };
  }

  async consultarStatus(): Promise<PaymentStatus> {
    return "PENDENTE";
  }

  async processarWebhook(rawBody: string, headers: Record<string, string | string[] | undefined>): Promise<WebhookResult> {
    if (!this.secret) throw Object.assign(new Error("Webhook de teste desativado (MOCK_WEBHOOK_SECRET)."), { statusCode: 404 });
    const given = String(headers["x-mock-signature"] ?? "");
    const expected = createHmac("sha256", this.secret).update(rawBody).digest("hex");
    if (given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
      throw Object.assign(new Error("Assinatura inválida."), { statusCode: 401 });
    }
    const body = JSON.parse(rawBody) as { ref?: string; status?: PaymentStatus };
    if (!body.ref || !body.status) throw Object.assign(new Error("Corpo inválido."), { statusCode: 400 });
    return { ref: body.ref, status: body.status };
  }
}
