import type { PageDTO } from "@movalev/shared";

/** Endereço público: páginas da loja ficam na raiz; as extras, em /pagina/…. */
export const pagePath = (p: Pick<PageDTO, "slug" | "system">) => (p.system ? `/${p.slug}` : `/pagina/${p.slug}`);
