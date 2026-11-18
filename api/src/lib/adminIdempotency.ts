import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { Prisma } from "@prisma/client";
import { idempotencyKeySchema } from "@movalev/shared";
import { prisma } from "./prisma";
import { hashBody } from "./idempotency";

const LOCK_SECONDS = 30;
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

declare module "fastify" {
  interface FastifyRequest {
    idemKey?: string;
  }
}

/**
 * Proteção contra ação gravada duas vezes em TODO o painel (duplo clique, rede que
 * reenvia, aba duplicada). Toda escrita do admin precisa de `Idempotency-Key`:
 * - a 1ª requisição com a chave trava o registro e segue;
 * - a repetição devolve a mesma resposta gravada (ou 409 se a 1ª ainda está rodando);
 * - mesma chave com dados diferentes → 422.
 * Usa a mesma tabela do checkout (idempotency_records), com escopo por usuário.
 * Registrar DEPOIS da checagem de acesso (precisa de req.user).
 */
export function registerAdminIdempotency(app: FastifyInstance) {
  app.addHook("preHandler", async (req: FastifyRequest, reply: FastifyReply) => {
    if (reply.sent || !MUTATING.has(req.method)) return;
    const parsed = idempotencyKeySchema.safeParse(req.headers["idempotency-key"]);
    if (!parsed.success) {
      return reply.code(400).send({ error: "idempotency_key", message: "Envio sem identificador. Atualize a página e tente de novo." });
    }
    const key = `admin:${req.user!.id}:${parsed.data}`;
    const requestHash = hashBody({ m: req.method, u: req.url, b: req.body ?? null });
    try {
      await prisma.idempotencyRecord.create({
        data: { key, scope: "admin", requestHash, lockedUntil: new Date(Date.now() + LOCK_SECONDS * 1000) },
      });
      req.idemKey = key;
      return;
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") throw err;
    }
    const existing = await prisma.idempotencyRecord.findUnique({ where: { key } });
    if (!existing) return reply.code(409).header("Retry-After", "2").send({ error: "em_andamento", message: "Requisição em processamento." });
    if (existing.requestHash !== requestHash) {
      return reply.code(422).send({ error: "chave_reutilizada", message: "Envio duplicado com dados diferentes." });
    }
    if (existing.status !== null) {
      return reply.code(existing.status).header("Idempotent-Replay", "true").send(existing.response ?? undefined);
    }
    return reply.code(409).header("Retry-After", "2").send({ error: "em_andamento", message: "Ainda processando o envio anterior." });
  });

  // Grava a resposta final para devolver em repetições; erro 5xx libera a chave.
  app.addHook("onSend", async (req, reply, payload) => {
    const key = req.idemKey;
    if (!key) return payload;
    req.idemKey = undefined;
    try {
      if (reply.statusCode >= 500) {
        await prisma.idempotencyRecord.delete({ where: { key } });
      } else {
        let response: Prisma.InputJsonValue | typeof Prisma.JsonNull = Prisma.JsonNull;
        if (typeof payload === "string" && payload.length) {
          try {
            response = JSON.parse(payload) as Prisma.InputJsonValue;
          } catch {
            response = payload;
          }
        }
        await prisma.idempotencyRecord.update({ where: { key }, data: { status: reply.statusCode, response, lockedUntil: null } });
      }
    } catch (err) {
      req.log.warn({ err }, "idempotência do painel: falha ao gravar resposta");
    }
    return payload;
  });
}
