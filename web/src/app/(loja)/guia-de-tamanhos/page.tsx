import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/institutional/InfoPage";

export const metadata: Metadata = {
  title: "Guia de tamanhos",
  description: "Tabela de medidas da MOVA LEV, do PP ao GG, e como medir o corpo para escolher o tamanho certo.",
  alternates: { canonical: "/guia-de-tamanhos" },
};

// Medidas de referência do corpo (cm). Ajuste aqui quando a modelagem oficial for fechada.
const SIZES = [
  { size: "PP", busto: "78–82", cintura: "60–64", quadril: "86–90" },
  { size: "P", busto: "82–86", cintura: "64–68", quadril: "90–94" },
  { size: "M", busto: "86–92", cintura: "68–74", quadril: "94–100" },
  { size: "G", busto: "92–98", cintura: "74–80", quadril: "100–106" },
  { size: "GG", busto: "98–104", cintura: "80–86", quadril: "106–112" },
];

export default function GuiaPage() {
  return (
    <InfoPage
      slug="guia-de-tamanhos"
      kicker="Ajuda"
      title="Guia de"
      emphasis="tamanhos"
      intro="Medidas do corpo, em centímetros. Se ficar entre dois tamanhos, prefira o maior para Toque Nuvem e o menor para mais compressão."
      toc={[
        { id: "tabela", label: "Tabela de medidas" },
        { id: "como-medir", label: "Como medir" },
        { id: "dicas", label: "Dicas por peça" },
      ]}
    >
      <h2 id="tabela">Tabela de medidas</h2>
      <div className="overflow-x-auto">
        <table>
          <caption className="sr-only">Medidas do corpo por tamanho, em centímetros</caption>
          <thead>
            <tr>
              <th scope="col">Tamanho</th>
              <th scope="col">Busto</th>
              <th scope="col">Cintura</th>
              <th scope="col">Quadril</th>
            </tr>
          </thead>
          <tbody>
            {SIZES.map((s) => (
              <tr key={s.size}>
                <th scope="row" className="!bg-transparent !font-sans !text-[15px] !tracking-normal">
                  {s.size}
                </th>
                <td>{s.busto}</td>
                <td>{s.cintura}</td>
                <td>{s.quadril}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 id="como-medir">Como medir</h2>
      <ol>
        <li><strong>Busto:</strong> passe a fita na parte mais cheia do busto, mantendo-a reta nas costas.</li>
        <li><strong>Cintura:</strong> meça a parte mais fina do tronco, um pouco acima do umbigo.</li>
        <li><strong>Quadril:</strong> meça a parte mais larga, com os pés juntos.</li>
      </ol>
      <p>Use roupas leves, fita métrica sem apertar e respire normalmente.</p>
      <h2 id="dicas">Dicas por peça</h2>
      <ul>
        <li><strong>Leggings e shorts:</strong> guie-se pela cintura e pelo quadril.</li>
        <li><strong>Tops:</strong> guie-se pelo busto. As alças são reguláveis.</li>
        <li><strong>Macaquinhos:</strong> confira busto e quadril; o tecido acompanha o tronco.</li>
        <li><strong>Casacos:</strong> modelagem ampla — escolha o seu tamanho habitual.</li>
      </ul>
      <p>
        Ficou na dúvida? A primeira troca é grátis em até 30 dias. <Link href="/trocas-e-devolucoes">Veja como funciona</Link>.
      </p>
    </InfoPage>
  );
}
