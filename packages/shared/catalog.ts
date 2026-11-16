/** Vocabulário do catálogo — valores gravados no banco e rótulos exibidos na loja. */

export const SIZES = ["PP", "P", "M", "G", "GG"] as const;
export type Size = (typeof SIZES)[number];

export const SENSATIONS = ["NUVEM", "BRISA"] as const;
export type Sensation = (typeof SENSATIONS)[number];
export const SENSATION_LABEL: Record<Sensation, string> = {
  NUVEM: "Toque Nuvem",
  BRISA: "Toque Brisa",
};
export const SENSATION_HINT: Record<Sensation, string> = {
  NUVEM: "macio",
  BRISA: "fresco",
};

export const MODELS = ["CINTURA_ALTA", "FLARE", "SETE_OITAVOS", "CICLISTA"] as const;
export type Model = (typeof MODELS)[number];
export const MODEL_LABEL: Record<Model, string> = {
  CINTURA_ALTA: "Cintura alta",
  FLARE: "Flare",
  SETE_OITAVOS: "7/8",
  CICLISTA: "Ciclista",
};
/** Slug usado na URL (?modelo=cintura-alta). */
export const MODEL_SLUG: Record<Model, string> = {
  CINTURA_ALTA: "cintura-alta",
  FLARE: "flare",
  SETE_OITAVOS: "7-8",
  CICLISTA: "ciclista",
};

export const BADGES = ["NOVO", "MAIS_VENDIDO", "EDICAO_LIMITADA"] as const;
export type Badge = (typeof BADGES)[number];
export const BADGE_LABEL: Record<Badge, string> = {
  NOVO: "Novo",
  MAIS_VENDIDO: "Mais vendido",
  EDICAO_LIMITADA: "Edição limitada",
};

/** Desenho de traço usado nos placeholders enquanto não há fotos. */
export const PICTOGRAMS = ["LEGGING", "FLARE", "SHORT", "TOP", "MACAQUINHO", "CASACO", "CONJUNTO", "ACESSORIO"] as const;
export type Pictogram = (typeof PICTOGRAMS)[number];

export const IMAGE_KINDS = ["FRENTE", "COSTAS", "DETALHE", "VIDEO"] as const;
export type ImageKind = (typeof IMAGE_KINDS)[number];
export const IMAGE_KIND_LABEL: Record<ImageKind, string> = {
  FRENTE: "Frente",
  COSTAS: "Costas",
  DETALHE: "Detalhe do cós",
  VIDEO: "Em movimento · Vídeo",
};

export const SORTS = ["relevancia", "novidades", "menor-preco", "maior-preco"] as const;
export type Sort = (typeof SORTS)[number];
export const SORT_LABEL: Record<Sort, string> = {
  relevancia: "Relevância",
  novidades: "Novidades",
  "menor-preco": "Menor preço",
  "maior-preco": "Maior preço",
};

export const ORDER_STATUSES = [
  "AGUARDANDO_PAGAMENTO",
  "PAGO",
  "EM_SEPARACAO",
  "ENVIADO",
  "ENTREGUE",
  "CANCELADO",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  PAGO: "Pago",
  EM_SEPARACAO: "Em separação",
  ENVIADO: "Enviado",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
};
/** Transições permitidas no admin. */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  AGUARDANDO_PAGAMENTO: ["PAGO", "CANCELADO"],
  PAGO: ["EM_SEPARACAO", "CANCELADO"],
  EM_SEPARACAO: ["ENVIADO", "CANCELADO"],
  ENVIADO: ["ENTREGUE"],
  ENTREGUE: [],
  CANCELADO: [],
};
