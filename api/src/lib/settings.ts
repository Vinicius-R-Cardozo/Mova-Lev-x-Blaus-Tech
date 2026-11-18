import { z } from "zod";
import { prisma } from "./prisma";
import { cached } from "./cache";

/** Configuração de estoque (tabela settings, chave "stock"). */
export const stockSettingsSchema = z.object({
  /** Variante com estoque até este número (e acima de 0) entra no alerta de estoque baixo. */
  lowStockThreshold: z.number().int().min(0).max(1000).default(3),
});
export type StockSettings = z.infer<typeof stockSettingsSchema>;

export async function stockSettings(): Promise<StockSettings> {
  return cached("settings:stock", 60_000, async () => {
    const row = await prisma.setting.findUnique({ where: { key: "stock" } });
    return stockSettingsSchema.parse(row?.value ?? {});
  });
}

export const lowStockThreshold = async () => (await stockSettings()).lowStockThreshold;
