import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { releaseOrder } from "../lib/orders";
import { paymentProviders } from "../providers/payment";

/**
 * Webhook do gateway: POST /payments/webhook/:provider
 * O corpo chega CRU para o provider validar a assinatura. Idempotente: só move
 * "Aguardando pagamento" → "Pago" uma vez, mesmo que o gateway reenvie.
 */
export async function paymentRoutes(app: FastifyInstance) {
  app.register(async (scoped) => {
    scoped.addContentTypeParser("application/json", { parseAs: "string" }, (_req, body, done) => done(null, body));

    scoped.post<{ Params: { provider: string } }>("/payments/webhook/:provider", { config: { rateLimit: { max: 300, timeWindow: "1 minute" } } }, async (req, reply) => {
      const provider = paymentProviders[req.params.provider];
      if (!provider) return reply.code(404).send({ error: "nao_encontrado" });
      const result = await provider.processarWebhook(String(req.body ?? ""), req.headers);

      const order = await prisma.order.findFirst({ where: { paymentRef: result.ref, paymentProvider: provider.name } });
      if (!order) return reply.code(404).send({ error: "pedido_nao_encontrado" });

      if (result.status === "PAGO") {
        const moved = await prisma.order.updateMany({ where: { id: order.id, status: "AGUARDANDO_PAGAMENTO" }, data: { status: "PAGO" } });
        if (moved.count) await prisma.orderEvent.create({ data: { orderId: order.id, status: "PAGO", message: "Pagamento confirmado pelo gateway.", actor: provider.name } });
        return { ok: true, changed: moved.count > 0 };
      }
      if (result.status === "CANCELADO" || result.status === "EXPIRADO") {
        const released = await releaseOrder(order.id, `Pagamento ${result.status.toLowerCase()} no gateway. Estoque devolvido.`, provider.name);
        return { ok: true, changed: released };
      }
      return { ok: true, changed: false };
    });
  });
}
