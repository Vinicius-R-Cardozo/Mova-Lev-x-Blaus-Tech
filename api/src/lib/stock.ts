import type { Prisma, StockMovementType } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export interface MovementInput {
  variantId: string;
  type: StockMovementType;
  delta: number;
  stockAfter: number;
  note?: string | null;
  orderId?: string | null;
  actor?: { id?: string | null; email?: string | null } | null;
}

/**
 * Grava uma linha no histórico de movimentações. Sempre dentro da MESMA transação
 * da mudança de estoque: ou as duas coisas acontecem, ou nenhuma.
 */
export function recordMovement(tx: Tx, m: MovementInput) {
  if (m.delta === 0) return Promise.resolve(null);
  return tx.stockMovement.create({
    data: {
      variantId: m.variantId,
      type: m.type,
      delta: m.delta,
      stockAfter: m.stockAfter,
      note: m.note ?? null,
      orderId: m.orderId ?? null,
      actorId: m.actor?.id ?? null,
      actorEmail: m.actor?.email ?? (m.orderId ? "sistema" : null),
    },
  });
}
