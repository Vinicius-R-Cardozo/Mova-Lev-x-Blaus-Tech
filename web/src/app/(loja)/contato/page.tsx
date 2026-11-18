import { CmsPage, cmsMetadata } from "@/components/content/CmsPage";

// Texto editável em Painel › Conteúdo › Páginas.
export const generateMetadata = () => cmsMetadata("contato", "/contato");

export default function Page() {
  return <CmsPage slug="contato" path="/contato" />;
}
