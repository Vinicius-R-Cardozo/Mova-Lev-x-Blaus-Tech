import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/institutional/InfoPage";
import { ContactForm } from "@/components/institutional/ContactForm";
import { getCompany } from "@/lib/company";

export const metadata: Metadata = {
  title: "Contato",
  description: "Fale com o atendimento da MOVA LEV: pedidos, trocas, tamanhos e parcerias.",
  alternates: { canonical: "/contato" },
};

export default async function ContatoPage() {
  const COMPANY = await getCompany();
  return (
    <InfoPage slug="contato" kicker="Ajuda" title="Fale" emphasis="com a gente" intro="Respondemos em até 1 dia útil. Se for sobre um pedido, informe o número — ele está no e-mail de confirmação.">
      <h2 id="canais">Canais</h2>
      <ul>
        <li>E-mail: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></li>
        {COMPANY.whatsapp && (
          <li>
            WhatsApp: <a href={`https://wa.me/${COMPANY.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">{COMPANY.whatsapp}</a>
          </li>
        )}
        <li>Instagram: <a href={COMPANY.instagram} target="_blank" rel="noopener noreferrer">@movalev</a></li>
        <li>Atendimento: {COMPANY.hours}</li>
      </ul>
      <p>
        Antes de escrever, talvez a resposta esteja em <Link href="/trocas-e-devolucoes">Trocas e entregas</Link> ou no <Link href="/guia-de-tamanhos">Guia de tamanhos</Link>.
      </p>
      <h2 id="mensagem">Envie uma mensagem</h2>
      <ContactForm />
    </InfoPage>
  );
}
