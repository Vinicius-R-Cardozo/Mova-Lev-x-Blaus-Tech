import type { FastifyInstance } from "fastify";
import { requireAuth } from "../plugins/auth";
import { prisma } from "../lib/prisma";

export async function meRoutes(app: FastifyInstance) {
  /** Perfil da cliente logada (o JWT do Supabase é validado no preHandler). */
  app.get("/me", { preHandler: requireAuth }, async (req) => {
    const profile = await prisma.profile.findUniqueOrThrow({
      where: { id: req.user!.id },
      select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
    });
    return profile;
  });
}
