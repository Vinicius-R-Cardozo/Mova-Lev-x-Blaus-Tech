/** Schemas dos conteúdos editáveis (tabela settings) — validados na leitura e no admin. */
import { z } from "zod";
import { SENSATIONS } from "./catalog";

const cta = z.object({ label: z.string().min(1), href: z.string().min(1) });
const slugRef = z.object({ productSlug: z.string().min(1), colorSlug: z.string().min(1) });

export const homeContentSchema = z.object({
  hero: z.object({
    kicker: z.string(),
    titleLine1: z.string(),
    titleLine2: z.string(),
    videoUrl: z.string().url().nullable(),
    posterUrl: z.string().url().nullable(),
    caption: z.string(),
    primaryCta: cta,
    secondaryCta: cta,
  }),
  campaign: z.object({ title: z.string(), cta: z.string(), items: z.array(slugRef).max(4) }),
  shopTheLook: z.object({
    kicker: z.string(),
    title: z.string(),
    titleEmphasis: z.string(),
    caption: z.string(),
    imageUrl: z.string().url().nullable(),
    note: z.string(),
    cta: z.string(),
    items: z.array(slugRef.extend({ hotspot: z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }) })).max(6),
  }),
  sensations: z.array(z.object({ sensation: z.enum(SENSATIONS), title: z.string(), text: z.string(), href: z.string(), imageUrl: z.string().url().nullable().optional() })).max(2),
  studio: z.object({
    kicker: z.string(),
    title: z.string(),
    titleEmphasis: z.string(),
    text: z.string(),
    cta,
    classes: z.array(z.object({ title: z.string(), meta: z.string(), tone: z.string(), videoUrl: z.string().url().nullable(), imageUrl: z.string().url().nullable().optional() })).max(6),
  }),
  instagram: z.object({
    title: z.string(),
    handle: z.string(),
    url: z.string().url(),
    tiles: z.array(z.object({ tone: z.string(), caption: z.string(), imageUrl: z.string().url().nullable().optional() })).max(12),
  }),
});
export type HomeContent = z.infer<typeof homeContentSchema>;

export const shippingSettingsSchema = z.object({
  freeShippingThresholdCents: z.number().int().min(0),
  pickup: z.object({ enabled: z.boolean(), label: z.string(), address: z.string(), days: z.number().int().min(0) }),
});
export type ShippingSettings = z.infer<typeof shippingSettingsSchema>;

// ───────────────────────────── Configurações da loja ─────────────────────────────

const optText = (max: number) => z.string().trim().max(max).default("");

/** Dados da empresa e canais (páginas legais, rodapé, contato, e-mails). */
export const storeSettingsSchema = z.object({
  storeName: z.string().trim().min(2).max(60).default("MOVA LEV"),
  legalName: optText(120),
  cnpj: z
    .string()
    .trim()
    .regex(/^$|^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/, "CNPJ inválido")
    .default(""),
  address: optText(200),
  contactEmail: z.string().trim().email("E-mail inválido").or(z.literal("")).default(""),
  dpoEmail: z.string().trim().email("E-mail inválido").or(z.literal("")).default(""),
  whatsapp: z
    .string()
    .trim()
    .regex(/^$|^\+?\d{10,13}$/, "Só números, com DDD (ex.: 11987654321)")
    .default(""),
  hours: optText(120).default("segunda a sexta, das 9h às 18h"),
  instagram: z.string().trim().url("URL inválida").or(z.literal("")).default("https://instagram.com/movalev"),
  tiktok: z.string().trim().url("URL inválida").or(z.literal("")).default(""),
  pinterest: z.string().trim().url("URL inválida").or(z.literal("")).default(""),
  youtube: z.string().trim().url("URL inválida").or(z.literal("")).default(""),
});
export type StoreSettings = z.infer<typeof storeSettingsSchema>;

/** Formas de pagamento oferecidas no checkout. */
export const paymentSettingsSchema = z
  .object({
    pixEnabled: z.boolean().default(true),
    pixDiscountPercent: z.number().int().min(0, "Mínimo 0%").max(30, "Máximo 30%").default(5),
    cardEnabled: z.boolean().default(true),
    maxInstallments: z.number().int().min(1).max(12, "Até 12x").default(6),
    /** Parcela mínima em centavos (0 = sem mínimo). */
    minInstallmentCents: z.number().int().min(0).max(100_000).default(0),
    boletoEnabled: z.boolean().default(true),
  })
  .refine((p) => p.pixEnabled || p.cardEnabled || p.boletoEnabled, { message: "Deixe ao menos uma forma de pagamento ativa", path: ["pixEnabled"] });
export type PaymentSettings = z.infer<typeof paymentSettingsSchema>;
export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = paymentSettingsSchema.parse({});
export const DEFAULT_STORE_SETTINGS: StoreSettings = storeSettingsSchema.parse({});

/** O que a vitrine precisa saber da loja (público). */
export interface StoreConfigDTO {
  store: StoreSettings;
  payments: PaymentSettings;
}

/** Parâmetros que o cálculo de preço usa (desligado = sem parcelamento / sem desconto). */
export const pricingPaymentsOf = (p: PaymentSettings) => ({
  maxInstallments: p.cardEnabled ? p.maxInstallments : 1,
  minInstallmentCents: p.minInstallmentCents,
  pixDiscountPercent: p.pixEnabled ? p.pixDiscountPercent : 0,
});
