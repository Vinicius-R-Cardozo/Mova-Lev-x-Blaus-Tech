import type { FastifyInstance } from "fastify";
import { paymentSettingsSchema, storeSettingsSchema } from "@movalev/shared";
import { prisma } from "../../lib/prisma";
import { audit, diffSummary } from "../../lib/audit";
import { clearCache } from "../../lib/cache";
import { paymentSettings, storeSettings } from "../../lib/settings";
import { revalidateStore } from "../../lib/revalidate";

/** Configurações da loja e das formas de pagamento (só Admin). */
export async function adminSettingsRoutes(app: FastifyInstance) {
  app.get("/admin/settings/store", async () => storeSettings());

  app.put("/admin/settings/store", async (req) => {
    const input = storeSettingsSchema.parse(req.body);
    const prev = await storeSettings();
    await prisma.setting.upsert({ where: { key: "store" }, create: { key: "store", value: input }, update: { value: input } });
    clearCache();
    const d = diffSummary(prev, input, { storeName: "Nome", legalName: "Razão social", cnpj: "CNPJ", address: "Endereço", contactEmail: "E-mail de atendimento", dpoEmail: "E-mail do DPO", whatsapp: "WhatsApp", hours: "Horário", instagram: "Instagram" });
    await audit(req, { action: "settings.store", entity: "configuracao", entityId: "loja", summary: `Dados da loja${d.summary ? ` — ${d.summary}` : ""}`, before: d.before, after: d.after });
    revalidateStore(["store", "home"]);
    return input;
  });

  app.get("/admin/settings/payments", async () => paymentSettings());

  app.put("/admin/settings/payments", async (req) => {
    const input = paymentSettingsSchema.parse(req.body);
    const prev = await paymentSettings();
    await prisma.setting.upsert({ where: { key: "payments" }, create: { key: "payments", value: input }, update: { value: input } });
    clearCache();
    const d = diffSummary(prev, input, { pixEnabled: "Pix", pixDiscountPercent: "Desconto Pix (%)", cardEnabled: "Cartão", maxInstallments: "Parcelas", minInstallmentCents: "Parcela mínima", boletoEnabled: "Boleto" });
    await audit(req, { action: "settings.payments", entity: "configuracao", entityId: "pagamentos", summary: `Formas de pagamento${d.summary ? ` — ${d.summary}` : ""}`, before: d.before, after: d.after });
    revalidateStore(["store", "catalog", "home"]);
    return input;
  });
}
