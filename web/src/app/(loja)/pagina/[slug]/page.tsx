import { CmsPage, cmsMetadata } from "@/components/content/CmsPage";

// Páginas extras criadas no painel (Conteúdo › Páginas › Nova página).
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return cmsMetadata(slug, `/pagina/${slug}`);
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <CmsPage slug={slug} path={`/pagina/${slug}`} />;
}
