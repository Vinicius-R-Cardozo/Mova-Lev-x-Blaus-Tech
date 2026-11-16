import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";

export async function healthRoutes(app: FastifyInstance) {
  // Health check do Render: responde rápido e confere o banco.
  app.get("/health", { config: { rateLimit: false } }, async (_req, reply) => {
    const started = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: "ok", db: "ok", latencyMs: Date.now() - started, uptimeS: Math.round(process.uptime()) };
    } catch {
      return reply.code(503).send({ status: "degraded", db: "erro" });
    }
  });
}
