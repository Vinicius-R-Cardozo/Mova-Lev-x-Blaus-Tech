/** Schemas Zod do painel admin — usados no formulário e revalidados na API. */
import { z } from "zod";
import { BADGES, IMAGE_KINDS, MODELS, ORDER_STATUSES, PICTOGRAMS, SENSATIONS, SIZES } from "./catalog";
import { UFS } from "./schemas";

const uuid = z.string().uuid();
const cents = z.number().int().min(0).max(10_000_000);

export const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

export const PRODUCT_STATUSES = ["ACTIVE", "DRAFT", "HIDDEN", "ARCHIVED"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];
export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = { ACTIVE: "Ativo", DRAFT: "Rascunho", HIDDEN: "Oculto", ARCHIVED: "Arquivado" };
export const PRODUCT_STATUS_HINT: Record<ProductStatus, string> = {
  ACTIVE: "Na loja: listas, busca e página.",
  DRAFT: "Em preparação: não aparece na loja.",
  HIDDEN: "Fora das listas e da busca; a página abre só por link direto.",
  ARCHIVED: "Arquivado: some da loja e pode ser restaurado.",
};

export const adminProductSchema = z.object({
  name: z.string().trim().min(3).max(120),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/, "Só letras minúsculas, números e hífen").max(80).optional(),
  nameEmphasis: z.string().trim().max(60).nullable().optional(),
  description: z.string().trim().min(10).max(2000),
  fabricCare: z.string().trim().min(10).max(2000),
  /** Preço normal (no formulário). Com promoção, vira o preço riscado. */
  priceCents: cents.refine((v) => v > 0, "Preço obrigatório"),
  /** Preço promocional (opcional): precisa ser menor que o preço normal. */
  promoPriceCents: cents.nullable().default(null),
  seoTitle: z.string().trim().max(70, "Até 70 caracteres").nullable().optional(),
  seoDescription: z.string().trim().max(160, "Até 160 caracteres").nullable().optional(),
  badge: z.enum(BADGES).nullable(),
  sensation: z.enum(SENSATIONS),
  model: z.enum(MODELS).nullable(),
  pictogram: z.enum(PICTOGRAMS),
  status: z.enum(PRODUCT_STATUSES),
  relevance: z.number().int().min(0).max(1000).default(0),
  collectionId: uuid.nullable(),
  categoryIds: z.array(uuid).max(10),
  colors: z.array(z.object({ colorId: uuid, featured: z.boolean() })).min(1, "Escolha ao menos uma cor").max(12),
  completeLookIds: z.array(uuid).max(6),
  youMayLikeIds: z.array(uuid).max(8),
}).refine((p) => p.promoPriceCents === null || (p.promoPriceCents > 0 && p.promoPriceCents < p.priceCents), {
  message: "O preço promocional precisa ser menor que o preço normal",
  path: ["promoPriceCents"],
});
export type AdminProductInput = z.infer<typeof adminProductSchema>;

/** Filtros da lista de produtos do painel. */
export const adminProductListSchema = z.object({
  q: z.string().trim().max(80).optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  categoryId: uuid.optional(),
  collectionId: uuid.optional(),
  stock: z.enum(["baixo", "esgotado"]).optional(),
  promo: z.coerce.boolean().optional(),
  sort: z.enum(["nome", "recentes", "preco"]).default("nome"),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(10).max(100).default(25),
});

export const adminVariantsSchema = z.object({
  variants: z
    .array(
      z.object({
        colorId: uuid,
        size: z.enum(SIZES),
        sku: z.string().trim().min(3).max(40).regex(/^[A-Z0-9-]+$/, "SKU em maiúsculas, números e hífen"),
        stock: z.number().int().min(0).max(100000),
        priceCents: cents.nullable(),
      }),
    )
    .max(200),
});

export const adminUploadSignSchema = z.object({
  productId: uuid,
  fileName: z.string().trim().min(1).max(160),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif", "video/mp4", "video/webm"]),
  size: z.number().int().min(1).max(10 * 1024 * 1024, "Máximo de 10 MB"),
});

export const adminImageCreateSchema = z.object({
  storagePath: z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|avif|mp4|webm)$/),
  colorId: uuid.nullable(),
  kind: z.enum(IMAGE_KINDS),
  alt: z.string().trim().min(3).max(200),
});

export const adminImageUpdateSchema = z.object({
  colorId: uuid.nullable().optional(),
  kind: z.enum(IMAGE_KINDS).optional(),
  alt: z.string().trim().min(3).max(200).optional(),
  caption: z.string().trim().max(160).nullable().optional(),
});

export const adminImageOrderSchema = z.object({ ids: z.array(uuid).max(100) });

export const adminOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  trackingCode: z.string().trim().max(60).optional(),
});

export const adminTrackingSchema = z.object({ trackingCode: z.string().trim().max(60) });

export const adminCouponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{3,30}$/, "3 a 30 letras/números"),
    description: z.string().trim().max(160).nullable().optional(),
    type: z.enum(["PERCENT", "FIXED"]),
    value: z.number().int().min(1),
    minSubtotalCents: cents.default(0),
    firstPurchaseOnly: z.boolean().default(false),
    stacksWithProgressive: z.boolean().default(true),
    maxRedemptions: z.number().int().min(1).nullable().default(null),
    active: z.boolean().default(true),
    startsAt: z.coerce.date().nullable().optional(),
    endsAt: z.coerce.date().nullable().optional(),
  })
  .refine((c) => c.type !== "PERCENT" || c.value <= 90, { message: "Percentual até 90%", path: ["value"] })
  .refine((c) => !c.startsAt || !c.endsAt || c.endsAt > c.startsAt, { message: "Fim depois do início", path: ["endsAt"] });
export type AdminCouponInput = z.infer<typeof adminCouponSchema>;

export const adminTiersSchema = z.object({
  tiers: z
    .array(z.object({ minItems: z.number().int().min(2).max(20), percent: z.number().int().min(1).max(60) }))
    .max(6)
    .refine((t) => t.every((x, i) => i === 0 || (x.minItems > t[i - 1]!.minItems && x.percent > t[i - 1]!.percent)), "As faixas precisam crescer em peças e em desconto"),
});

export const adminShippingSchema = z.object({
  freeShippingThresholdCents: cents,
  pickup: z.object({ enabled: z.boolean(), label: z.string().trim().min(2).max(60), address: z.string().trim().max(200), days: z.number().int().min(0).max(30) }),
  regions: z
    .array(
      z.object({
        name: z.string().trim().min(2).max(60),
        ufs: z.array(z.enum(UFS)).min(1),
        standardCents: cents,
        standardDays: z.number().int().min(1).max(60),
        expressCents: cents.nullable(),
        expressDays: z.number().int().min(1).max(60).nullable(),
        active: z.boolean(),
      }),
    )
    .max(30)
    .refine((r) => {
      const all = r.filter((x) => x.active).flatMap((x) => x.ufs);
      return new Set(all).size === all.length;
    }, "Cada UF só pode estar em uma região ativa"),
});

export const adminCollectionSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9-]+$/).max(60),
  name: z.string().trim().min(2).max(60),
  season: z.string().trim().max(40).nullable().optional(),
  description: z.string().trim().max(400).nullable().optional(),
});

// ───────────────────────────── Acesso ao painel ─────────────────────────────

export const ADMIN_ROLES = ["ADMIN", "EDITOR"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];
export const ROLE_LABEL: Record<AdminRole | "CUSTOMER", string> = { ADMIN: "Administrador", EDITOR: "Editor", CUSTOMER: "Cliente" };

export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(160),
  password: z.string().min(1, "Informe a senha").max(200),
});

/** Senha do painel: 10+ caracteres, com letra e número. */
export const adminPasswordSchema = z.object({
  password: z
    .string()
    .min(10, "Use pelo menos 10 caracteres")
    .max(128, "Senha longa demais")
    .regex(/[A-Za-zÀ-ÿ]/, "Inclua pelo menos uma letra")
    .regex(/\d/, "Inclua pelo menos um número"),
});
