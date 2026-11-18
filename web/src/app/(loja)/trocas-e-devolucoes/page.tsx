import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/institutional/InfoPage";
import { getCompany } from "@/lib/company";

export const metadata: Metadata = {
  title: "Trocas, devoluções e entregas",
  description: "Troca grátis em até 30 dias, devolução em até 7 dias e prazos de entrega da MOVA LEV.",
  alternates: { canonical: "/trocas-e-devolucoes" },
};

export default async function TrocasPage() {
  const COMPANY = await getCompany();
  return (
    <InfoPage
      slug="trocas-e-devolucoes"
      kicker="Ajuda"
      title="Trocas, devoluções"
      emphasis="e entregas"
      intro="Caimento é pessoal. Se a peça não ficou como você esperava, a primeira troca é por nossa conta."
      toc={[
        { id: "trocas", label: "Trocas" },
        { id: "devolucoes", label: "Devoluções" },
        { id: "como-solicitar", label: "Como solicitar" },
        { id: "reembolso", label: "Reembolso" },
        { id: "entregas", label: "Entregas" },
      ]}
    >
      <h2 id="trocas">Trocas</h2>
      <ul>
        <li><strong>Primeira troca grátis</strong> em até 30 dias corridos após o recebimento.</li>
        <li>A peça deve estar sem uso, sem lavagem, com etiqueta e na embalagem original.</li>
        <li>Você pode trocar por outro tamanho, outra cor ou outra peça. Se houver diferença de valor, ajustamos.</li>
        <li>Por higiene, tops e peças íntimas só são trocados com o protetor de higiene intacto.</li>
      </ul>
      <h2 id="devolucoes">Devoluções (direito de arrependimento)</h2>
      <p>
        Pelo Código de Defesa do Consumidor (art. 49), você pode desistir da compra em até <strong>7 dias corridos</strong> após o recebimento, sem precisar explicar o motivo. O frete
        de devolução é por nossa conta e o valor é reembolsado integralmente.
      </p>
      <h3>Produto com defeito</h3>
      <p>Encontrou um defeito de fabricação? Fale com a gente em até 90 dias: trocamos a peça ou devolvemos o valor, sem custo.</p>
      <h2 id="como-solicitar">Como solicitar</h2>
      <ol>
        <li>Entre em <Link href="/conta">Minha conta</Link> e abra o pedido — ou fale com o <Link href="/contato">atendimento</Link> informando o número do pedido.</li>
        <li>Enviamos o código de postagem por e-mail.</li>
        <li>Leve a peça embalada a uma agência dos Correios ou ponto de coleta.</li>
        <li>Assim que a peça chegar e for conferida, enviamos a nova peça ou fazemos o reembolso.</li>
      </ol>
      <h2 id="reembolso">Reembolso</h2>
      <ul>
        <li><strong>Pix:</strong> devolução na mesma conta em até 5 dias úteis após a conferência.</li>
        <li><strong>Cartão de crédito:</strong> estorno solicitado em até 5 dias úteis; aparece em uma ou duas faturas, conforme o banco.</li>
        <li><strong>Boleto:</strong> depósito na conta informada por você em até 5 dias úteis.</li>
      </ul>
      <h2 id="entregas">Entregas</h2>
      <ul>
        <li><strong>Frete grátis</strong> no envio padrão para compras a partir de R$ 299 (valor já com descontos).</li>
        <li>O prazo começa a contar após a confirmação do pagamento e aparece no checkout, conforme o seu CEP.</li>
        <li>Também é possível escolher a entrega expressa ou retirar na loja, quando disponível.</li>
        <li>O código de rastreio chega por e-mail e fica em <Link href="/conta">Minha conta</Link> assim que o pedido é enviado.</li>
      </ul>
      <p>
        Dúvidas? Escreva para <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> ou use o <Link href="/contato">formulário de contato</Link>.
      </p>
    </InfoPage>
  );
}
