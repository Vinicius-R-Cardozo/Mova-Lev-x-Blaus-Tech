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

// ───────────────────────────── Conteúdo do site ─────────────────────────────

const href = z
  .string()
  .trim()
  .max(300)
  .refine((v) => /^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)/.test(v), "Use um caminho da loja (/…) ou um link https://");
const linkSchema = z.object({ label: z.string().trim().min(1, "Texto obrigatório").max(60), href });

export const BENEFIT_ICONS = ["truck", "exchange", "card", "shield"] as const;

/** Barra de aviso, menu do topo, faixa de vantagens e rodapé. Padrões = o site atual. */
export const siteContentSchema = z.object({
  announcement: z
    .object({
      enabled: z.boolean().default(false),
      text: z.string().trim().max(140).default("Frete grátis acima de R$ 299 · Troca grátis em 30 dias · 10% na 1ª compra"),
      href: href.or(z.literal("")).default(""),
    })
    .prefault({}),
  nav: z
    .array(linkSchema)
    .max(5)
    .default([
      { label: "Quiz do ajuste", href: "/guia-de-tamanhos" },
      { label: "Clube MOVA", href: "/conta" },
      { label: "Aulas abertas", href: "/#studio" },
    ]),
  benefits: z
    .array(z.object({ icon: z.enum(BENEFIT_ICONS), title: z.string().trim().min(1).max(40), text: z.string().trim().max(60) }))
    .max(4)
    .default([
      { icon: "truck", title: "Frete grátis", text: "acima de R$ 299" },
      { icon: "exchange", title: "Troca grátis", text: "em até 30 dias" },
      { icon: "card", title: "{{parcelas}}x sem juros", text: "ou {{pix_desconto}}% off no Pix" },
      { icon: "shield", title: "Compra segura", text: "dados protegidos" },
    ]),
  footer: z
    .object({
      newsletterTitle: z.string().trim().max(120).default("Receba novidades e 10% na 1ª compra"),
      columns: z
        .array(z.object({ title: z.string().trim().min(1).max(40), links: z.array(linkSchema).max(8) }))
        .max(4)
        .default([
          { title: "Loja", links: [{ label: "Novidades", href: "/colecao/novidades" }, { label: "Leggings", href: "/colecao/leggings" }, { label: "Tops", href: "/colecao/tops" }, { label: "Conjuntos", href: "/colecao/conjuntos" }] },
          { title: "Ajuda", links: [{ label: "Trocas e devoluções", href: "/trocas-e-devolucoes" }, { label: "Guia de tamanhos", href: "/guia-de-tamanhos" }, { label: "Entregas", href: "/trocas-e-devolucoes#entregas" }, { label: "Contato", href: "/contato" }] },
          { title: "Marca", links: [{ label: "Manifesto", href: "/sobre" }, { label: "Studio MOVA", href: "/#studio" }, { label: "Instagram", href: "https://instagram.com/movalev" }] },
        ]),
      bottomNote: z.string().trim().max(120).default("Pix · Cartão em até {{parcelas}}x · Boleto"),
    })
    .prefault({}),
});
export type SiteContent = z.infer<typeof siteContentSchema>;
export const DEFAULT_SITE_CONTENT: SiteContent = siteContentSchema.parse({});

/** Páginas de texto (Markdown). */
export const pageInputSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9-]+$/, "Só letras minúsculas, números e hífen").min(2).max(60),
  title: z.string().trim().min(2, "Título obrigatório").max(80),
  emphasis: z.string().trim().max(60).nullable().optional(),
  kicker: z.string().trim().max(40).nullable().optional(),
  intro: z.string().trim().max(400).nullable().optional(),
  body: z.string().max(60_000, "Texto longo demais"),
  seoTitle: z.string().trim().max(70).nullable().optional(),
  seoDescription: z.string().trim().max(160).nullable().optional(),
  showToc: z.boolean().default(false),
  published: z.boolean().default(true),
});
export type PageInput = z.infer<typeof pageInputSchema>;

export interface PageDTO extends PageInput {
  id: string;
  system: boolean;
  updatedAt: string;
}

/** Marcadores que o texto das páginas aceita (trocados pelos dados das Configurações). */
export const CONTENT_PLACEHOLDERS: { key: string; label: string }[] = [
  { key: "razao_social", label: "Razão social" },
  { key: "cnpj", label: "CNPJ" },
  { key: "endereco", label: "Endereço" },
  { key: "email", label: "E-mail de atendimento" },
  { key: "email_dpo", label: "E-mail do encarregado (DPO)" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "horario", label: "Horário de atendimento" },
  { key: "instagram", label: "Link do Instagram" },
  { key: "pix_desconto", label: "Desconto do Pix (%)" },
  { key: "parcelas", label: "Parcelas sem juros" },
];
/** Componentes que podem entrar no texto (uma linha sozinha). */
export const CONTENT_WIDGETS: { key: string; label: string }[] = [
  { key: "formulario-contato", label: "Formulário de contato" },
  { key: "preferencias-cookies", label: "Link de preferências de cookies" },
];

/**
 * Troca {{marcador}} pelos valores; marcador sem valor vira "[a preencher: …]".
 * {{marcador?}} é opcional: se estiver vazio, a LINHA inteira some (ex.: WhatsApp).
 */
export function fillPlaceholders(text: string, values: Record<string, string>): string {
  const optional = /\{\{\s*([a-z_]+)\?\s*\}\}/g;
  text = text
    .split("\n")
    .filter((line) => [...line.matchAll(optional)].every((m) => (values[m[1]!] ?? "").trim()))
    .join("\n")
    .replace(/\{\{\s*([a-z_]+)\?\s*\}\}/g, (_m, key: string) => values[key] ?? "");
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_m, key: string) => {
    const v = values[key];
    if (v && v.trim()) return v;
    const label = CONTENT_PLACEHOLDERS.find((p) => p.key === key)?.label ?? key;
    return `[a preencher: ${label.toLowerCase()}]`;
  });
}

/** Valores dos marcadores a partir das Configurações. */
export function placeholderValues(store: StoreSettings, payments: PaymentSettings): Record<string, string> {
  return {
    razao_social: store.legalName,
    cnpj: store.cnpj,
    endereco: store.address,
    email: store.contactEmail,
    email_dpo: store.dpoEmail,
    whatsapp: store.whatsapp,
    horario: store.hours,
    instagram: store.instagram,
    pix_desconto: String(payments.pixEnabled ? payments.pixDiscountPercent : 0),
    parcelas: String(payments.cardEnabled ? payments.maxInstallments : 1),
  };
}
