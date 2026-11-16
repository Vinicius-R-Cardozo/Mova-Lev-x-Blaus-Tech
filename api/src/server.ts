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
