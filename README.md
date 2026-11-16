# MOVA LEV — loja virtual

Moda fitness feminina. Monorepo com a loja (Next.js), a API (Fastify) e o código compartilhado.

```
web/               Next.js 15 (App Router) + TypeScript + Tailwind — Vercel
api/               Fastify + Prisma — Render (Web Service + Cron Job)
packages/shared/   tipos, schemas Zod e regras de preço (pricing.ts)
supabase/          config do Supabase local (Postgres, Auth, Storage)
docs/              decisões e checklists
```

## Rodando localmente

Pré-requisitos: Node 20+ (recomendado 22), Docker Desktop e Supabase CLI.

```bash
npm install
npm run db:start              # sobe Postgres/Auth/Storage locais (Docker)
cp api/.env.example api/.env  # cole a service_role key exibida pelo db:start
cp web/.env.example web/.env.local  # cole a anon key
npm run db:migrate            # cria as tabelas (Prisma) + RLS
npm run db:seed               # produtos, estoques, frete, conteúdo da Home, bucket
npm run dev                   # API em :4000 e loja em :3000
```

**Sem Docker** (máquina sem virtualização): `npm run db:local` sobe um Postgres 17 nativo na
mesma porta (54322), com os papéis `anon`/`authenticated` do Supabase. Migração, RLS, seed e API
funcionam igual; login e upload de fotos exigem um projeto Supabase (local com Docker ou na nuvem).

- Studio do Supabase: http://127.0.0.1:54323
- E-mails locais (links mágicos): http://127.0.0.1:54324
- Admin local: `admin@movalev.test` (entra por link mágico).
- Testes das regras de preço: `npm test`.

## Decisões

- **Next.js 15.5** em vez de 14: a linha 14 está sem suporte e tem falhas críticas de
  execução remota sem correção. O código usa só o App Router, igual ao pedido.
- **Dinheiro em centavos** (inteiros) no banco, na API e no front.
- **Preço, desconto, cupom e frete sempre recalculados na API** com `packages/shared/pricing.ts`.
- **RLS ativado em todas as tabelas** sem políticas para `anon`/`authenticated`: o navegador
  nunca lê o banco direto, só pela API (que usa o papel dono das tabelas).
- **Idempotência**: pedidos e newsletter exigem o header `Idempotency-Key`; a chave é única no banco.
