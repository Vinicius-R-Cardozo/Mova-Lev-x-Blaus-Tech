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

## API (resumo)

| Rota | Uso |
|---|---|
| `GET /health` | health check do Render (confere o banco) |
| `GET /catalog/home` | conteúdo da Home + vitrines |
| `GET /catalog/categories` | categorias (menu, atalhos) |
| `GET /catalog/categories/:slug/products` | grade com filtros `modelo`, `sensacao`, `cor`, `tamanho`, `precoMin`, `precoMax`, `ordem`, `pagina` |
| `GET /catalog/products/:slug` | produto, cores, estoque por tamanho, Complete o look |
| `GET /catalog/search?q=` | busca por nome |
| `POST /cart/quote` | orçamento da sacola: preço, estoque, progressivo, cupom e frete grátis recalculados no servidor |
| `GET/PUT /cart`, `POST /cart/merge` | sacola da conta (login); o merge usa o maior valor por item, repetir não duplica |
| `POST /checkout/quote` | resumo do checkout com CEP (ViaCEP), opções de frete e total final |
| `POST /orders` | cria o pedido "Aguardando pagamento" e reserva estoque (exige `Idempotency-Key`, 10/min) |
| `GET /orders/:id?t=` | confirmação do pedido (token do link ou dona logada) |
| `POST /payments/webhook/:provider` | aviso do gateway (assinatura validada) |
| `POST /newsletter` | assinatura (exige `Idempotency-Key`, 5/min por IP) |
| `GET/PATCH /me`, `/me/orders`, `/me/addresses`, `/me/favorites` | área do cliente (JWT do Supabase) |
| `/admin/*` | painel: produtos, variantes, fotos, pedidos, cupons, regras, Home, newsletter (papel ADMIN) |

Pagamento, frete e e-mail: veja [docs/PAGAMENTO-E-FRETE.md](docs/PAGAMENTO-E-FRETE.md).

## Área do cliente e admin

- `/conta`: login sem senha (link mágico) ou Google; pedidos (inclusive os feitos como visitante com o mesmo e-mail), endereços, favoritos e dados.
- `/admin`: só para perfis com papel `ADMIN`. Para virar admin: coloque o e-mail em `ADMIN_EMAILS` (api/.env), entre uma vez na loja e rode `npm run db:seed`.
- Google: crie o OAuth client no Google Cloud, ative em `[auth.external.google]` do `supabase/config.toml` e defina `NEXT_PUBLIC_AUTH_GOOGLE=true` na loja.
- Mudanças no admin atualizam o cache da loja na hora (`/api/revalidate`, segredo `REVALIDATE_SECRET` igual na API e na loja).

## Supabase

Projeto `movalev` (ref `cxmkuqkhvdhwvrdkzckk`, São Paulo) na organização lux drive.
Os `.env` locais já apontam para ele; a senha do banco está só em `api/.env` (guarde num gerenciador de senhas).

- Auth: link mágico por e-mail; tokens ES256 validados na API pelas chaves públicas (JWKS).
  Redirecionamentos liberados para `localhost:3000` — o domínio da loja entra na fase 7.
  Configuração em `supabase/config.toml` (`supabase config push` aplica no projeto).
- Storage: bucket público `produtos` (leitura pública; upload só pela API com a service role).
- Login com Google: falta criar o OAuth client no Google Cloud e ligar em `[auth.external.google]`.
- A API usa a `service_role` **legada** (JWT): a chave nova `sb_secret_` ainda é recusada pelo Storage.

## Decisões

- **Next.js 15.5** em vez de 14: a linha 14 está sem suporte e tem falhas críticas de
  execução remota sem correção. O código usa só o App Router, igual ao pedido.
- **Dinheiro em centavos** (inteiros) no banco, na API e no front.
- **Preço, desconto, cupom e frete sempre recalculados na API** com `packages/shared/pricing.ts`.
- **RLS ativado em todas as tabelas** sem políticas para `anon`/`authenticated`: o navegador
  nunca lê o banco direto, só pela API (que usa o papel dono das tabelas).
- **Idempotência**: pedidos e newsletter exigem o header `Idempotency-Key`; a chave é única no banco.
