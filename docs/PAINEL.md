# Painel administrativo — guia

Endereço: **`/admin`**. Na loja publicada, **https://mova-lev.vercel.app/admin** (o login fica em `/admin/login`).

## 1. Criar o primeiro administrador

O painel não tem cadastro aberto. A primeira pessoa é criada pelo terminal, na pasta do projeto, com o `.env` da API preenchido:

```
npm run admin:criar -w @movalev/api -- seu-email@dominio.com "Seu nome" ADMIN
```

- Cria a conta já confirmada no Supabase Auth (ou promove uma conta de cliente que já existe com esse e-mail).
- Mostra uma **senha provisória uma única vez**. Guarde até o primeiro login.
- No primeiro acesso, o painel pede para **cadastrar o autenticador** (Google Authenticator, Microsoft Authenticator, 1Password, Authy…) lendo o QR code, e depois para **trocar a senha**.

A partir daí, novas pessoas são convidadas pelo próprio painel em **Configurações › Usuários**, sem usar o terminal.

Para criar as páginas de texto da loja num banco novo (Sobre, Trocas, Privacidade, Termos, Guia de tamanhos e Contato): `npm run conteudo:inicial -w @movalev/api`. O comando não sobrescreve as páginas que já existem.

## 2. Papéis

| Área | Administrador | Editor |
|---|:-:|:-:|
| Produtos, fotos, variações, preços e SEO | ✓ | ✓ |
| Estoque (ajustes, entradas, histórico) | ✓ | ✓ |
| Categorias e coleções | ✓ | ✓ |
| Conteúdo: home, páginas, topo, menu e rodapé | ✓ | ✓ |
| Resumo (dashboard), pedidos, clientes e cupons | ✓ | — |
| Dados da loja, pagamentos, frete e desconto | ✓ | — |
| Usuários, atividades (auditoria) e newsletter | ✓ | — |

O Editor nem vê no menu as áreas que não pode usar. Mesmo que alguém digite o endereço ou chame a API direto, a API responde "proibido". Quem perde o acesso ao painel continua com a conta de cliente da loja.

## 3. Segurança

- **Proteção no servidor:** o Next confere a sessão antes de entregar qualquer página `/admin`. A API confere, em **toda** chamada, o papel (lido do banco, então uma mudança vale na hora), o 2º fator e a idade da sessão.
- **Dois fatores obrigatórios** (senha + código do aplicativo). Se alguém perder o celular, outro Admin usa **Usuários › Redefinir 2º fator**.
- **Sessão do painel expira** em 12 h desde o login (`ADMIN_SESSION_HOURS`). Também sai sozinha após **30 min sem uso**.
- **Senhas:** guardadas com hash pelo Supabase Auth. Mínimo de 10 caracteres, com letras e números, e sem conter o e-mail. Senha provisória obriga a troca no primeiro acesso.
- **Força bruta:** 5 erros no mesmo e-mail ou 20 no mesmo IP bloqueiam o login por 15 min. Há também um limite de 10 tentativas por minuto.
- **Envio duplicado:** toda gravação do painel leva uma chave única. Um clique duplo ou o reenvio da mesma ação não grava duas vezes. Os botões também ficam travados enquanto salvam.
- **Auditoria** (Configurações › Atividades): quem fez o quê e quando, com antes e depois. Cobre preço, estoque, exclusões, status de pedido, estornos, cupons, configurações, usuários, conteúdo e logins.
- **Exclusões:** sempre pedem confirmação. Produtos e coleções são **arquivados** (dá para restaurar). Só é possível apagar de vez um produto que nunca foi vendido.
- **Validação nos dois lados:** o formulário avisa o erro no campo e a API valida de novo com as mesmas regras. Links aceitam só caminhos da loja (`/…`), `https://`, `mailto:` e `tel:`.

Testes feitos em 18/11/2026 (44 verificações, todas ok):
- acesso sem login e com token forjado;
- sessão sem 2º fator;
- Editor tentando ler e gravar em áreas de Admin;
- cliente comum com token válido;
- Admin tentando rebaixar a si mesmo;
- gravação sem chave, chave repetida e chave reaproveitada com outro conteúdo;
- link `javascript:` e preço negativo;
- bloqueio após 5 senhas erradas.

## 4. Módulos

- **Resumo:** vendas do dia, da semana e do mês, ticket médio, pedidos por status, mais vendidos e estoque baixo (horário de Brasília).
- **Pedidos:** filtros por status, data e busca. Muda o status, informa o código de rastreio, cancela com motivo (o estoque volta) e registra estornos, totais ou parciais. Exporta CSV.
- **Clientes:** lista com total gasto e número de pedidos, e a ficha com histórico.
- **Cupons:** % ou valor fixo, validade, compra mínima, limite de usos, só 1ª compra e acúmulo com o desconto progressivo. Mostra quem usou.
- **Produtos:**
  - cadastro completo: fotos com compressão automática no navegador, variações cor × tamanho com SKU e estoque, preço e preço promocional, categoria e coleções, SEO;
  - status Ativo, Oculto (só por link direto) ou Rascunho;
  - duplicar, arquivar e restaurar.
- **Estoque:**
  - ajuste com motivo (entrada, saída, ajuste, devolução);
  - alerta de estoque baixo (o limite é configurável);
  - histórico de movimentações;
  - baixa automática na venda e devolução no cancelamento.
- **Categorias e coleções:** ordem, foto de capa, descrição, aparecer no menu, arquivar.
- **Conteúdo › Home:** textos, vídeo e imagens do topo da home, campanha, Compre o look, sensações, Studio e Instagram.
- **Conteúdo › Páginas:**
  - textos em Markdown com prévia ao lado;
  - botões que inserem os dados da loja (`{{email}}`, `{{cnpj}}`…) e componentes (formulário de contato, preferências de cookies);
  - páginas extras ficam em `/pagina/endereço` e podem ficar como rascunho.
- **Conteúdo › Topo, menu e rodapé:** barra de aviso (liga e desliga), links do menu, faixa de vantagens da home e colunas e textos do rodapé.
- **Configurações:**
  - dados da loja (empresa, atendimento, redes sociais);
  - pagamentos (Pix e desconto, cartão e parcelas, boleto);
  - frete e desconto progressivo;
  - usuários;
  - atividades;
  - newsletter.

Tudo o que é salvo aparece no site em segundos: o painel avisa a loja para atualizar as páginas afetadas.
