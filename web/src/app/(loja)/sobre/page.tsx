import { CmsPage, cmsMetadata } from "@/components/content/CmsPage";

// Texto editável em Painel › Conteúdo › Páginas.
export const generateMetadata = () => cmsMetadata("sobre", "/sobre");

export default function Page() {
  return <CmsPage slug="sobre" path="/sobre" />;
}
