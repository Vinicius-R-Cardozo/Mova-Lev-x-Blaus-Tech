import { CmsPage, cmsMetadata } from "@/components/content/CmsPage";

// Texto editável em Painel › Conteúdo › Páginas.
export const generateMetadata = () => cmsMetadata("politica-de-privacidade", "/politica-de-privacidade");

export default function Page() {
  return <CmsPage slug="politica-de-privacidade" path="/politica-de-privacidade" />;
}
