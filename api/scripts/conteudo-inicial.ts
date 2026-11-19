/**
 * Cria as páginas de texto da loja no banco com o conteúdo atual (em Markdown).
 * Idempotente: só cria a página que ainda não existe — nunca sobrescreve o que foi
 * editado no painel.
 *
 *   npm run conteudo:inicial -w @movalev/api
 */
import { prisma } from "../src/lib/prisma";

type Seed = { slug: string; title: string; emphasis?: string; kicker: string; intro?: string; seoTitle?: string; seoDescription: string; showToc?: boolean; body: string };

const PAGES: Seed[] = [
  {
    slug: "sobre",
    kicker: "Manifesto",
    title: "Movimento",
    emphasis: "é vida.",
    intro: "Roupas para o corpo que se move — no estúdio, na rua, no tapete da sala e no domingo sem pressa.",
    seoTitle: "Sobre · Manifesto",
    seoDescription: "MOVA LEV: moda fitness feminina para quem pratica e para quem descansa. Movimento é vida.",
    body: `## O que nos move

A MOVA LEV nasceu de uma ideia simples: o movimento não cabe só na hora do treino. Ele está no alongamento ao acordar, na caminhada até o café, na aula de pilates e no respiro antes de dormir. Por isso desenhamos peças que acompanham o dia inteiro — firmes quando o corpo pede, macias quando ele descansa.

Trabalhamos com duas sensações. **Toque Nuvem** é o tecido de toque amanteigado, que abraça sem apertar. **Toque Brisa** é leve, seca rápido e refresca nos dias quentes. Cada coleção combina as duas em uma paleta curta — areia, taupe, verde-oliva e preto — para que todas as peças conversem entre si.

## Como fazemos

- Modelagens testadas em corpos reais, do PP ao GG.
- Costuras planas e cós que não enrola.
- Poucas peças por coleção, pensadas para durar e combinar.
- Troca grátis em até 30 dias, porque caimento é pessoal.

[Ver as novidades da coleção](/colecao/novidades)
`,
  },
  {
    slug: "trocas-e-devolucoes",
    kicker: "Ajuda",
    title: "Trocas, devoluções",
    emphasis: "e entregas",
    intro: "Caimento é pessoal. Se a peça não ficou como você esperava, a primeira troca é por nossa conta.",
    seoTitle: "Trocas, devoluções e entregas",
    seoDescription: "Troca grátis em até 30 dias, devolução em até 7 dias e prazos de entrega da MOVA LEV.",
    showToc: true,
    body: `## Trocas

- **Primeira troca grátis** em até 30 dias corridos após o recebimento.
- A peça deve estar sem uso, sem lavagem, com etiqueta e na embalagem original.
- Você pode trocar por outro tamanho, outra cor ou outra peça. Se houver diferença de valor, ajustamos.
- Por higiene, tops e peças íntimas só são trocados com o protetor de higiene intacto.

## Devoluções (direito de arrependimento)

Pelo Código de Defesa do Consumidor (art. 49), você pode desistir da compra em até **7 dias corridos** após o recebimento, sem precisar explicar o motivo. O frete de devolução é por nossa conta e o valor é reembolsado integralmente.

### Produto com defeito

Encontrou um defeito de fabricação? Fale com a gente em até 90 dias: trocamos a peça ou devolvemos o valor, sem custo.

## Como solicitar

1. Entre em [Minha conta](/conta) e abra o pedido — ou fale com o [atendimento](/contato) informando o número do pedido.
2. Enviamos o código de postagem por e-mail.
3. Leve a peça embalada a uma agência dos Correios ou ponto de coleta.
4. Assim que a peça chegar e for conferida, enviamos a nova peça ou fazemos o reembolso.

## Reembolso

- **Pix:** devolução na mesma conta em até 5 dias úteis após a conferência.
- **Cartão de crédito:** estorno solicitado em até 5 dias úteis; aparece em uma ou duas faturas, conforme o banco.
- **Boleto:** depósito na conta informada por você em até 5 dias úteis.

## Entregas

- **Frete grátis** no envio padrão para compras a partir de R$ 299 (valor já com descontos).
- O prazo começa a contar após a confirmação do pagamento e aparece no checkout, conforme o seu CEP.
- Também é possível escolher a entrega expressa ou retirar na loja, quando disponível.
- O código de rastreio chega por e-mail e fica em [Minha conta](/conta) assim que o pedido é enviado.

Dúvidas? Escreva para [{{email}}](mailto:{{email}}) ou use o [formulário de contato](/contato).
`,
  },
  {
    slug: "politica-de-privacidade",
    kicker: "Legal",
    title: "Política de",
    emphasis: "privacidade",
    intro: "Explicamos aqui, sem juridiquês, quais dados usamos, por quê e como você controla tudo isso, de acordo com a Lei Geral de Proteção de Dados (Lei 13.709/2018).",
    seoTitle: "Política de privacidade",
    seoDescription: "Como a MOVA LEV trata seus dados pessoais, cookies e direitos previstos na LGPD.",
    showToc: true,
    body: `## Quem somos

A loja MOVA LEV é operada por **{{razao_social}}**, CNPJ {{cnpj}}, com sede em {{endereco}}, que é a controladora dos seus dados pessoais.

## Dados que coletamos

- **Cadastro e compra:** nome, e-mail, celular, CPF (opcional, para nota fiscal) e endereço de entrega.
- **Pedido:** peças, valores, forma de pagamento e histórico de status. Dados de cartão são tratados apenas pelo gateway de pagamento — não ficam com a MOVA LEV.
- **Conta:** e-mail de acesso, favoritos, sacola e endereços salvos.
- **Newsletter:** e-mail e data do consentimento.
- **Navegação:** dados técnicos necessários ao funcionamento (como a sacola guardada no navegador) e, só com o seu consentimento, dados de analytics e marketing.

## Para que usamos e com qual base legal

- **Processar e entregar pedidos, trocas e devoluções** — execução de contrato (art. 7º, V).
- **Emitir nota fiscal e cumprir obrigações legais** — obrigação legal (art. 7º, II).
- **Prevenir fraudes e proteger a loja** — legítimo interesse (art. 7º, IX).
- **Enviar novidades e o cupom da newsletter** — consentimento (art. 7º, I), que você pode retirar a qualquer momento.
- **Medir audiência e anúncios (Google Analytics, Meta Pixel)** — consentimento, pelo banner de cookies.

## Com quem compartilhamos

Somente com fornecedores necessários para a loja funcionar, que tratam os dados em nosso nome:

- Hospedagem e banco de dados (Vercel, Render e Supabase);
- Gateway de pagamento e antifraude;
- Transportadoras e Correios, para a entrega;
- Envio de e-mails transacionais;
- Google e Meta, apenas se você aceitar os cookies de analytics/marketing.

Alguns desses fornecedores podem armazenar dados fora do Brasil, sempre com cláusulas de proteção compatíveis com a LGPD. Não vendemos seus dados.

## Cookies

- **Necessários:** sacola, login e preferências de privacidade. Sempre ativos.
- **Analytics:** Google Analytics 4, para entender como a loja é usada. Só com consentimento.
- **Marketing:** Meta Pixel, para medir anúncios. Só com consentimento.

Você pode mudar sua escolha quando quiser:

[[preferencias-cookies]]

## Por quanto tempo guardamos

Dados de pedidos e notas fiscais pelo prazo exigido pela legislação fiscal (5 anos). Dados de conta enquanto ela existir. Newsletter até você cancelar. Depois disso, os dados são excluídos ou anonimizados.

## Seus direitos (art. 18)

Você pode pedir a qualquer momento: confirmação e acesso aos seus dados, correção, anonimização ou exclusão, portabilidade, informação sobre compartilhamentos e revogação do consentimento. Grande parte disso está em [Minha conta](/conta/dados); para o resto, escreva ao encarregado.

## Segurança

Usamos conexão criptografada (HTTPS), controle de acesso por perfil, senhas e chaves fora do código, e o banco de dados bloqueia leitura direta pelo navegador. Nenhum sistema é 100% imune, mas avisaremos você e a ANPD caso ocorra um incidente relevante.

## Encarregado de dados (DPO)

Fale com o encarregado pelo e-mail [{{email_dpo}}](mailto:{{email_dpo}}). Respondemos em até 15 dias.
`,
  },
  {
    slug: "termos-de-uso",
    kicker: "Legal",
    title: "Termos",
    emphasis: "de uso",
    seoTitle: "Termos de uso",
    seoDescription: "Termos de uso da loja MOVA LEV: conta, preços, pagamento, entrega e trocas.",
    showToc: true,
    body: `## Aceite

Ao usar a loja MOVA LEV, operada por {{razao_social}} (CNPJ {{cnpj}}), você concorda com estes termos e com a [Política de privacidade](/politica-de-privacidade).

## Conta

O acesso é feito por link enviado ao seu e-mail (ou login Google). Mantenha seu e-mail seguro: quem tiver acesso a ele pode entrar na sua conta.

## Preços e promoções

- Os preços estão em reais e podem mudar sem aviso; vale o preço exibido no momento da confirmação do pedido.
- O desconto progressivo é aplicado automaticamente pela quantidade de peças. Cupons seguem as regras informadas em cada um e podem não acumular com outras promoções.
- Pagamento no Pix tem {{pix_desconto}}% de desconto sobre o total. Cartão em até {{parcelas}}x sem juros.
- Erros evidentes de preço ou estoque podem levar ao cancelamento do pedido, com reembolso integral.

## Pedido e pagamento

O pedido é criado como “Aguardando pagamento” e as peças ficam reservadas pelo prazo informado no checkout (60 minutos no Pix e cartão; 3 dias úteis no boleto). Sem confirmação do pagamento nesse prazo, o pedido é cancelado automaticamente e as peças voltam ao estoque.

## Entrega, trocas e devoluções

Prazos, frete e regras de troca estão em [Trocas, devoluções e entregas](/trocas-e-devolucoes). Os direitos do Código de Defesa do Consumidor são sempre preservados.

## Propriedade intelectual

Marca, logotipos, fotos, textos e o desenho das peças pertencem à MOVA LEV e não podem ser usados sem autorização.

## Disposições gerais

Estes termos seguem a legislação brasileira. Dúvidas: [fale com a gente](/contato). Fica eleito o foro do domicílio do consumidor.
`,
  },
  {
    slug: "guia-de-tamanhos",
    kicker: "Ajuda",
    title: "Guia de",
    emphasis: "tamanhos",
    intro: "Medidas do corpo, em centímetros. Se ficar entre dois tamanhos, prefira o maior para Toque Nuvem e o menor para mais compressão.",
    seoTitle: "Guia de tamanhos",
    seoDescription: "Tabela de medidas da MOVA LEV, do PP ao GG, e como medir o corpo para escolher o tamanho certo.",
    showToc: true,
    body: `## Tabela de medidas

| Tamanho | Busto | Cintura | Quadril |
| --- | --- | --- | --- |
| PP | 78–82 | 60–64 | 86–90 |
| P | 82–86 | 64–68 | 90–94 |
| M | 86–92 | 68–74 | 94–100 |
| G | 92–98 | 74–80 | 100–106 |
| GG | 98–104 | 80–86 | 106–112 |

## Como medir

1. **Busto:** passe a fita na parte mais cheia do busto, mantendo-a reta nas costas.
2. **Cintura:** meça a parte mais fina do tronco, um pouco acima do umbigo.
3. **Quadril:** meça a parte mais larga, com os pés juntos.

Use roupas leves, fita métrica sem apertar e respire normalmente.

## Dicas por peça

- **Leggings e shorts:** guie-se pela cintura e pelo quadril.
- **Tops:** guie-se pelo busto. As alças são reguláveis.
- **Macaquinhos:** confira busto e quadril; o tecido acompanha o tronco.
- **Casacos:** modelagem ampla — escolha o seu tamanho habitual.

Ficou na dúvida? A primeira troca é grátis em até 30 dias. [Veja como funciona](/trocas-e-devolucoes).
`,
  },
  {
    slug: "contato",
    kicker: "Ajuda",
    title: "Fale",
    emphasis: "com a gente",
    intro: "Respondemos em até 1 dia útil. Se for sobre um pedido, informe o número — ele está no e-mail de confirmação.",
    seoTitle: "Contato",
    seoDescription: "Fale com o atendimento da MOVA LEV: pedidos, trocas, tamanhos e parcerias.",
    body: `## Canais

- E-mail: [{{email}}](mailto:{{email}})
- WhatsApp: {{whatsapp?}}
- Instagram: [@mova.lev]({{instagram}})
- Atendimento: {{horario}}

Antes de escrever, talvez a resposta esteja em [Trocas e entregas](/trocas-e-devolucoes) ou no [Guia de tamanhos](/guia-de-tamanhos).

## Envie uma mensagem

[[formulario-contato]]
`,
  },
];

async function main() {
  let created = 0;
  for (const p of PAGES) {
    const exists = await prisma.page.findUnique({ where: { slug: p.slug }, select: { id: true } });
    if (exists) continue;
    await prisma.page.create({ data: { ...p, emphasis: p.emphasis ?? null, intro: p.intro ?? null, showToc: p.showToc ?? false, system: true, published: true, updatedBy: "conteudo:inicial" } });
    created++;
  }
  console.log(`Páginas criadas: ${created} (já existiam: ${PAGES.length - created}).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
