import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../lib/prisma";

const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(10).max(100).default(30),
});

export async function adminSystemRoutes(app: FastifyInstance) {
  /** Quem está no painel (papel e pendências do 1º acesso). */
  app.get("/admin/me", { config: { allow: "staff" } }, async (req) => {
    const u = req.user!;
    const p = await prisma.profile.findUniqueOrThrow({ where: { id: u.id }, select: { name: true, mustChangePassword: true } });
    return { id: u.id, email: u.email, name: p.name, role: u.role, mustChangePassword: p.mustChangePassword, sessionStartedAt: u.authTime };
  });

  /** Registro de atividades (só Admin), com filtros e paginação. */
  app.get("/admin/audit", async (req) => {
    const q = pageQuery
      .extend({
        q: z.string().trim().max(80).optional(),
        entity: z.string().trim().max(40).optional(),
        actor: z.string().trim().max(120).optional(),
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
      })
      .parse(req.query);
    const where: Prisma.AuditLogWhereInput = {
      ...(q.entity ? { entity: q.entity } : {}),
      ...(q.actor ? { actorEmail: { contains: q.actor, mode: "insensitive" } } : {}),
      ...(q.q ? { OR: [{ summary: { contains: q.q, mode: "insensitive" } }, { action: { contains: q.q, mode: "insensitive" } }, { entityId: q.q }] } : {}),
      ...(q.from || q.to ? { createdAt: { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) } } : {}),
    };
    const [total, items] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (q.page - 1) * q.perPage, take: q.perPage }),
    ]);
    const entities = await prisma.auditLog.findMany({ distinct: ["entity"], select: { entity: true }, orderBy: { entity: "asc" } });
    return { total, page: q.page, perPage: q.perPage, items, entities: entities.map((e) => e.entity) };
  });
}
