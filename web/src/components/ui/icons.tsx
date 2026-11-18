import type { SVGProps } from "react";

/** Ícones de traço (1.5px), herdam a cor do texto. Decorativos por padrão. */
type P = SVGProps<SVGSVGElement>;
const base = (p: P): P => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: false,
  ...p,
});

export const SearchIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </svg>
);
export const UserIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M4.5 20c1.2-3.6 4-5.4 7.5-5.4s6.3 1.8 7.5 5.4" />
  </svg>
);
export const BagIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M5.5 8h13l-1 12h-11z" />
    <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
  </svg>
);
export const HeartIcon = ({ filled, ...p }: P & { filled?: boolean }) => (
  <svg {...base(p)} fill={filled ? "currentColor" : "none"}>
    <path d="M12 19.5s-7-4.3-7-9.4A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.1c0 5.1-7 9.4-7 9.4z" />
  </svg>
);
/** Coração de favorito: o preenchimento cresce sobre o contorno (ver `.heart` no globals.css). */
export const FavoriteHeart = ({ on, ...p }: P & { on: boolean }) => (
  <span className="heart" data-on={on} aria-hidden>
    <HeartIcon {...p} />
    <HeartIcon {...p} filled className="heart-fill" />
  </span>
);
export const MenuIcon =(p: P) => (
  <svg {...base(p)}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);
export const CloseIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const ArrowRightIcon = (p: P) => (
  <svg {...base({ width: 14, height: 14, ...p })}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
);
export const ArrowLeftIcon = (p: P) => (
  <svg {...base({ width: 14, height: 14, ...p })}>
    <path d="M20 12H5M11 6l-6 6 6 6" />
  </svg>
);
export const PlusIcon = (p: P) => (
  <svg {...base({ width: 16, height: 16, ...p })}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const MinusIcon = (p: P) => (
  <svg {...base({ width: 16, height: 16, ...p })}>
    <path d="M5 12h14" />
  </svg>
);
export const PlayIcon = (p: P) => (
  <svg {...base({ ...p, fill: "currentColor", stroke: "none" })}>
    <path d="M7 4.5v15l13-7.5z" />
  </svg>
);
export const ChevronDownIcon = (p: P) => (
  <svg {...base({ width: 16, height: 16, ...p })}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
export const TruckIcon = (p: P) => (
  <svg {...base({ width: 24, height: 24, ...p })}>
    <path d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3v3h-7" />
    <circle cx="6.5" cy="17.5" r="1.6" />
    <circle cx="17" cy="17.5" r="1.6" />
  </svg>
);
export const ExchangeIcon = (p: P) => (
  <svg {...base({ width: 24, height: 24, ...p })}>
    <path d="M19.5 9.5A7.5 7.5 0 0 0 5.6 7.6M4.5 14.5a7.5 7.5 0 0 0 13.9 1.9" />
    <path d="M19.8 4.5v5h-5M4.2 19.5v-5h5" />
  </svg>
);
export const CardIcon = (p: P) => (
  <svg {...base({ width: 24, height: 24, ...p })}>
    <rect x="3" y="5.5" width="18" height="13" />
    <path d="M3 10h18" />
  </svg>
);
export const ShieldIcon = (p: P) => (
  <svg {...base({ width: 24, height: 24, ...p })}>
    <path d="M12 3.5 5 6v5.5c0 4.3 3 7.6 7 9 4-1.4 7-4.7 7-9V6z" />
    <path d="m9 12 2.2 2.2L15.5 10" />
  </svg>
);
export const LockIcon = (p: P) => (
  <svg {...base({ width: 16, height: 16, ...p })}>
    <rect x="5" y="10.5" width="14" height="9.5" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </svg>
);
