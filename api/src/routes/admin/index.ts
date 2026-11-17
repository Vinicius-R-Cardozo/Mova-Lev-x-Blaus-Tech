import type { FastifyInstance } from "fastify";
import { requireAdmin } from "../../plugins/auth";
import { adminCatalogRoutes } from "./catalog";
import { adminOperationsRoutes } from "./operations";

/** Todas as rotas /admin/* exigem usuário com papel ADMIN. */
export async function adminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdmin);
  app.addHook("onSend", async (_req, reply) => {
    reply.header("Cache-Control", "no-store");
  });
  await app.register(adminCatalogRoutes);
  await app.register(adminOperationsRoutes);
}
