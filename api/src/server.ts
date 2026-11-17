import { env } from "./env";
import { buildApp } from "./app";
import { prisma } from "./lib/prisma";

const app = await buildApp();

const shutdown = async (signal: string) => {
  app.log.info(`${signal} recebido, encerrando…`);
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

await app.listen({ port: env.PORT, host: env.HOST });

// Alternativa ao Cron Job do Render: EXPIRE_ORDERS_INTERVAL_MINUTES=5 roda a expiração na própria API.
// Seguro com várias instâncias: cada pedido só é liberado uma vez (update condicional).
// No plano Free a API hiberna; por isso também roda ao acordar, liberando o que venceu enquanto dormia.
const every = Number(process.env.EXPIRE_ORDERS_INTERVAL_MINUTES ?? 0);
if (every > 0) {
  const { releaseExpiredOrders } = await import("./lib/orders");
  const run = () =>
    releaseExpiredOrders()
      .then((n) => n && app.log.info(`[expire-orders] ${n} pedido(s) cancelado(s)`))
      .catch((err) => app.log.error({ err }, "[expire-orders] falhou"));
  void run();
  setInterval(run, every * 60_000).unref();
}
