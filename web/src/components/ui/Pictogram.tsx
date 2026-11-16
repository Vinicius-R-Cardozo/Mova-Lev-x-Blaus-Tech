import type { Pictogram as PictogramKind } from "@movalev/shared";

/**
 * Desenhos de traço que marcam o tipo de peça enquanto não há fotos
 * (mesma linguagem do template). Puramente decorativos.
 */
const paths: Record<PictogramKind, string[]> = {
  LEGGING: ["M42 16h36l4 12H38z", "M38 28l3 112h14l5-82 5 82h14l3-112"],
  FLARE: ["M42 16h36l4 12H38z", "M38 28l5 68-6 44h16l7-76 7 76h16l-6-44 5-68"],
  SHORT: ["M38 40h44", "M36 48h48l4 44H66l-6-26-6 26H32z"],
  TOP: ["M47 22l-3 40", "M73 22l3 40", "M44 62q16 12 32 0l6 18-4 32H42l-4-32z"],
  MACAQUINHO: ["M42 18q18 8 36 0l6 20v102H64l-4-60-4 60H36V38z"],
  CASACO: ["M50 22H38L20 46l11 10 9-12v96h40V44l9 12 11-10-18-24H70", "M60 26v114"],
  CONJUNTO: ["M44 16h32v14H44z", "M44 40h32l4 12H40z", "M40 52l4 88h12l4-60 4 60h12l4-88"],
  ACESSORIO: ["M38 62h44l-3 78H41z", "M50 62q0-20 10-20t10 20"],
};

export function Pictogram({ kind, detail = false, className }: { kind: PictogramKind; detail?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 120 160"
      fill="none"
      stroke="#1A1A1A"
      strokeWidth={detail ? 2.6 : 1.2}
      strokeLinejoin="miter"
      aria-hidden
      focusable={false}
      className={className}
    >
      <g transform={detail ? "translate(-60 -10) scale(2)" : undefined}>
        {paths[kind].map((d) => (
          <path key={d} d={d} vectorEffect="non-scaling-stroke" />
        ))}
        {detail && <path d="M60 32v22" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />}
      </g>
    </svg>
  );
}
