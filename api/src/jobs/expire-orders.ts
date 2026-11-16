/**
 * Job agendado (Render Cron Job, a cada 5 min): cancela pedidos "Aguardando pagamento"
 * vencidos e devolve o estoque reservado. Seguro com execuções simultâneas:
 * cada pedido só é liberado por quem conseguir o update condicional.
 *
 *   node dist/jobs/expire-orders.js
 */
import { releaseExpiredOrders } from "../lib/orders";
import { prisma } from "../lib/prisma";

try {
  const n = await releaseExpiredOrders();
  console.log(`[expire-orders] ${n} pedido(s) vencido(s) cancelado(s) e estoque devolvido.`);
} catch (err) {
  console.error("[expire-orders] falhou:", err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
