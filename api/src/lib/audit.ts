import type { FastifyRequest } from "fastify";
import { Prisma } from "@prisma/client";
import { formatBRL } from "@movalev/shared";
import { prisma } from "./prisma";

export interface AuditEntry {
  /** Ex.: product.update, variant.stock, order.status, coupon.delete */
  action: string;
  entity: string;
  entityId?: string | null;
  /** Frase curta para a lista de atividades ("Preço: R$ 289 → R$ 259"). */
  summary?: string | null;
  before?: unknown;
  after?: unknown;
}

const json = (v: unknown) => (v === undefined ? undefined : v === null ? Prisma.JsonNull : (JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue));

/**
 * Registra uma atividade do painel (quem, o quê, quando, de onde).
 * Nunca derruba a operação: se o log falhar, só avisa no log do servidor.
 */
export async function audit(req: FastifyRequest, entry: AuditEntry): Promise<void> {
  const u = req.user;
  try {
    await prisma.auditLog.create({
      data: {
        actorId: u?.id ?? null,
        actorEmail: u?.email ?? "sistema",
        actorRole: u?.role ?? "CUSTOMER",
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        summary: entry.summary ?? null,
        before: json(entry.before),
        after: json(entry.after),
        ip: req.ip,
      },
    });
  } catch (err) {
    req.log.error({ err, entry }, "falha ao gravar auditoria");
  }
}

/**
 * Compara dois objetos e descreve só o que mudou ("Preço: R$ 289 → R$ 259; Status: Rascunho → Ativo").
 * `labels` traduz as chaves; chaves sem rótulo são ignoradas no resumo (mas ficam no before/after).
 */
export function diffSummary(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  labels: Record<string, string>,
): { summary: string | null; before: Record<string, unknown>; after: Record<string, unknown> } {
  const parts: string[] = [];
  const b: Record<string, unknown> = {};
  const a: Record<string, unknown> = {};
  for (const key of Object.keys(labels)) {
    const x = before[key];
    const y = after[key];
    if (JSON.stringify(x) === JSON.stringify(y)) continue;
    b[key] = x;
    a[key] = y;
    parts.push(`${labels[key]}: ${show(key, x)} → ${show(key, y)}`);
  }
  return { summary: parts.length ? parts.join("; ") : null, before: b, after: a };
}

function show(key: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number" && /cents/i.test(key)) return formatBRL(v, { compact: true });
  if (typeof v === "boolean") return v ? "sim" : "não";
  const s = String(v);
  return s.length > 60 ? `${s.slice(0, 57)}…` : s;
}
