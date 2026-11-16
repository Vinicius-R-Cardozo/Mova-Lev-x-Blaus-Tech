/**
 * Formato das respostas da API consumidas pela loja.
 * Valores monetários em centavos.
 */
import type { Badge, ImageKind, Model, Pictogram, Sensation, Size } from "./catalog";

export interface ColorDTO {
  slug: string;
  name: string;
  hex: string;
  placeholderHex: string;
}

export interface ImageDTO {
  id: string;
  kind: ImageKind;
  /** URL pública da foto; nulo = ainda sem foto (placeholder). */
  url: string | null;
  videoUrl: string | null;
  alt: string;
  caption: string | null;
}

export interface SizeOptionDTO {
  variantId: string;
  size: Size;
  available: boolean;
  priceCents: number;
}

/** Card da vitrine: um produto numa cor. */
export interface ProductCardDTO {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  badge: Badge | null;
  sensation: Sensation;
  model: Model | null;
  pictogram: Pictogram;
  /** Cor exibida no card. */
  color: ColorDTO;
  /** Todas as cores do produto (bolinhas). */
  colors: ColorDTO[];
  image: ImageDTO | null;
  /** Tamanhos da cor do card, para a compra rápida. */
  sizes: SizeOptionDTO[];
}

export interface ProductColorDetailDTO extends ColorDTO {
  images: ImageDTO[];
  sizes: SizeOptionDTO[];
}

export interface ProductDetailDTO {
  id: string;
  slug: string;
  name: string;
  nameEmphasis: string | null;
  priceCents: number;
  badge: Badge | null;
  sensation: Sensation;
  model: Model | null;
  pictogram: Pictogram;
  description: string;
  fabricCare: string;
  collection: { slug: string; name: string; season: string | null } | null;
  category: { slug: string; name: string } | null;
  rating: { average: number; count: number } | null;
  colors: ProductColorDetailDTO[];
  completeLook: ProductCardDTO[];
  youMayLike: ProductCardDTO[];
}

export interface CategoryDTO {
  slug: string;
  name: string;
  description: string | null;
  bannerCaption: string | null;
  bannerUrl: string | null;
  pictogram: Pictogram;
  tone: string;
  showInMenu: boolean;
}

export interface CategoryPageDTO {
  category: CategoryDTO;
  items: ProductCardDTO[];
  total: number;
  page: number;
  pageSize: number;
  facets: {
    colors: ColorDTO[];
    priceMinCents: number;
    priceMaxCents: number;
  };
}

export interface HomeDTO {
  hero: {
    kicker: string;
    titleLine1: string;
    titleLine2: string;
    videoUrl: string | null;
    posterUrl: string | null;
    caption: string;
    primaryCta: { label: string; href: string };
    secondaryCta: { label: string; href: string };
  };
  campaign: { title: string; cta: string; items: ProductCardDTO[] };
  categories: CategoryDTO[];
  newArrivals: ProductCardDTO[];
  bestSellers: ProductCardDTO[];
  shopTheLook: {
    kicker: string;
    title: string;
    titleEmphasis: string;
    caption: string;
    imageUrl: string | null;
    note: string;
    cta: string;
    items: { product: ProductCardDTO; hotspot: { x: number; y: number } }[];
  };
  sensations: { sensation: Sensation; title: string; text: string; href: string }[];
  studio: {
    kicker: string;
    title: string;
    titleEmphasis: string;
    text: string;
    cta: { label: string; href: string };
    classes: { title: string; meta: string; tone: string; videoUrl: string | null }[];
  };
  instagram: { title: string; handle: string; url: string; tiles: { tone: string; caption: string }[] };
}

/** Linha da sacola com preço e disponibilidade conferidos no servidor. */
export interface CartLineDTO {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  colorSlug: string;
  colorName: string;
  placeholderHex: string;
  pictogram: Pictogram;
  imageUrl: string | null;
  size: Size;
  unitPriceCents: number;
  quantity: number;
  /** Máximo que dá para levar agora (estoque, limitado a 10). 0 = esgotado. */
  maxQuantity: number;
}

export interface CartQuoteDTO {
  lines: CartLineDTO[];
  /** Itens enviados que não existem mais (produto removido/inativo). */
  removed: string[];
  pricing: import("./pricing").PricingResult;
  tiers: import("./pricing").PricingTier[];
  /** "Complete com…": 1ª peça recomendada que ainda não está na sacola. */
  suggestion: ProductCardDTO | null;
}

export interface ShippingOptionDTO {
  id: "PADRAO" | "EXPRESSA" | "RETIRADA";
  label: string;
  days: number;
  description: string;
  /** Preço cheio do método. */
  cents: number;
  /** O que a cliente paga com este método (0 = grátis). */
  finalCents: number;
}

export interface CheckoutQuoteDTO extends CartQuoteDTO {
  address: { street: string; district: string; city: string; uf: string } | null;
  shippingOptions: ShippingOptionDTO[];
  shippingMethod: ShippingOptionDTO["id"] | null;
}

export interface OrderDTO {
  id: string;
  number: number;
  status: import("./catalog").OrderStatus;
  createdAt: string;
  expiresAt: string;
  email: string;
  customerName: string;
  items: { productName: string; colorName: string; size: Size; quantity: number; unitPriceCents: number; sku: string }[];
  subtotalCents: number;
  progressivePercent: number;
  progressiveDiscountCents: number;
  couponCode: string | null;
  couponDiscountCents: number;
  shippingLabel: string;
  shippingDays: number | null;
  shippingCents: number;
  pixDiscountCents: number;
  totalCents: number;
  installments: number;
  paymentMethod: "PIX" | "CARTAO" | "BOLETO";
  payment: Record<string, unknown> | null;
  shippingAddress: Record<string, string> | null;
  trackingCode: string | null;
}

export interface OrderCreatedDTO {
  id: string;
  number: number;
  accessToken: string;
}
