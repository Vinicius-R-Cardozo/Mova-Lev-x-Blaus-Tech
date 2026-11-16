import Image from "next/image";
import type { ImageDTO, Pictogram as PictogramKind } from "@movalev/shared";
import { Pictogram } from "./Pictogram";
import { cn } from "@/lib/cn";

/**
 * Foto do produto ou, enquanto não há foto, placeholder na cor da peça
 * com o desenho de traço e (opcional) a legenda descrevendo a foto.
 */
export function Media({
  image,
  tone,
  pictogram,
  showCaption = false,
  label,
  detail = false,
  sizes = "(min-width: 1024px) 25vw, 50vw",
  priority = false,
  className,
  pictogramClassName = "h-[42%] w-auto",
}: {
  image: ImageDTO | null;
  tone: string;
  pictogram: PictogramKind;
  showCaption?: boolean;
  label?: string;
  detail?: boolean;
  sizes?: string;
  priority?: boolean;
  className?: string;
  pictogramClassName?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden", className)} style={{ backgroundColor: tone }}>
      {image?.url ? (
        <Image src={image.url} alt={image.alt} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center" role="img" aria-label={image?.alt ?? "Foto em produção"}>
          <Pictogram kind={pictogram} detail={detail} className={pictogramClassName} />
        </div>
      )}
      {(label || (showCaption && !image?.url && image?.caption)) && (
        <span className="label-sm absolute bottom-4 left-4 right-4 text-texto-3">{label ?? image?.caption}</span>
      )}
    </div>
  );
}

/** Placeholder de foto genérico (hero, banners, sensações, Instagram). */
export function PhotoPlaceholder({
  caption,
  className,
  style,
  children,
  captionClassName = "bottom-5 left-5 text-texto-3",
}: {
  caption?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  captionClassName?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden", className)} style={style} role={caption ? "img" : undefined} aria-label={caption}>
      {children}
      {caption && <span className={cn("label-sm absolute", captionClassName)} aria-hidden>{caption}</span>}
    </div>
  );
}
