import type { FastifyInstance } from "fastify";
import { createClient } from "@supabase/supabase-js";
import { adminLoginSchema, adminPasswordSchema } from "@movalev/shared";
import { env } from "../env";
import { prisma } from "../lib/prisma";
import { supabaseAdmin } from "../lib/supabase";
import { audit } from "../lib/audit";
import { isStaff, requireStaff } from "../plugins/auth";

/** Bloqueio por força bruta: 5 erros por e-mail ou 20 por IP em 15 minutos. */
const WINDOW_MIN = 15;
const MAX_FAILS_EMAIL = 5;
const MAX_FAILS_IP = 20;
const GENERIC = "E-mail ou senha incorretos.";

/**
 * Login do painel com e-mail e senha. Passa pela API (e não direto no Supabase) para
 * contar tentativas e bloquear força bruta; o Supabase guarda a senha com hash (bcrypt)
 * e tem o próprio limite por IP como segunda barreira. O 2º fator (TOTP) é confirmado
 * em seguida no navegador; as rotas /admin só aceitam a sessão depois dele (aal2).
 */
export async function adminAuthRoutes(app: FastifyInstance) {
  app.post("/auth/admin/login", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req, reply) => {
    const { email, password } = adminLoginSchema.parse(req.body);
    const since = new Date(Date.now() - WINDOW_MIN * 60_000);
    const lastOk = await prisma.loginAttempt.findFirst({ where: { email, success: true }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
    const from = lastOk && lastOk.createdAt > since ? lastOk.createdAt : since;
    const [failsEmail, failsIp] = await Promise.all([
      prisma.loginAttempt.findMany({ where: { email, success: false, createdAt: { gt: from } }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
      prisma.loginAttempt.count({ where: { ip: req.ip, success: false, createdAt: { gt: since } } }),
    ]);
    if (failsEmail.length >= MAX_FAILS_EMAIL || failsIp >= MAX_FAILS_IP) {
      const oldest = failsEmail[Math.max(0, failsEmail.length - MAX_FAILS_EMAIL)]?.createdAt ?? new Date();
      const minutes = Math.max(1, Math.ceil((oldest.getTime() + WINDOW_MIN * 60_000 - Date.now()) / 60_000));
      req.log.warn({ email, ip: req.ip }, "login do painel bloqueado por excesso de tentativas");
      return reply.code(429).send({ error: "bloqueado", message: `Muitas tentativas. Tente de novo em ${minutes} min ou redefina a senha.` });
    }

    if (!env.SUPABASE_SERVICE_ROLE_KEY) return reply.code(503).send({ error: "indisponivel", message: "Login indisponível." });
    const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    const fail = async (message = GENERIC, code = 401) => {
      await prisma.loginAttempt.create({ data: { email, ip: req.ip, success: false } });
      return reply.code(code).send({ error: "credenciais", message });
    };
    if (error || !data.session || !data.user) {
      if (error?.code === "email_not_confirmed") return fail("Confirme o e-mail antes de entrar.");
      return fail();
    }

    const profile = await prisma.profile.upsert({
      where: { id: data.user.id },
      create: { id: data.user.id, email },
      update: {},
      select: { role: true, mustChangePassword: true },
    });
    if (!isStaff(profile.role)) {
      await client.auth.signOut().catch(() => undefined);
      return fail("Esta conta não tem acesso ao painel.", 403);
    }

    // O papel vai no token (app_metadata, só a service role altera) para o Next
    // proteger as páginas /admin sem ir ao banco. A API continua conferindo no banco.
    let session = data.session;
    if (data.user.app_metadata?.role !== profile.role) {
      await supabaseAdmin().auth.admin.updateUserById(data.user.id, { app_metadata: { role: profile.role } });
      const refreshed = await client.auth.refreshSession({ refresh_token: session.refresh_token });
      if (refreshed.data.session) session = refreshed.data.session;
    }

    await prisma.$transaction([
      prisma.loginAttempt.create({ data: { email, ip: req.ip, success: true } }),
      prisma.profile.update({ where: { id: data.user.id }, data: { lastAdminLoginAt: new Date() } }),
    ]);
    req.user = { id: data.user.id, email, role: profile.role, aal: "aal1", authTime: Math.floor(Date.now() / 1000) };
    await audit(req, { action: "auth.login", entity: "usuario", entityId: data.user.id, summary: "Entrou no painel (senha)" });

    const factors = (data.user.factors ?? []).filter((f) => f.factor_type === "totp" && f.status === "verified");
    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      mustChangePassword: profile.mustChangePassword,
      mfaEnrolled: factors.length > 0,
      mfaRequired: env.ADMIN_MFA_REQUIRED,
    };
  });

  /** Troca de senha do painel (obrigatória no 1º acesso). Exige a sessão completa (com 2º fator). */
  app.post("/auth/admin/password", { preHandler: requireStaff, config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (req, reply) => {
    const { password } = adminPasswordSchema.parse(req.body);
    const u = req.user!;
    if (password.toLowerCase().includes(u.email.split("@")[0]!.toLowerCase())) {
      return reply.code(400).send({ error: "senha_fraca", message: "A senha não pode conter o seu e-mail." });
    }
    const { error } = await supabaseAdmin().auth.admin.updateUserById(u.id, { password });
    if (error) return reply.code(400).send({ error: "senha_recusada", message: "Senha recusada. Use uma senha mais forte." });
    await prisma.profile.update({ where: { id: u.id }, data: { mustChangePassword: false } });
    await audit(req, { action: "auth.password", entity: "usuario", entityId: u.id, summary: "Trocou a senha do painel" });
    return { ok: true };
  });
}
