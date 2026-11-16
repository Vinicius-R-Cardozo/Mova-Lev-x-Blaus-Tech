import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(4000),
  HOST: z.string().default("0.0.0.0"),
  CORS_ORIGINS: z
    .string()
    .default("")
    .transform((v) => v.split(",").map((s) => s.trim()).filter(Boolean)),
  DATABASE_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().transform((v) => v || undefined),
  SUPABASE_JWT_SECRET: z.string().optional().transform((v) => v || undefined),
  STORAGE_BUCKET: z.string().default("produtos"),
  ORDER_RESERVATION_MINUTES: z.coerce.number().int().min(5).max(7 * 24 * 60).default(60),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Variáveis de ambiente inválidas:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

if (parsed.data.NODE_ENV === "production" && !parsed.data.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY é obrigatória em produção.");
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
