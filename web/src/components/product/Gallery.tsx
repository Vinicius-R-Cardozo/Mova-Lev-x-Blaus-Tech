"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { IMAGE_KIND_LABEL, type ImageDTO, type Pictogram } from "@movalev/shared";
import { Media } from "@/components/ui/Media";
import { cn } from "@/lib/cn";

/** Grade 2×2 no desktop; carrossel com indicadores no mobile. */
export function Gallery({ images: all, tone, pictogram, name }: { images: ImageDTO[]; tone: string; pictogram: Pictogram; name: string }) {
  // Com fotos publicadas, o espaço do vídeo só aparece quando houver vídeo de fato.
  const images = useMemo(() => (all.some((i) => i.url) ? all.filter((i) => i.kind !== "VIDEO" || i.videoUrl) : all), [all]);
  const oddLast = images.length % 2 === 1 && images.length > 1;
  const trackRef = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    trackRef.current?.scrollTo({ left: 0 });
    setIndex(0);
  }, [images]);

  const onScroll = () => {
    const el = trackRef.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  const render = (img: ImageDTO, i: number, priority: boolean, wide = false) =>
    img.kind === "VIDEO" && img.videoUrl ? (
      <video src={img.videoUrl} muted loop playsInline autoPlay className="aspect-[3/4] w-full object-cover" aria-label={img.alt} />
    ) : (
      <Media
        image={img}
        tone={tone}
        pictogram={pictogram}
        detail={img.kind === "DETALHE"}
        label={IMAGE_KIND_LABEL[img.kind]}
        className={cn("hero-settle", wide ? "aspect-[3/2]" : "aspect-[3/4]")}
        pictogramClassName={img.kind === "DETALHE" ? "h-[62%] w-auto" : "h-[50%] w-auto"}
        sizes="(min-width: 1024px) 29vw, 100vw"
        priority={priority && i === 0}
      />
    );

  return (
    <section aria-label={`Fotos de ${name}`}>
      <ul className="hidden grid-cols-2 gap-2 lg:grid">
        {images.map((img, i) => (
          <li key={img.id} className={cn("overflow-hidden", oddLast && i === images.length - 1 && "col-span-2")}>
            {render(img, i, true, oddLast && i === images.length - 1)}
          </li>
        ))}
      </ul>

      <div className="-mx-4 lg:hidden">
        <ul ref={trackRef} onScroll={onScroll} className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {images.map((img, i) => (
            <li key={img.id} className="w-full shrink-0 snap-center overflow-hidden" aria-label={`Foto ${i + 1} de ${images.length}`}>
              {render(img, i, true)}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
          {images.map((img, i) => (
            <span key={img.id} className={cn("h-0.5 w-5 transition-colors", i === index ? "bg-preto" : "bg-linha-forte")} />
          ))}
        </div>
      </div>
    </section>
  );
}
