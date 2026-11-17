# Deploy da MOVA LEV

```
Navegador ──► Vercel (loja Next.js, região iad1) ──► Render (API Fastify, Virginia) ──► Supabase (São Paulo)
                     ▲                                       │
                     └──── /api/revalidate (cache) ◄─────────┘
```

## 1. Repositório

O código está em **github.com/Vinicius-R-Cardozo/Mova-Lev-x-Blaus-Tech** (branch `main`). Cada push na `main`
publica de novo a API (Render) e a loja (Vercel).

## 2. API no Render — plano Free (atual)

1. Entre em render.com com o GitHub e autorize o repositório.
2. **New → Blueprint** → escolha o repositório. O `render.yaml` cria o serviço `movalev-api`:
   - plano **Free**, região Virginia, health check em `/health`;
   - build instala, compila a API e aplica as migrações (`prisma migrate deploy`);
   - expiração de pedidos **dentro da API** a cada 5 min e ao acordar (`EXPIRE_ORDERS_INTERVAL_MINUTES=5`).
3. Preencha os segredos pedidos (`sync: false`):

| Variável | Valor |
|---|---|
| `DATABASE_URL` | pooler do Supabase **porta 6543** + `?pgbouncer=true&connection_limit=5` (o mesmo do `api/.env`) |
| `DIRECT_URL` | pooler **porta 5432** (migrações; o mesmo do `api/.env`) |
| `SUPABASE_SERVICE_ROLE_KEY` | chave `service_role` **legada** (JWT) — a `sb_secret_` é recusada pelo Storage |
| `SITE_URL` | URL da loja na Vercel (depois, o domínio) |
| `CORS_ORIGINS` | URL da loja na Vercel (depois: `https://SEU-DOMINIO,https://www.SEU-DOMINIO`) |
| `WEB_REVALIDATE_URL` | `<URL da loja>/api/revalidate` |
| `REVALIDATE_SECRET` | segredo longo (o mesmo da Vercel) |
| `RESEND_API_KEY` | vazio por enquanto (sem Resend, os e-mails ficam só no log) |
| `STORE_EMAIL` | caixa que recebe o formulário de contato (pode ficar vazio) |
| `ADMIN_EMAILS` | e-mails que viram admin ao rodar o seed |

4. Anote a URL da API (ex.: `https://movalev-api.onrender.com`).

**Limites do Free:** a API hiberna após 15 min sem acesso e a primeira chamada depois disso leva ~50 s;
750 h/mês de instância. Serve para homologação, não para vender.

### Subir para o plano pago (produção)

No `render.yaml`: `plan: starter`, tire `npm run db:deploy` do `buildCommand` e use
`preDeployCommand: npm run db:deploy -w @movalev/api`; remova `EXPIRE_ORDERS_INTERVAL_MINUTES` e adicione o Cron Job:

```yaml
  - type: cron
    name: movalev-expirar-pedidos
    runtime: node
    region: virginia
    plan: starter
    schedule: "*/5 * * * *"
    buildCommand: npm ci --include=dev && npm run build -w @movalev/api
    startCommand: node api/dist/jobs/expire-orders.js
    envVars: # DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_URL, NODE_ENV=production
```

## 3. Loja na Vercel

1. Vercel → **Add New → Project** → mesmo repositório → **Root Directory: `web`** (framework Next.js é detectado; a instalação roda na raiz do monorepo).
2. Variáveis (Production):

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://SEU-DOMINIO` |
| `NEXT_PUBLIC_API_URL` | URL pública da API no Render |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://cxmkuqkhvdhwvrdkzckk.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave pública (publishable) |
| `REVALIDATE_SECRET` | o mesmo da API |
| `NEXT_PUBLIC_CNPJ`, `NEXT_PUBLIC_RAZAO_SOCIAL`, `NEXT_PUBLIC_ENDERECO`, `NEXT_PUBLIC_EMAIL_CONTATO`, `NEXT_PUBLIC_EMAIL_DPO`, `NEXT_PUBLIC_WHATSAPP` | dados da empresa (páginas legais) |
| `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_META_PIXEL_ID` | opcionais — só carregam com consentimento |
| `NEXT_PUBLIC_AUTH_GOOGLE` | `true` depois de ativar o Google no Supabase |

3. **Domínios:** adicione `SEU-DOMINIO` e `www.SEU-DOMINIO`. No registrador, aponte:
   - `@` → registro **A** `76.76.21.21`
   - `www` → **CNAME** `cname.vercel-dns.com`

   O HTTPS é emitido automaticamente. O `www` é redirecionado para o domínio raiz (308) pela própria loja.

> Plano: o Hobby da Vercel é só para uso **não comercial**. Loja em produção pede o plano **Pro**.

## 4. Supabase Auth com o domínio

Em `supabase/config.toml`: `site_url = "https://SEU-DOMINIO"` e inclua `https://SEU-DOMINIO/**` e
`https://www.SEU-DOMINIO/**` em `additional_redirect_urls`. Depois:

```bash
supabase config push   # confira o diff antes de confirmar
```

Os links de acesso por e-mail usam o `site_url`. Para o e-mail sair do seu domínio (e sem o limite
de poucos e-mails/hora do SMTP padrão), configure **SMTP próprio** (ex.: Resend) em Authentication → SMTP.

## 5. Depois do primeiro deploy

1. Abra `https://SEU-DOMINIO` e entre em `/conta` com o e-mail de `ADMIN_EMAILS`.
2. Rode o seed apontando para produção (promove o admin; não apaga pedidos): `npm run db:seed`.
3. Em `/admin → Desconto e frete`, preencha o **endereço da loja** (retirada).
4. Faça um pedido de teste e cancele no admin (o estoque volta).

## Checklist para ligar pagamento e frete reais

### Pagamento
- [ ] Escolher o gateway (Mercado Pago, Pagar.me, Asaas, Stripe…) e abrir a conta da empresa.
- [ ] Implementar `api/src/providers/payment/<Gateway>PaymentProvider.ts` (contrato em `PaymentProvider.ts`) e trocar em `index.ts`.
- [ ] Cartão: tokenização no navegador com o SDK do gateway na etapa 3 do checkout (número do cartão nunca passa pela API) e ajustar a CSP (`script-src`/`connect-src`/`frame-src`) para o domínio do gateway.
- [ ] Cadastrar o webhook `https://API/payments/webhook/<gateway>` e validar a assinatura em `processarWebhook`.
- [ ] Mostrar QR Code do Pix / linha do boleto reais na confirmação e no e-mail (vêm em `paymentPayload`).
- [ ] Remover o aviso “Ambiente de demonstração” da etapa de pagamento e apagar `MOCK_WEBHOOK_SECRET`.
- [ ] Testar no sandbox: Pix pago, boleto vencido (estoque volta), cartão recusado.

### Frete
- [ ] Escolher a transportadora/agregador (Melhor Envio, Frenet, Correios).
- [ ] Cadastrar peso e dimensões por produto/variante (novos campos no admin).
- [ ] Implementar `api/src/providers/shipping/<X>ShippingProvider.ts` (`cotar` e `rastrear`) e trocar em `index.ts`.
- [ ] Manter `eligibleForFree: true` no serviço que fica grátis acima de R$ 299.
- [ ] Gerar etiqueta/código de rastreio no fluxo “Em separação → Enviado” do admin.

### Antes de abrir para o público
- [ ] Dados da empresa nas variáveis `NEXT_PUBLIC_*` (CNPJ, razão social, endereço, e-mails).
- [ ] Revisar a tabela do Guia de tamanhos com a modelagem oficial.
- [ ] Fotos e vídeo reais pelo admin (substituem os placeholders).
- [ ] Domínio verificado no Resend (SPF/DKIM) e SMTP próprio no Supabase Auth.
- [ ] Google OAuth (opcional) e `NEXT_PUBLIC_AUTH_GOOGLE=true`.
- [ ] Revisão jurídica da Política de privacidade e dos Termos.
