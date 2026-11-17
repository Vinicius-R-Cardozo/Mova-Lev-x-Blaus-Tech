# MOVA LEV — o que falta (17/11/2026)

## 1. Para publicar (fase 7) — depende de você
- [x] **GitHub:** código enviado para github.com/Vinicius-R-Cardozo/Mova-Lev-x-Blaus-Tech (público).
- [x] **Vercel:** loja publicada em **https://mova-lev.vercel.app** (projeto `mova-lev`, raiz `web`, ligado ao GitHub — cada push na `main` publica). Supabase Auth já aponta para esse endereço.
- [ ] **Render:** criar a conta entrando com o GitHub → **New → Blueprint** → repositório `Mova-Lev-x-Blaus-Tech` → preencher:
  - `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_SERVICE_ROLE_KEY`: copiar as linhas de mesmo nome do `api/.env`;
  - `REVALIDATE_SECRET`: copiar do arquivo `.env.render.local` (raiz do projeto);
  - `SITE_URL` e `CORS_ORIGINS`: `https://mova-lev.vercel.app`;
  - `WEB_REVALIDATE_URL`: `https://mova-lev.vercel.app/api/revalidate`;
  - `ADMIN_EMAILS`: seu e-mail; `RESEND_API_KEY` e `STORE_EMAIL`: deixar vazios por enquanto.
- [ ] Me passar a URL que o Render der para a API → eu ajusto `NEXT_PUBLIC_API_URL` na Vercel (hoje: `https://movalev-api.onrender.com`) e publico de novo. Até lá, Home e categorias dão erro (sem API).
- [ ] **Domínio:** quando registrar, me passe o nome e o acesso ao DNS → eu ligo HTTPS, `www` → raiz, login por e-mail e sitemap.

## 2. Contas e chaves para criar (quando puder)
- [ ] **Gateway de pagamento** (Mercado Pago, Pagar.me, Asaas…) — escolher e abrir a conta da empresa.
- [ ] **Frete** (Melhor Envio, Frenet ou Correios) — escolher a transportadora.
- [ ] **Resend** (e-mails de pedido) — exige o domínio para verificar SPF/DKIM.
- [ ] **SMTP no Supabase Auth** (pode ser o próprio Resend) — o padrão envia poucos links de login por hora.
- [ ] **Google OAuth** (opcional) — para o botão “Entrar com Google”.
- [ ] **GA4** e **Meta Pixel** (opcionais) — só carregam com consentimento.

## 3. Dados e conteúdo
- [ ] Dados da empresa para as páginas legais: **razão social, CNPJ, endereço, e-mail de atendimento, e-mail do encarregado (DPO), WhatsApp e horário**.
- [ ] E-mail que recebe o **formulário de contato** (`STORE_EMAIL`).
- [ ] **Endereço da loja** para “Retirar na loja” (admin → Desconto e frete).
- [ ] Conferir a **tabela do Guia de tamanhos** com a modelagem oficial.
- [ ] Confirmar **preços e estoques reais** (os do seed são ilustrativos).
- [ ] **Fotos e vídeos** reais pelo admin (produtos); URL do **vídeo do hero** e da **foto do Compre o look**.
- [ ] Revisão jurídica da **Política de privacidade** e dos **Termos de uso**.

## 4. Seu acesso de admin
- [ ] Entrar em `/conta` com o seu e-mail (link mágico) → me avisar → eu promovo para admin.

## 5. Depois do seu teste local
- [ ] Me avisar para **apagar os pedidos de teste** e voltar a numeração para #1001.

## 6. Melhorias opcionais (decidir se quer)
- [ ] Trocar o tamanho dentro da sacola (hoje: remover e adicionar de novo).
- [ ] Avaliações de produto (hoje aparece “Ainda sem avaliações”).
- [ ] Upload direto do vídeo do hero e da foto do Compre o look no admin (hoje é por URL).
- [ ] Logo em PNG no cabeçalho dos e-mails (hoje o nome vai em texto).
- [ ] Trava no banco para o cupom de 1ª compra em pedidos simultâneos do mesmo e-mail.
- [ ] Redis para rate limit e cache compartilhados quando houver mais de uma instância da API.
- [ ] Hospedar a API mais perto do Supabase (São Paulo) — o Render não tem região no Brasil.

## O que eu faço quando você liberar
| Você entrega | Eu faço |
|---|---|
| GitHub + Render logados | repositório privado, API no Render, loja na Vercel, Supabase Auth com as URLs |
| Domínio + DNS | domínio na Vercel, HTTPS, `www` → raiz, CORS, sitemap, links de login |
| Gateway escolhido + chaves de sandbox | `PaymentProvider` real, webhook assinado, QR Pix/boleto na confirmação |
| Transportadora + chave | `ShippingProvider` real (cotação e rastreio), peso/medidas no admin |
| Resend + domínio verificado | envio real dos e-mails de pedido e contato |

Passo a passo técnico do deploy: [DEPLOY.md](DEPLOY.md) · Pagamento e frete: [PAGAMENTO-E-FRETE.md](PAGAMENTO-E-FRETE.md)
