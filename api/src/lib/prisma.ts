import { PrismaClient } from "@prisma/client";

/**
 * URL do banco em uso. O pooler do Supabase em modo TRANSAÇÃO (porta 6543, pgbouncer=true)
 * faz ~5 idas e voltas por consulta: com a API longe do banco (Render nos EUA, banco em SP)
 * cada consulta levava ~875 ms. Em modo SESSÃO (porta 5432) é uma ida e volta só.
 * Se DATABASE_URL vier no modo transação e houver DIRECT_URL (sessão), usamos a DIRECT_URL.
 */
function resolveDatabaseUrl(): { url: string | undefined; source: string } {
  const db = process.env.DATABASE_URL;
  const direct = process.env.DIRECT_URL;
  if (db && direct && /:6543\//.test(db) && /:5432\//.test(direct)) {
    const u = new URL(direct);
    if (!u.searchParams.has("connection_limit")) u.searchParams.set("connection_limit", "5");
    return { url: u.toString(), source: "DIRECT_URL (sessão; DATABASE_URL estava no modo transação 6543)" };
  }
  return { url: db, source: "DATABASE_URL" };
}

export const databaseUrl = resolveDatabaseUrl();
if (databaseUrl.source !== "DATABASE_URL") console.warn(`[db] usando ${databaseUrl.source}`);

export const prisma = new PrismaClient({
  ...(databaseUrl.url ? { datasources: { db: { url: databaseUrl.url } } } : {}),
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
