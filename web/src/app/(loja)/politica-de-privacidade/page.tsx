import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/institutional/InfoPage";
import { CookiePreferencesLink } from "@/components/consent/CookiePreferencesLink";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Como a MOVA LEV coleta, usa e protege seus dados pessoais, conforme a LGPD.",
  alternates: { canonical: "/politica-de-privacidade" },
};

export default function PrivacidadePage() {
  return (
    <InfoPage
      slug="politica-de-privacidade"
      kicker="Legal"
      title="Política de"
      emphasis="privacidade"
      updatedAt="16 de novembro de 2026"
      intro="Explicamos aqui, sem juridiquês, quais dados usamos, por quê e como você controla tudo isso, de acordo com a Lei Geral de Proteção de Dados (Lei 13.709/2018)."
      toc={[
        { id: "controlador", label: "Quem somos" },
        { id: "dados", label: "Dados que coletamos" },
        { id: "finalidades", label: "Para que usamos" },
        { id: "compartilhamento", label: "Com quem compartilhamos" },
        { id: "cookies", label: "Cookies" },
        { id: "retencao", label: "Por quanto tempo" },
        { id: "direitos", label: "Seus direitos" },
        { id: "seguranca", label: "Segurança" },
        { id: "contato-dpo", label: "Encarregado" },
      ]}
    >
      <h2 id="controlador">Quem somos</h2>
      <p>
        A loja MOVA LEV é operada por <strong>{COMPANY.legalName}</strong>, CNPJ {COMPANY.cnpj}, com sede em {COMPANY.address}, que é a controladora dos seus dados pessoais.
      </p>
      <h2 id="dados">Dados que coletamos</h2>
      <ul>
        <li><strong>Cadastro e compra:</strong> nome, e-mail, celular, CPF (opcional, para nota fiscal) e endereço de entrega.</li>
        <li><strong>Pedido:</strong> peças, valores, forma de pagamento e histórico de status. Dados de cartão são tratados apenas pelo gateway de pagamento — não ficam com a MOVA LEV.</li>
        <li><strong>Conta:</strong> e-mail de acesso, favoritos, sacola e endereços salvos.</li>
        <li><strong>Newsletter:</strong> e-mail e data do consentimento.</li>
        <li><strong>Navegação:</strong> dados técnicos necessários ao funcionamento (como a sacola guardada no navegador) e, só com o seu consentimento, dados de analytics e marketing.</li>
      </ul>
      <h2 id="finalidades">Para que usamos e com qual base legal</h2>
      <ul>
        <li><strong>Processar e entregar pedidos, trocas e devoluções</strong> — execução de contrato (art. 7º, V).</li>
        <li><strong>Emitir nota fiscal e cumprir obrigações legais</strong> — obrigação legal (art. 7º, II).</li>
        <li><strong>Prevenir fraudes e proteger a loja</strong> — legítimo interesse (art. 7º, IX).</li>
        <li><strong>Enviar novidades e o cupom da newsletter</strong> — consentimento (art. 7º, I), que você pode retirar a qualquer momento.</li>
        <li><strong>Medir audiência e anúncios (Google Analytics, Meta Pixel)</strong> — consentimento, pelo banner de cookies.</li>
      </ul>
      <h2 id="compartilhamento">Com quem compartilhamos</h2>
      <p>Somente com fornecedores necessários para a loja funcionar, que tratam os dados em nosso nome:</p>
      <ul>
        <li>Hospedagem e banco de dados (Vercel, Render e Supabase);</li>
        <li>Gateway de pagamento e antifraude;</li>
        <li>Transportadoras e Correios, para a entrega;</li>
        <li>Envio de e-mails transacionais;</li>
        <li>Google e Meta, apenas se você aceitar os cookies de analytics/marketing.</li>
      </ul>
      <p>Alguns desses fornecedores podem armazenar dados fora do Brasil, sempre com cláusulas de proteção compatíveis com a LGPD. Não vendemos seus dados.</p>
      <h2 id="cookies">Cookies</h2>
      <ul>
        <li><strong>Necessários:</strong> sacola, login e preferências de privacidade. Sempre ativos.</li>
        <li><strong>Analytics:</strong> Google Analytics 4, para entender como a loja é usada. Só com consentimento.</li>
        <li><strong>Marketing:</strong> Meta Pixel, para medir anúncios. Só com consentimento.</li>
      </ul>
      <p>
        Você pode mudar sua escolha quando quiser: <CookiePreferencesLink />.
      </p>
      <h2 id="retencao">Por quanto tempo guardamos</h2>
      <p>
        Dados de pedidos e notas fiscais pelo prazo exigido pela legislação fiscal (5 anos). Dados de conta enquanto ela existir. Newsletter até você cancelar. Depois disso, os
        dados são excluídos ou anonimizados.
      </p>
      <h2 id="direitos">Seus direitos (art. 18)</h2>
      <p>
        Você pode pedir a qualquer momento: confirmação e acesso aos seus dados, correção, anonimização ou exclusão, portabilidade, informação sobre compartilhamentos e revogação do
        consentimento. Grande parte disso está em <Link href="/conta/dados">Minha conta</Link>; para o resto, escreva ao encarregado.
      </p>
      <h2 id="seguranca">Segurança</h2>
      <p>
        Usamos conexão criptografada (HTTPS), controle de acesso por perfil, senhas e chaves fora do código, e o banco de dados bloqueia leitura direta pelo navegador. Nenhum sistema é
        100% imune, mas avisaremos você e a ANPD caso ocorra um incidente relevante.
      </p>
      <h2 id="contato-dpo">Encarregado de dados (DPO)</h2>
      <p>
        Fale com o encarregado pelo e-mail <a href={`mailto:${COMPANY.dpoEmail}`}>{COMPANY.dpoEmail}</a>. Respondemos em até 15 dias.
      </p>
    </InfoPage>
  );
}
