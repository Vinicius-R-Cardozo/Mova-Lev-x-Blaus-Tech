/**
 * Postgres local SEM Docker (para máquinas sem virtualização).
 *
 *   npm run db:local -w @movalev/api
 *
 * Sobe um Postgres 17 nativo em 127.0.0.1:54322 (mesma porta/credenciais do `supabase start`),
 * com dados em api/.data/postgres. Cria os papéis `anon`, `authenticated` e `service_role`
 * para espelhar o Supabase (RLS e REVOKEs da migração funcionam igual).
 *
 * Limitação: não há Supabase Auth nem Storage aqui — use um projeto Supabase
 * (ou `supabase start`, onde houver Docker) para testar login e upload de fotos.
 */
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.data/postgres");
const firstRun = !existsSync(path.join(dir, "PG_VERSION"));

const pg = new EmbeddedPostgres({
  databaseDir: dir,
  user: "postgres",
  password: "postgres",
  port: 54322,
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  onLog: () => {},
});

if (firstRun) await pg.initialise();
await pg.start();

if (firstRun) {
  const client = pg.getPgClient();
  await client.connect();
  for (const role of ["anon", "authenticated", "service_role"]) {
    await client.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${role}') THEN CREATE ROLE ${role} NOLOGIN; END IF; END $$;`);
  }
  await client.query("GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role");
  // Igual ao Supabase: tabelas novas nascem com privilégios para os papéis públicos.
  await client.query("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role");
  await client.end();
}

console.log("Postgres local pronto em postgresql://postgres:postgres@127.0.0.1:54322/postgres (Ctrl+C para parar)");

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
// Mantém o processo vivo.
setInterval(() => {}, 1 << 30);
