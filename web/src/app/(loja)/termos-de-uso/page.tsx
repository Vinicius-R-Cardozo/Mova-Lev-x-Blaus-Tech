import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/institutional/InfoPage";
import { getCompany } from "@/lib/company";
import { api } from "@/lib/api";

export const metadata: Metadata = {
  title: "Termos de uso",
  description: "Condições de uso da loja MOVA LEV: compras, preços, pagamentos, entregas e responsabilidades.",
  alternates: { canonical: "/termos-de-uso" },
};

export default async function TermosPage() {
  const [COMPANY, cfg] = await Promise.all([getCompany(), api.store().catch(() => null)]);
  const pay = cfg?.payments;
  const payTerms = [
    pay?.pixEnabled !== false && (pay?.pixDiscountPercent ?? 5) > 0 ? `Pagamento no Pix tem ${pay?.pixDiscountPercent ?? 5}% de desconto sobre o total.` : null,
    pay?.cardEnabled !== false && (pay?.maxInstallments ?? 6) > 1 ? `Cartão em até ${pay?.maxInstallments ?? 6}x sem juros.` : null,
  ].filter(Boolean).join(" ") || "Formas de pagamento conforme exibidas no checkout.";
  return (
    <InfoPage
      slug="termos-de-uso"
      kicker="Legal"
      title="Termos"
      emphasis="de uso"
      updatedAt="16 de novembro de 2026"
      toc={[
        { id: "aceite", label: "Aceite" },
        { id: "conta", label: "Conta" },
        { id: "precos", label: "Preços e promoções" },
        { id: "pedido", label: "Pedido e pagamento" },
        { id: "entrega", label: "Entrega e trocas" },
        { id: "propriedade", label: "Propriedade intelectual" },
        { id: "foro", label: "Disposições gerais" },
      ]}
    >
      <h2 id="aceite">Aceite</h2>
      <p>
        Ao usar a loja MOVA LEV, operada por {COMPANY.legalName} (CNPJ {COMPANY.cnpj}), você concorda com estes termos e com a <Link href="/politica-de-privacidade">Política de
        privacidade</Link>.
      </p>
      <h2 id="conta">Conta</h2>
      <p>O acesso é feito por link enviado ao seu e-mail (ou login Google). Mantenha seu e-mail seguro: quem tiver acesso a ele pode entrar na sua conta.</p>
      <h2 id="precos">Preços e promoções</h2>
      <ul>
        <li>Os preços estão em reais e podem mudar sem aviso; vale o preço exibido no momento da confirmação do pedido.</li>
        <li>O desconto progressivo é aplicado automaticamente pela quantidade de peças. Cupons seguem as regras informadas em cada um e podem não acumular com outras promoções.</li>
        <li>{payTerms}</li>
        <li>Erros evidentes de preço ou estoque podem levar ao cancelamento do pedido, com reembolso integral.</li>
      </ul>
      <h2 id="pedido">Pedido e pagamento</h2>
      <p>
        O pedido é criado como “Aguardando pagamento” e as peças ficam reservadas pelo prazo informado no checkout (60 minutos no Pix e cartão; 3 dias úteis no boleto). Sem
        confirmação do pagamento nesse prazo, o pedido é cancelado automaticamente e as peças voltam ao estoque.
      </p>
      <h2 id="entrega">Entrega, trocas e devoluções</h2>
      <p>
        Prazos, frete e regras de troca estão em <Link href="/trocas-e-devolucoes">Trocas, devoluções e entregas</Link>. Os direitos do Código de Defesa do Consumidor são sempre
        preservados.
      </p>
      <h2 id="propriedade">Propriedade intelectual</h2>
      <p>Marca, logotipos, fotos, textos e o desenho das peças pertencem à MOVA LEV e não podem ser usados sem autorização.</p>
      <h2 id="foro">Disposições gerais</h2>
      <p>
        Estes termos seguem a legislação brasileira. Dúvidas: <Link href="/contato">fale com a gente</Link>. Fica eleito o foro do domicílio do consumidor.
      </p>
    </InfoPage>
  );
}
