import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { ROLE_LABEL, adminUserInviteSchema, adminUserRoleSchema } from "@movalev/shared";
import { prisma } from "../../lib/prisma";
import { supabaseAdmin } from "../../lib/supabase";
import { audit } from "../../lib/audit";
import { createOrPromoteStaff, setRole, tempPassword } from "../../lib/adminUsers";

const id = z.string().uuid();

/**
 * Usuários do painel (só Admin): convidar, mudar papel, tirar acesso, gerar senha
 * provisória nova e redefinir o 2º fator (quem perdeu o celular).
 * Regras: ninguém mexe no próprio acesso por aqui e sempre sobra ao menos 1 Admin.
 */
export async function adminUserRoutes(app: FastifyInstance) {
  app.get("/admin/users", async () => {
    const staff = await prisma.profile.findMany({
      where: { role: { in: ["ADMIN", "EDITOR"] } },
      orderBy: [{ role: "asc" }, { email: "asc" }],
      select: { id: true, email: true, name: true, role: true, mustChangePassword: true, lastAdminLoginAt: true, createdAt: true },
    });
    const withMfa = await Promise.all(
      staff.map(async (u) => {
        const { data } = await supabaseAdmin().auth.admin.mfa.listFactors({ userId: u.id });
        return { ...u, mfa: (data?.factors ?? []).some((f) => f.factor_type === "totp" && f.status === "verified") };
      }),
    );
    return withMfa;
  });

  /** Convida (cria ou promove) e devolve a senha provisória UMA vez para repassar à pessoa. */
  app.post("/admin/users", async (req, reply) => {
    const input = adminUserInviteSchema.parse(req.body);
    const existing = await prisma.profile.findUnique({ where: { email: input.email }, select: { role: true } });
    if (existing && existing.role !== "CUSTOMER") return reply.code(409).send({ error: "ja_equipe", message: `Esse e-mail já é ${ROLE_LABEL[existing.role].toLowerCase()} do painel.` });
    const r = await createOrPromoteStaff(input.email, input.name || null, input.role);
    await audit(req, { action: "user.invite", entity: "usuario", entityId: r.id, summary: `${input.email} agora é ${ROLE_LABEL[input.role]} (${r.created ? "conta nova" : "conta existente promovida"})` });
    return reply.code(201).send({ id: r.id, email: input.email, tempPassword: r.password });
  });

  app.put<{ Params: { id: string } }>("/admin/users/:id/role", async (req, reply) => {
    const userId = id.parse(req.params.id);
    const { role } = adminUserRoleSchema.parse(req.body);
    const target = await guard(req, reply, userId);
    if (!target) return reply;
    if (target.role === "ADMIN" && role !== "ADMIN" && !(await anotherAdmin(userId))) return lastAdmin(reply);
    await setRole(userId, role);
    await audit(req, { action: "user.role", entity: "usuario", entityId: userId, summary: `${target.email}: ${ROLE_LABEL[target.role]} → ${ROLE_LABEL[role]}`, before: { role: target.role }, after: { role } });
    return { ok: true };
  });

  /** Tira o acesso ao painel (a pessoa continua como cliente da loja). Vale na hora para a API. */
  app.post<{ Params: { id: string } }>("/admin/users/:id/remove", async (req, reply) => {
    const userId = id.parse(req.params.id);
    const target = await guard(req, reply, userId);
    if (!target) return reply;
    if (target.role === "ADMIN" && !(await anotherAdmin(userId))) return lastAdmin(reply);
    await setRole(userId, "CUSTOMER");
    await audit(req, { action: "user.remove", entity: "usuario", entityId: userId, summary: `Tirou o acesso de ${target.email} ao painel`, before: { role: target.role }, after: { role: "CUSTOMER" } });
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>("/admin/users/:id/reset-password", async (req, reply) => {
    const userId = id.parse(req.params.id);
    const target = await guard(req, reply, userId);
    if (!target) return reply;
    const password = tempPassword();
    const { error } = await supabaseAdmin().auth.admin.updateUserById(userId, { password });
    if (error) throw error;
    await prisma.profile.update({ where: { id: userId }, data: { mustChangePassword: true } });
    await audit(req, { action: "user.password", entity: "usuario", entityId: userId, summary: `Gerou senha provisória para ${target.email}` });
    return { tempPassword: password };
  });

  /** Apaga os fatores do autenticador: no próximo login a pessoa cadastra de novo (QR code). */
  app.post<{ Params: { id: string } }>("/admin/users/:id/reset-mfa", async (req, reply) => {
    const userId = id.parse(req.params.id);
    const target = await guard(req, reply, userId);
    if (!target) return reply;
    const { data } = await supabaseAdmin().auth.admin.mfa.listFactors({ userId });
    for (const f of data?.factors ?? []) await supabaseAdmin().auth.admin.mfa.deleteFactor({ userId, id: f.id });
    await audit(req, { action: "user.mfa", entity: "usuario", entityId: userId, summary: `Redefiniu o 2º fator de ${target.email}` });
    return { ok: true, removed: data?.factors.length ?? 0 };
  });
}

/** Alvo precisa ser da equipe e não pode ser a própria pessoa. */
async function guard(req: FastifyRequest, reply: FastifyReply, userId: string) {
  if (userId === req.user!.id) {
    reply.code(422).send({ error: "proprio_usuario", message: "Você não pode alterar o próprio acesso por aqui. Peça a outro administrador." });
    return null;
  }
  const target = await prisma.profile.findUnique({ where: { id: userId }, select: { email: true, role: true } });
  if (!target || target.role === "CUSTOMER") {
    reply.code(404).send({ error: "nao_encontrado", message: "Usuário da equipe não encontrado." });
    return null;
  }
  return target as { email: string; role: "ADMIN" | "EDITOR" };
}

const anotherAdmin = async (exceptId: string) => (await prisma.profile.count({ where: { role: "ADMIN", id: { not: exceptId } } })) > 0;
const lastAdmin = (reply: FastifyReply) => reply.code(422).send({ error: "ultimo_admin", message: "É preciso ter ao menos um administrador." });
