import { CmsPage, cmsMetadata } from "@/components/content/CmsPage";

// Texto editável em Painel › Conteúdo › Páginas.
export const generateMetadata = () => cmsMetadata("termos-de-uso", "/termos-de-uso");

export default function Page() {
  return <CmsPage slug="termos-de-uso" path="/termos-de-uso" />;
}
