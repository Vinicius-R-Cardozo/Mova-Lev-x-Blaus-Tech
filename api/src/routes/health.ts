import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";

/** Commit publicado (o Render preenche RENDER_GIT_COMMIT): confirma qual versão está no ar. */
const COMMIT = (process.env.RENDER_GIT_COMMIT ?? "local").slice(0, 7);

export async function healthRoutes(app: FastifyInstance) {
  // Health check do Render: responde rápido e confere o banco.
  app.get("/health", { config: { rateLimit: false } }, async (_req, reply) => {
    const started = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: "ok", db: "ok", latencyMs: Date.now() - started, uptimeS: Math.round(process.uptime()), commit: COMMIT };
    } catch {
      return reply.code(503).send({ status: "degraded", db: "erro" });
    }
  });
}
