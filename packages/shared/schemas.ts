import { z } from "zod";
import { MODEL_SLUG, SENSATIONS, SIZES, SORTS } from "./catalog";

export const emailSchema = z.string().trim().toLowerCase().email("E-mail inválido").max(254);

/** Chave de idempotência enviada no header `Idempotency-Key`. */
export const idempotencyKeySchema = z
  .string()
  .trim()
  .min(16, "Idempotency-Key muito curta")
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/, "Idempotency-Key inválida");

export const newsletterInputSchema = z.object({
  email: emailSchema,
  source: z.enum(["rodape", "checkout", "popup"]).default("rodape"),
});
export type NewsletterInput = z.infer<typeof newsletterInputSchema>;

const csv = <T extends z.ZodType<string, string>>(item: T) =>
  z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (v === undefined ? [] : (Array.isArray(v) ? v : v.split(",")).map((s) => s.trim()).filter(Boolean)))
    .pipe(z.array(item));

const modelSlugs = Object.values(MODEL_SLUG) as [string, ...string[]];

/** Filtros da página de categoria — mesmos nomes na URL da loja e na API. */
export const catalogQuerySchema = z.object({
  modelo: z.enum(modelSlugs).optional(),
  sensacao: csv(z.enum(SENSATIONS.map((s) => s.toLowerCase()) as [string, ...string[]])),
  cor: csv(z.string().regex(/^[a-z0-9-]+$/).max(40)),
  tamanho: csv(z.enum(SIZES)),
  precoMin: z.coerce.number().int().min(0).max(100000).optional(),
  precoMax: z.coerce.number().int().min(0).max(100000).optional(),
  ordem: z.enum(SORTS).default("relevancia"),
  pagina: z.coerce.number().int().min(1).max(100).default(1),
  porPagina: z.coerce.number().int().min(1).max(48).default(9),
});
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;

export const cepSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ""))
  .pipe(z.string().length(8, "CEP deve ter 8 dígitos"));

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export const addressSchema = z.object({
  cep: cepSchema,
  street: z.string().trim().min(2).max(160),
  number: z.string().trim().min(1).max(20),
  complement: z.string().trim().max(80).optional().default(""),
  district: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  uf: z.enum(UFS),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const cartItemInputSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
});
export type CartItemInput = z.infer<typeof cartItemInputSchema>;
