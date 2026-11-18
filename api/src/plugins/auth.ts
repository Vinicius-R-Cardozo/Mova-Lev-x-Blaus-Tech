import type { FastifyReply, FastifyRequest } from "fastify";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { env } from "../env";
import { prisma } from "../lib/prisma";
import { supabaseAdmin } from "../lib/supabase";

/**
 * Valida o JWT do Supabase Auth enviado pelo front (Authorization: Bearer <token>).
 * Projetos novos assinam com chaves assimétricas (JWKS); projetos antigos com HS256.
 */
const jwks = createRemoteJWKSet(new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`));
const hsSecret = env.SUPABASE_JWT_SECRET ? new TextEncoder().encode(env.SUPABASE_JWT_SECRET) : null;
const issuer = `${env.SUPABASE_URL}/auth/v1`;

export type Role = "CUSTOMER" | "EDITOR" | "ADMIN";
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  /** Nível da sessão no Supabase: aal1 = só senha/link; aal2 = com 2º fator. */
  aal: string | null;
  /** Quando a pessoa entrou de fato (senha/link), em segundos — não muda ao renovar o token. */
  authTime: number | null;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

async function verify(token: string): Promise<JWTPayload> {
  const header = JSON.parse(Buffer.from(token.split(".")[0] ?? "", "base64url").toString("utf8")) as { alg?: string };
  if (header.alg === "HS256") {
    if (hsSecret) return (await jwtVerify(token, hsSecret, { issuer, audience: "authenticated" })).payload;
    // Sem o segredo legado: o próprio Supabase Auth confirma o token.
    const { data, error } = await supabaseAdmin().auth.getUser(token);
    if (error || !data.user) throw error ?? new Error("token inválido");
    // O Auth confirmou o token: as claims (aal, amr) podem ser lidas do próprio JWT.
    return JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8")) as JWTPayload;
  }
  return (await jwtVerify(token, jwks, { issuer, audience: "authenticated" })).payload;
}

/** Lê o usuário se houver token válido; não bloqueia visitantes. */
export async function optionalAuth(req: FastifyRequest): Promise<void> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return;
  try {
    const payload = await verify(auth.slice(7));
    const id = payload.sub;
    const email = typeof payload.email === "string" ? payload.email.toLowerCase() : undefined;
    if (!id || !email) return;
    // Garante o perfil (primeiro acesso após o login).
    const profile = await prisma.profile.upsert({
      where: { id },
      create: { id, email },
      update: {},
      select: { role: true },
    });
    req.user = { id, email, role: profile.role, aal: typeof payload.aal === "string" ? payload.aal : null, authTime: authTimeOf(payload) };
  } catch (err) {
    req.log.debug({ err }, "JWT inválido");
  }
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  await optionalAuth(req);
  if (!req.user) return reply.code(401).send({ error: "nao_autenticado", message: "Faça login para continuar." });
}

/** Momento do login (o mais recente entre os métodos do `amr`), em segundos. */
function authTimeOf(payload: JWTPayload): number | null {
  const amr = (payload as { amr?: { method?: string; timestamp?: number }[] }).amr;
  if (!Array.isArray(amr) || !amr.length) return typeof payload.iat === "number" ? payload.iat : null;
  const first = amr.filter((a) => a.method !== "totp" && typeof a.timestamp === "number").map((a) => a.timestamp!);
  return first.length ? Math.max(...first) : null;
}

export const isStaff = (role: Role) => role === "ADMIN" || role === "EDITOR";

/**
 * Sessão do painel: equipe (Admin/Editor), com 2º fator (aal2) e no máximo
 * ADMIN_SESSION_HOURS desde o login. Fora disso, 401 com o motivo para o painel
 * mandar a pessoa ao login certo.
 */
export async function requireStaff(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  await optionalAuth(req);
  const u = req.user;
  if (!u) return reply.code(401).send({ error: "nao_autenticado", message: "Faça login para continuar." });
  if (!isStaff(u.role)) return reply.code(403).send({ error: "proibido", message: "Acesso restrito." });
  if (env.ADMIN_MFA_REQUIRED && u.aal !== "aal2") {
    return reply.code(401).send({ error: "mfa_obrigatorio", message: "Confirme o código do aplicativo autenticador." });
  }
  if (!u.authTime || Date.now() / 1000 - u.authTime > env.ADMIN_SESSION_HOURS * 3600) {
    return reply.code(401).send({ error: "sessao_expirada", message: "Sua sessão do painel expirou. Entre de novo." });
  }
}

/** Só Admin (equipe completa). Use depois de `requireStaff`. */
export async function requireAdmin(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  await requireStaff(req, reply);
  if (reply.sent) return;
  if (req.user!.role !== "ADMIN") return reply.code(403).send({ error: "proibido", message: "Esta área é só para administradores." });
}
