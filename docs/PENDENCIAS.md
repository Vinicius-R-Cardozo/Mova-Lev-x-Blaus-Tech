# MOVA LEV — o que falta (18/11/2026)

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
- [ ] Dados da empresa para as páginas legais: **razão social, CNPJ, endereço, e-mail de atendimento, e-mail do encarregado (DPO), WhatsApp e horário** — preencher no painel em **Configurações › Dados da loja** (enquanto vazios, o site mostra “[a preencher: …]”).
- [ ] E-mail que recebe o **formulário de contato** (`STORE_EMAIL`).
- [ ] **Endereço da loja** para “Retirar na loja” (painel → Configurações › Frete e desconto).
- [ ] Conferir a **tabela do Guia de tamanhos** com a modelagem oficial (painel → Conteúdo › Páginas › Guia de tamanhos).
- [ ] Confirmar **preços e estoques reais** (os do seed são ilustrativos).
- [ ] **Fotos e vídeos** reais pelo admin (produtos); URL do **vídeo do hero** e da **foto do Compre o look**.
- [ ] **Fotos de demonstração no ar (fictícias, Unsplash — licença gratuita):** produtos, banners das categorias e home. Fotos enviadas pelo admin têm prioridade e não são sobrescritas. Para tirar todas de uma vez: `npm run demo:fotos -w @movalev/api -- --remover` (volta aos desenhos e restaura a home).
- [ ] Revisão jurídica da **Política de privacidade** e dos **Termos de uso**.

## 4. Painel administrativo — guia completo em [PAINEL.md](PAINEL.md)
- [ ] **Criar o seu acesso de Admin:** `npm run admin:criar -w @movalev/api -- seu-email@dominio.com "Seu nome" ADMIN` → entrar em `/admin/login` com a senha provisória → cadastrar o autenticador → trocar a senha.
- [ ] **Apagar as 2 contas de teste do painel** (`painel.admin.teste@example.com` e `painel.editor.teste@example.com`) depois que o seu acesso funcionar: Configurações › Usuários › Tirar acesso, e excluir as contas no Supabase (Authentication › Users). Apagar também o arquivo `.env.contas-teste.local`.
- [ ] **Estorno real:** hoje o botão Estornar registra o estorno e simula no provedor de teste. Com o gateway escolhido, ele passa a devolver o dinheiro de verdade (`PaymentProvider.estornar`).
- [ ] (Opcional) Desligar o 2º fator só em desenvolvimento com `ADMIN_MFA_REQUIRED=false` no `.env` da API. **Nunca em produção.**

## 5. Depois do seu teste local
- [ ] Me avisar para **apagar os pedidos de teste** e voltar a numeração para #1001.

## 6. Melhorias opcionais (decidir se quer)
- [ ] Trocar o tamanho dentro da sacola (hoje: remover e adicionar de novo).
- [ ] Avaliações de produto (hoje aparece “Ainda sem avaliações”).
- [ ] Upload direto do vídeo do hero e da foto do Compre o look no painel (hoje é por URL).
- [ ] Histórico de versões das páginas de texto (hoje a auditoria guarda o antes e depois dos primeiros 2.000 caracteres).
- [ ] E-mail automático de “estoque baixo” para o Admin (hoje o alerta aparece no Resumo e no Estoque).
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
