import type { FastifyReply, FastifyRequest } from "fastify";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { env } from "../env";
import { prisma } from "../lib/prisma";

/**
 * Valida o JWT do Supabase Auth enviado pelo front (Authorization: Bearer <token>).
 * Projetos novos assinam com chaves assimétricas (JWKS); projetos antigos com HS256.
 */
const jwks = createRemoteJWKSet(new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`));
const hsSecret = env.SUPABASE_JWT_SECRET ? new TextEncoder().encode(env.SUPABASE_JWT_SECRET) : null;
const issuer = `${env.SUPABASE_URL}/auth/v1`;

export interface AuthUser {
  id: string;
  email: string;
  role: "CUSTOMER" | "ADMIN";
}

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

async function verify(token: string): Promise<JWTPayload> {
  const header = JSON.parse(Buffer.from(token.split(".")[0] ?? "", "base64url").toString("utf8")) as { alg?: string };
  if (header.alg === "HS256") {
    if (!hsSecret) throw new Error("HS256 sem SUPABASE_JWT_SECRET");
    return (await jwtVerify(token, hsSecret, { issuer, audience: "authenticated" })).payload;
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
    req.user = { id, email, role: profile.role };
  } catch (err) {
    req.log.debug({ err }, "JWT inválido");
  }
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  await optionalAuth(req);
  if (!req.user) return reply.code(401).send({ error: "nao_autenticado", message: "Faça login para continuar." });
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  await optionalAuth(req);
  if (!req.user) return reply.code(401).send({ error: "nao_autenticado", message: "Faça login para continuar." });
  if (req.user.role !== "ADMIN") return reply.code(403).send({ error: "proibido", message: "Acesso restrito." });
}
