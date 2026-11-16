import { createHash } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { Prisma } from "@prisma/client";
import { idempotencyKeySchema } from "@movalev/shared";
import { prisma } from "./prisma";

/**
 * Idempotência segura com várias instâncias da API (Render pode escalar horizontalmente).
 *
 * 1. A 1ª requisição com a chave faz INSERT em `idempotency_records` (PK = escopo:chave).
 *    Só uma instância consegue: as outras batem na unique constraint.
 * 2. Quem perdeu a corrida devolve a resposta gravada (mesmo status e corpo) ou,
 *    se a 1ª ainda está processando, 409 "em andamento" para o cliente tentar de novo.
 * 3. Mesmo com chave igual, corpo diferente → 422 (uso indevido da chave).
 *
 * Operações que precisam de garantia extra (pedido) também têm `idempotencyKey` único
 * na própria tabela, dentro da mesma transação.
 */
const LOCK_SECONDS = 30;

export function hashBody(body: unknown): string {
  return createHash("sha256").update(JSON.stringify(body ?? null)).digest("hex");
}

export function readIdempotencyKey(req: FastifyRequest): string {
  return idempotencyKeySchema.parse(req.headers["idempotency-key"]);
}

export async function withIdempotency<T>(
  req: FastifyRequest,
  reply: FastifyReply,
  scope: string,
  handler: () => Promise<{ status: number; body: T }>,
): Promise<FastifyReply> {
  const key = `${scope}:${readIdempotencyKey(req)}`;
  const requestHash = hashBody(req.body);

  try {
    await prisma.idempotencyRecord.create({
      data: { key, scope, requestHash, lockedUntil: new Date(Date.now() + LOCK_SECONDS * 1000) },
    });
  } catch (err) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") throw err;
    const existing = await prisma.idempotencyRecord.findUnique({ where: { key } });
    if (!existing) throw err;
    if (existing.requestHash !== requestHash) {
      return reply.code(422).send({ error: "chave_reutilizada", message: "Idempotency-Key já usada com outros dados." });
    }
    if (existing.status !== null) {
      return reply.code(existing.status).header("Idempotent-Replay", "true").send(existing.response);
    }
    if (existing.lockedUntil && existing.lockedUntil > new Date()) {
      return reply.code(409).header("Retry-After", "2").send({ error: "em_andamento", message: "Requisição em processamento." });
    }
    // Trava vencida (instância caiu no meio): assume a operação.
    const taken = await prisma.idempotencyRecord.updateMany({
      where: { key, status: null, lockedUntil: existing.lockedUntil },
      data: { lockedUntil: new Date(Date.now() + LOCK_SECONDS * 1000) },
    });
    if (taken.count === 0) {
      return reply.code(409).header("Retry-After", "2").send({ error: "em_andamento", message: "Requisição em processamento." });
    }
  }

  try {
    const result = await handler();
    // Só respostas definitivas ficam gravadas; erro 5xx libera a chave para nova tentativa.
    if (result.status < 500) {
      await prisma.idempotencyRecord.update({
        where: { key },
        data: { status: result.status, response: result.body as Prisma.InputJsonValue, lockedUntil: null },
      });
    } else {
      await prisma.idempotencyRecord.delete({ where: { key } });
    }
    return reply.code(result.status).send(result.body);
  } catch (err) {
    await prisma.idempotencyRecord.delete({ where: { key } }).catch(() => undefined);
    throw err;
  }
}
