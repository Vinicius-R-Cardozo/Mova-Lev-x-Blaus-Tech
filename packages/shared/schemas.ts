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

export const cartItemsSchema = z.array(cartItemInputSchema).max(50);

export const cartQuoteInputSchema = z.object({
  items: cartItemsSchema,
  couponCode: z.string().trim().toUpperCase().max(40).optional(),
});
export type CartQuoteInput = z.infer<typeof cartQuoteInputSchema>;

export const cartReplaceSchema = z.object({ items: cartItemsSchema });

// ─── Checkout ───────────────────────────────────────────────

function validCpf(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ""))
  .pipe(z.string().regex(/^\d{10,11}$/, "Celular com DDD"));

export const cpfSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ""))
  .refine(validCpf, "CPF inválido");

export const customerSchema = z.object({
  email: emailSchema,
  name: z
    .string()
    .trim()
    .min(3, "Nome completo")
    .max(120)
    .refine((v) => v.split(/\s+/).length >= 2, "Nome e sobrenome"),
  phone: phoneSchema,
  cpf: cpfSchema.optional(),
});
export type CustomerInput = z.infer<typeof customerSchema>;

export const SHIPPING_METHODS = ["PADRAO", "EXPRESSA", "RETIRADA"] as const;
export const PAYMENT_METHODS = ["PIX", "CARTAO", "BOLETO"] as const;

export const checkoutQuoteInputSchema = z.object({
  items: z.array(z.object({ variantId: z.string().uuid(), quantity: z.number().int().min(1).max(20) })).max(50),
  couponCode: z.string().trim().toUpperCase().max(40).optional(),
  email: emailSchema.optional(),
  cep: cepSchema.optional(),
  shippingMethod: z.enum(SHIPPING_METHODS).optional(),
});
export type CheckoutQuoteInput = z.infer<typeof checkoutQuoteInputSchema>;

export const orderInputSchema = z
  .object({
    customer: customerSchema,
    items: z.array(z.object({ variantId: z.string().uuid(), quantity: z.number().int().min(1).max(20) })).min(1).max(50),
    couponCode: z.string().trim().toUpperCase().max(40).optional(),
    shipping: z.object({ method: z.enum(SHIPPING_METHODS), address: addressSchema.optional() }),
    payment: z.object({ method: z.enum(PAYMENT_METHODS), installments: z.number().int().min(1).max(6).default(1) }),
    acceptsNewsletter: z.boolean().optional(),
  })
  .refine((o) => o.shipping.method === "RETIRADA" || !!o.shipping.address, { message: "Endereço de entrega obrigatório", path: ["shipping", "address"] });
export type OrderInput = z.infer<typeof orderInputSchema>;

// ─── Conta ──────────────────────────────────────────────────

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(3).max(120).optional(),
  phone: phoneSchema.optional().or(z.literal("").transform(() => undefined)),
  cpf: cpfSchema.optional().or(z.literal("").transform(() => undefined)),
});

export const accountAddressSchema = addressSchema.extend({
  label: z.string().trim().max(40).optional(),
  recipient: z.string().trim().max(120).optional(),
  isDefault: z.boolean().optional(),
});
export type AccountAddressInput = z.infer<typeof accountAddressSchema>;

export const favoritesMergeSchema = z.object({ productIds: z.array(z.string().uuid()).max(200) });

// ─── Contato ────────────────────────────────────────────────

export const CONTACT_SUBJECTS = ["pedido", "troca", "tamanho", "parceria", "outro"] as const;
export const CONTACT_SUBJECT_LABEL: Record<(typeof CONTACT_SUBJECTS)[number], string> = {
  pedido: "Meu pedido",
  troca: "Troca ou devolução",
  tamanho: "Dúvida de tamanho",
  parceria: "Parcerias e imprensa",
  outro: "Outro assunto",
};

export const contactInputSchema = z.object({
  name: z.string().trim().min(2, "Seu nome").max(120),
  email: emailSchema,
  subject: z.enum(CONTACT_SUBJECTS),
  orderNumber: z.string().trim().regex(/^#?\d{1,8}$/, "Número do pedido").optional().or(z.literal("").transform(() => undefined)),
  message: z.string().trim().min(10, "Conte um pouco mais (mín. 10 caracteres)").max(2000),
  /** Campo-isca invisível: robôs preenchem, pessoas não. */
  website: z.string().max(0).optional(),
});
export type ContactInput = z.infer<typeof contactInputSchema>;
