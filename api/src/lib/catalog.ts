import type { Prisma } from "@prisma/client";
import type { ColorDTO, ImageDTO, ProductCardDTO, SizeOptionDTO } from "@movalev/shared";
import { SIZES } from "@movalev/shared";
import { publicImageUrl } from "./supabase";

/** Include padrão para montar cards de produto. */
export const cardInclude = {
  colors: { include: { color: true }, orderBy: { sortOrder: "asc" } },
  images: { orderBy: { sortOrder: "asc" } },
  variants: { select: { id: true, size: true, stock: true, priceCents: true, colorId: true } },
} satisfies Prisma.ProductInclude;

export type CardProduct = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

type ColorRow = { slug: string; name: string; hex: string; placeholderHex: string };
type ImageRow = CardProduct["images"][number];
type VariantRow = CardProduct["variants"][number];

export const toColor = (c: ColorRow): ColorDTO => ({ slug: c.slug, name: c.name, hex: c.hex, placeholderHex: c.placeholderHex });

export const toImage = (i: ImageRow): ImageDTO => ({
  id: i.id,
  kind: i.kind,
  url: i.storagePath ? publicImageUrl(i.storagePath) : null,
  videoUrl: i.videoUrl,
  alt: i.alt,
  caption: i.caption,
});

export function toSizes(variants: VariantRow[], colorId: string, basePrice: number): SizeOptionDTO[] {
  return variants
    .filter((v) => v.colorId === colorId)
    .sort((a, b) => SIZES.indexOf(a.size) - SIZES.indexOf(b.size))
    .map((v) => ({ variantId: v.id, size: v.size, available: v.stock > 0, priceCents: v.priceCents ?? basePrice }));
}

/** Card do produto numa cor (a informada ou a primeira). */
export function toCard(p: CardProduct, colorSlugOrId?: string): ProductCardDTO {
  const pc = p.colors.find((c) => c.colorId === colorSlugOrId || c.color.slug === colorSlugOrId) ?? p.colors[0];
  if (!pc) throw new Error(`Produto ${p.slug} sem cores`);
  const colorImages = p.images.filter((i) => i.colorId === pc.colorId);
  const front = colorImages.find((i) => i.kind === "FRENTE") ?? colorImages[0] ?? p.images[0] ?? null;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    priceCents: p.priceCents,
    badge: p.badge,
    sensation: p.sensation,
    model: p.model,
    pictogram: p.pictogram,
    color: toColor(pc.color),
    colors: p.colors.map((c) => toColor(c.color)),
    image: front ? toImage(front) : null,
    sizes: toSizes(p.variants, pc.colorId, p.priceCents),
  };
}
