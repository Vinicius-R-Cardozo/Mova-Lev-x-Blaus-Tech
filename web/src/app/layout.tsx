import type { Metadata, Viewport } from "next";
import { preload } from "react-dom";
import { cormorant, jost } from "./fonts";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { Providers } from "@/components/Providers";
import { JsonLd } from "@/components/ui/JsonLd";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} · Movimento é vida`, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  openGraph: { type: "website", locale: "pt_BR", siteName: SITE_NAME, url: SITE_URL },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
  icons: { icon: "/brand/mova-lev-simbolo-preto.svg" },
};

export const viewport: Viewport = {
  themeColor: "#F5F2EE",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Máscaras CSS são buscadas em modo CORS: o preload precisa do mesmo modo para ser aproveitado.
  preload("/brand/wordmark.svg", { as: "image", fetchPriority: "high", crossOrigin: "anonymous" });
  return (
    <html lang="pt-BR" className={`${cormorant.variable} ${jost.variable}`} suppressHydrationWarning>
      <head>
        {/* Esconde o aviso de cookies antes da 1ª pintura se a escolha já foi feita. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var c=JSON.parse(localStorage.getItem("movalev:consentimento"));if(c&&c.version===1)document.documentElement.setAttribute("data-consent","1")}catch(e){}`,
          }}
        />
      </head>
      <body>
        <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-toast focus:bg-preto focus:px-4 focus:py-3 focus:text-offwhite">
          Pular para o conteúdo
        </a>
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@graph": [
              { "@type": "Organization", "@id": `${SITE_URL}/#org`, name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/brand/mova-lev-logo-completa-preto.svg`, sameAs: ["https://instagram.com/movalev"] },
              {
                "@type": "WebSite",
                "@id": `${SITE_URL}/#site`,
                url: SITE_URL,
                name: SITE_NAME,
                inLanguage: "pt-BR",
                publisher: { "@id": `${SITE_URL}/#org` },
                potentialAction: { "@type": "SearchAction", target: `${SITE_URL}/busca?q={search_term_string}`, "query-input": "required name=search_term_string" },
              },
            ],
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
