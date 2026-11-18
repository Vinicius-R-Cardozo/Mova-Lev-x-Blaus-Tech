import { z } from "zod";
import { paymentSettingsSchema, storeSettingsSchema, type PaymentSettings, type StoreSettings } from "@movalev/shared";
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

/** Dados da loja (empresa, contato, redes). Valores vazios caem nos padrões do schema. */
export function storeSettings(): Promise<StoreSettings> {
  return cached("settings:store", 60_000, async () => {
    const row = await prisma.setting.findUnique({ where: { key: "store" } });
    return storeSettingsSchema.parse(row?.value ?? {});
  });
}

/** Formas de pagamento (Pix, cartão, boleto) e suas regras. */
export function paymentSettings(): Promise<PaymentSettings> {
  return cached("settings:payments", 60_000, async () => {
    const row = await prisma.setting.findUnique({ where: { key: "payments" } });
    const parsed = paymentSettingsSchema.safeParse(row?.value ?? {});
    return parsed.success ? parsed.data : paymentSettingsSchema.parse({});
  });
}

/** Parâmetros que o cálculo de preço usa (parcelas e Pix). */
export { pricingPaymentsOf as pricingPayments } from "@movalev/shared";
