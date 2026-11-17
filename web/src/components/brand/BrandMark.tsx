import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

/**
 * Logos oficiais MOVA LEV (mesmos vetores da SVG do Drive), servidos como arquivo em
 * cache e aplicados como máscara: a cor vem de `currentColor`, como pede a identidade,
 * sem repetir ~22 KB de path no HTML e no JavaScript de cada página.
 */
const ART = {
  wordmark: { src: "/brand/wordmark.svg", ratio: 918 / 142, label: "MOVA LEV" },
  completa: { src: "/brand/logo-completa.svg", ratio: 982 / 245, label: "MOVA LEV — Movimento é vida" },
} as const;

export function BrandMark({ variant, className, decorative = false, style }: { variant: keyof typeof ART; className?: string; decorative?: boolean; style?: CSSProperties }) {
  const a = ART[variant];
  const mask = `url(${a.src}) center / contain no-repeat`;
  return (
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : a.label}
      aria-hidden={decorative || undefined}
      className={cn("inline-block bg-current", className)}
      style={{ aspectRatio: `${a.ratio}`, WebkitMask: mask, mask, ...style }}
    />
  );
}
