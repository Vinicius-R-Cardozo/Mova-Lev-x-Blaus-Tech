-- RLS em todas as tabelas do schema public.
--
-- Modelo de acesso da MOVA LEV:
--   • O navegador NUNCA lê/escreve o banco direto: tudo passa pela API Fastify.
--   • A API conecta com o papel dono das tabelas (postgres), que não é afetado por RLS.
--   • Os papéis `anon` e `authenticated` (chaves públicas do Supabase / PostgREST)
--     ficam sem nenhuma política → acesso negado por padrão, mesmo que alguém use
--     a anon key direto contra o PostgREST.
--
-- Este bloco é idempotente e roda também para tabelas criadas no futuro
-- (execute de novo após novas migrações, ou deixe como migração própria).

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;

-- Tira privilégios diretos dos papéis públicos sobre o schema da loja.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated';
  END IF;
END $$;

-- Storage: o bucket `produtos` é público para LEITURA (URL pública das fotos).
-- Upload/remoção só com a service role (API do admin) — sem políticas de INSERT/UPDATE/DELETE
-- para anon/authenticated em storage.objects.
