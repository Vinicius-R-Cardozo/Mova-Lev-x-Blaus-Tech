import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/institutional/InfoPage";

export const metadata: Metadata = {
  title: "Sobre · Manifesto",
  description: "MOVA LEV: moda fitness feminina para quem pratica e para quem descansa. Movimento é vida.",
  alternates: { canonical: "/sobre" },
};

export default function SobrePage() {
  return (
    <InfoPage slug="sobre" kicker="Manifesto" title="Movimento" emphasis="é vida." intro="Roupas para o corpo que se move — no estúdio, na rua, no tapete da sala e no domingo sem pressa.">
      <h2 id="manifesto">O que nos move</h2>
      <p>
        A MOVA LEV nasceu de uma ideia simples: o movimento não cabe só na hora do treino. Ele está no alongamento ao acordar, na caminhada até o café, na aula de pilates e no respiro
        antes de dormir. Por isso desenhamos peças que acompanham o dia inteiro — firmes quando o corpo pede, macias quando ele descansa.
      </p>
      <p>
        Trabalhamos com duas sensações. <strong>Toque Nuvem</strong> é o tecido de toque amanteigado, que abraça sem apertar. <strong>Toque Brisa</strong> é leve, seca rápido e
        refresca nos dias quentes. Cada coleção combina as duas em uma paleta curta — areia, taupe, verde-oliva e preto — para que todas as peças conversem entre si.
      </p>
      <h2 id="como-fazemos">Como fazemos</h2>
      <ul>
        <li>Modelagens testadas em corpos reais, do PP ao GG.</li>
        <li>Costuras planas e cós que não enrola.</li>
        <li>Poucas peças por coleção, pensadas para durar e combinar.</li>
        <li>Troca grátis em até 30 dias, porque caimento é pessoal.</li>
      </ul>
      <h2 id="studio">Studio MOVA</h2>
      <p>
        Quem compra MOVA LEV ganha acesso ao Studio: aulas curtas de yoga, pilates de solo e alongamento para respirar junto. <Link href="/#studio">Conheça o Studio</Link>.
      </p>
      <p>
        <Link href="/colecao/novidades">Ver as novidades da coleção</Link>
      </p>
    </InfoPage>
  );
}
