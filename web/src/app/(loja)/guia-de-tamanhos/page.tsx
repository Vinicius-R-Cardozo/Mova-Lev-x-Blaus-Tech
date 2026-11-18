import { CmsPage, cmsMetadata } from "@/components/content/CmsPage";

// Texto editável em Painel › Conteúdo › Páginas.
export const generateMetadata = () => cmsMetadata("guia-de-tamanhos", "/guia-de-tamanhos");

export default function Page() {
  return <CmsPage slug="guia-de-tamanhos" path="/guia-de-tamanhos" />;
}
