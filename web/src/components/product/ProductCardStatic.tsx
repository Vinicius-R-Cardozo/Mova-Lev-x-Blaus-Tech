import Link from "next/link";
import type { ProductCardDTO } from "@movalev/shared";
import { Media } from "@/components/ui/Media";
import { Price } from "./Price";

/** Card só de leitura (sem compra rápida/favorito): renderizado no servidor, sem JavaScript. */
export function ProductCardStatic({ product }: { product: ProductCardDTO }) {
  const href = `/produto/${product.slug}?cor=${product.color.slug}`;
  return (
    <article className="group relative">
      <div className="card-frame overflow-hidden">
        <div className="card-zoom">
          <Media image={product.image} tone={product.color.placeholderHex} pictogram={product.pictogram} className="aspect-[3/4]" sizes="(min-width: 1024px) 25vw, 50vw" pictogramClassName="hidden" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <h3 className="font-sans text-[16px] font-normal leading-snug">
          <Link href={href} className="after:absolute after:inset-0 after:content-[''] group-focus-within:underline focus-visible:outline-none">
            {product.name}
          </Link>
        </h3>
        <p className="shrink-0 text-[16px] font-normal"><Price cents={product.priceCents} compareAt={product.compareAtPriceCents} compareClassName="text-[14px]" /></p>
      </div>
    </article>
  );
}
