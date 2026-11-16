/**
 * Job agendado (Render Cron Job): cancela pedidos "Aguardando pagamento" vencidos
 * e devolve o estoque reservado. Implementação completa na fase 4 (checkout).
 */
import { prisma } from "../lib/prisma";

async function main() {
  const expired = await prisma.order.count({
    where: { status: "AGUARDANDO_PAGAMENTO", expiresAt: { lt: new Date() }, stockReleasedAt: null },
  });
  console.log(`[expire-orders] ${expired} pedido(s) vencido(s) — liberação implementada na fase 4.`);
  await prisma.$disconnect();
}

void main();
