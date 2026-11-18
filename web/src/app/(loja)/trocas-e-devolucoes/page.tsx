import { CmsPage, cmsMetadata } from "@/components/content/CmsPage";

// Texto editável em Painel › Conteúdo › Páginas.
export const generateMetadata = () => cmsMetadata("trocas-e-devolucoes", "/trocas-e-devolucoes");

export default function Page() {
  return <CmsPage slug="trocas-e-devolucoes" path="/trocas-e-devolucoes" />;
}
