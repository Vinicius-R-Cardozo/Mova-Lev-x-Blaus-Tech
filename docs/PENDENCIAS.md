# MOVA LEV — o que falta (17/11/2026)

## 1. Para publicar (fase 7) — depende de você
- [x] **GitHub:** código enviado para github.com/Vinicius-R-Cardozo/Mova-Lev-x-Blaus-Tech (público).
- [x] **Vercel:** loja publicada em **https://mova-lev.vercel.app** (projeto `mova-lev`, raiz `web`, ligado ao GitHub — cada push na `main` publica). Supabase Auth já aponta para esse endereço.
- [x] **Render:** API no ar em **https://mova-lev-x-blaus-tech.onrender.com** (plano Free, região Oregon). Loja apontando para ela.
- [x] **Deploy automático do Render** funcionando (app do Render com acesso ao repositório; testado em 18/11 com o commit 0ca34ce, publicado em ~2 min). O `/health` mostra o commit no ar.
- [ ] **`DATABASE_URL` no Render ainda está no modo transação (porta 6543).** A API contorna sozinha usando a `DIRECT_URL` (modo sessão), mas o certo é corrigir o valor em Environment (deve terminar em `:5432/postgres?connection_limit=5`).
- [ ] (Opcional) Recriar a API na região **Virginia**: ~120 ms por ida e volta ao banco em vez de ~180 ms (Oregon). O Render não tem região no Brasil.
- [ ] Plano Free do Render: a API dorme após 15 min sem uso e a 1ª visita depois disso espera ~50 s. Para vender, plano **Starter** (US$ 7/mês).
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
