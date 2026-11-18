import type { FastifyInstance } from "fastify";
import { requireStaff } from "../../plugins/auth";
import { registerAdminIdempotency } from "../../lib/adminIdempotency";
import { adminCatalogRoutes } from "./catalog";
import { adminOperationsRoutes } from "./operations";
import { adminSystemRoutes } from "./system";
import { adminStockRoutes } from "./stock";

declare module "fastify" {
  interface FastifyContextConfig {
    /**
     * Quem pode usar a rota do painel. Padrão: só ADMIN (negar por padrão).
     * "staff" libera também para EDITOR (produtos, coleções, estoque e conteúdo).
     */
    allow?: "admin" | "staff";
  }
}

/**
 * Todas as rotas /admin/* exigem sessão da equipe com 2º fator e dentro do prazo
 * (requireStaff) e, salvo marcação explícita `allow: "staff"`, papel ADMIN.
 * A checagem é no servidor, em toda chamada, com o papel lido do banco.
 */
export async function adminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", async (req, reply) => {
    await requireStaff(req, reply);
    if (reply.sent) return;
    const allow = req.routeOptions.config.allow ?? "admin";
    if (allow === "admin" && req.user!.role !== "ADMIN") {
      return reply.code(403).send({ error: "proibido", message: "Esta área é só para administradores." });
    }
  });
  registerAdminIdempotency(app);
  app.addHook("onSend", async (_req, reply) => {
    reply.header("Cache-Control", "no-store");
  });
  await app.register(adminSystemRoutes);
  await app.register(adminCatalogRoutes);
  await app.register(adminStockRoutes);
  await app.register(adminOperationsRoutes);
}
