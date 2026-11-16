/**
 * Seed da MOVA LEV — dados iniciais com preços ilustrativos.
 * Idempotente: pode rodar quantas vezes quiser (upsert por slug/sku/chave).
 *
 *   npm run db:seed
 */
import { PrismaClient, type Badge, type ImageKind, type Model, type Pictogram, type Sensation, type Size } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();
const SIZES: Size[] = ["PP", "P", "M", "G", "GG"];

// ─── Cores ──────────────────────────────────────────────────────────────
const colors = [
  { slug: "verde-oliva", name: "Verde-oliva", hex: "#4D5A3A", placeholderHex: "#DDE0D3", sortOrder: 1 },
  { slug: "areia", name: "Areia", hex: "#E6D5C5", placeholderHex: "#E6D5C5", sortOrder: 2 },
  { slug: "taupe", name: "Taupe", hex: "#A99A8A", placeholderHex: "#CFC4B7", sortOrder: 3 },
  { slug: "preto", name: "Preto", hex: "#1A1A1A", placeholderHex: "#D5D0C9", sortOrder: 4 },
] as const;
type ColorSlug = (typeof colors)[number]["slug"];

// ─── Categorias (atalhos da Home e /colecao/[slug]) ────────────────────
const categories: { slug: string; name: string; description: string; pictogram: Pictogram; tone: string; showInMenu: boolean; bannerCaption: string }[] = [
  {
    slug: "leggings",
    name: "Leggings",
    description: "Do toque de segunda pele à compressão firme: a base de todo look MOVA, em cinco tons que combinam entre si.",
    pictogram: "LEGGING",
    tone: "#E6D5C5",
    showInMenu: true,
    bannerCaption: "FOTO · LEGGING EM MOVIMENTO, LUZ NATURAL",
  },
  {
    slug: "tops",
    name: "Tops",
    description: "Sustentação na medida certa, alças que não marcam e tecidos que respiram com você.",
    pictogram: "TOP",
    tone: "#DDE0D3",
    showInMenu: true,
    bannerCaption: "FOTO · TOP EM ESTÚDIO, FUNDO NEUTRO",
  },
  {
    slug: "conjuntos",
    name: "Conjuntos",
    description: "Peças pensadas para andar juntas — leve 2 ou mais e o desconto progressivo entra sozinho na sacola.",
    pictogram: "CONJUNTO",
    tone: "#ECE6DD",
    showInMenu: true,
    bannerCaption: "FOTO · CONJUNTO COMPLETO, LUZ LATERAL",
  },
  {
    slug: "macaquinhos",
    name: "Macaquinhos",
    description: "Uma peça só, do aquecimento ao alongamento final.",
    pictogram: "MACAQUINHO",
    tone: "#CFC4B7",
    showInMenu: false,
    bannerCaption: "FOTO · MACAQUINHO EM MOVIMENTO",
  },
  {
    slug: "casacos",
    name: "Casacos",
    description: "Camadas macias para o antes e o depois do treino.",
    pictogram: "CASACO",
    tone: "#E6D5C5",
    showInMenu: false,
    bannerCaption: "FOTO · CASACO ALONGADO, MANHÃ FRIA",
  },
  {
    slug: "acessorios",
    name: "Acessórios",
    description: "Bolsas, faixas e o que mais acompanha a sua prática.",
    pictogram: "ACESSORIO",
    tone: "#DDE0D3",
    showInMenu: false,
    bannerCaption: "FOTO · ACESSÓRIOS SOBRE TECIDO",
  },
];

// ─── Coleções ───────────────────────────────────────────────────────────
const collections = [
  { slug: "respiro", name: "Respiro", season: "Outono", description: "Tons de areia e oliva para respirar junto." },
  { slug: "pausa", name: "Pausa", season: "Outono", description: "Camadas macias para desacelerar." },
  { slug: "ritual", name: "Ritual", season: "Outono", description: "Linhas fluidas para a prática diária." },
  { slug: "brisa", name: "Brisa", season: "Verão", description: "Frescor contínuo para os dias quentes." },
];

// ─── Produtos ───────────────────────────────────────────────────────────
type Stock = Record<Size, number>;
interface SeedProduct {
  slug: string;
  code: string;
  name: string;
  nameEmphasis: string;
  priceCents: number;
  collection: string;
  categories: string[];
  sensation: Sensation;
  model: Model | null;
  pictogram: Pictogram;
  badge: Badge | null;
  relevance: number;
  salesCount: number;
  /** Dias atrás da publicação (menor = mais novo). */
  publishedDaysAgo: number;
  colors: { slug: ColorSlug; featured: boolean; stock: Stock }[];
  description: string;
  fabricCare: string;
}

const s = (PP: number, P: number, M: number, G: number, GG: number): Stock => ({ PP, P, M, G, GG });

const FABRIC_NUVEM =
  "Toque Nuvem: 78% poliamida, 22% elastano, toque amanteigado e opacidade total. Lavar à mão ou em ciclo delicado com água fria, do avesso. Não usar alvejante nem secadora; secar à sombra.";
const FABRIC_BRISA =
  "Toque Brisa: 88% poliamida com fio refrescante, 12% elastano, secagem rápida e proteção UV 50+. Lavar em ciclo delicado com água fria. Não usar amaciante; secar à sombra.";

const products: SeedProduct[] = [
  {
    slug: "legging-respiro-cintura-alta",
    code: "LRCA",
    name: "Legging Respiro Cintura Alta",
    nameEmphasis: "Cintura Alta",
    priceCents: 28900,
    collection: "respiro",
    categories: ["leggings", "conjuntos"],
    sensation: "NUVEM",
    model: "CINTURA_ALTA",
    pictogram: "LEGGING",
    badge: "NOVO",
    relevance: 100,
    salesCount: 320,
    publishedDaysAgo: 1,
    colors: [
      { slug: "areia", featured: true, stock: s(6, 12, 9, 4, 0) },
      { slug: "verde-oliva", featured: true, stock: s(3, 8, 10, 6, 2) },
      { slug: "preto", featured: false, stock: s(5, 10, 14, 8, 4) },
      { slug: "taupe", featured: false, stock: s(0, 4, 6, 3, 1) },
    ],
    description: "Cintura alta com cós duplo que não enrola, bolso interno para chave e cartão, comprimento 7/8.",
    fabricCare: FABRIC_NUVEM,
  },
  {
    slug: "top-respiro-alcas-finas",
    code: "TRAF",
    name: "Top Respiro Alças Finas",
    nameEmphasis: "Alças Finas",
    priceCents: 18900,
    collection: "respiro",
    categories: ["tops", "conjuntos"],
    sensation: "NUVEM",
    model: null,
    pictogram: "TOP",
    badge: "NOVO",
    relevance: 95,
    salesCount: 280,
    publishedDaysAgo: 2,
    colors: [
      { slug: "verde-oliva", featured: true, stock: s(4, 9, 11, 5, 2) },
      { slug: "areia", featured: true, stock: s(5, 7, 8, 0, 1) },
      { slug: "taupe", featured: false, stock: s(2, 3, 5, 2, 0) },
    ],
    description: "Alças finas reguláveis, bojo removível e sustentação leve para yoga, pilates e o dia a dia.",
    fabricCare: FABRIC_NUVEM,
  },
  {
    slug: "macaquinho-respiro",
    code: "MRES",
    name: "Macaquinho Respiro",
    nameEmphasis: "Respiro",
    priceCents: 34900,
    collection: "respiro",
    categories: ["macaquinhos", "conjuntos"],
    sensation: "NUVEM",
    model: null,
    pictogram: "MACAQUINHO",
    badge: null,
    relevance: 80,
    salesCount: 140,
    publishedDaysAgo: 3,
    colors: [
      { slug: "taupe", featured: true, stock: s(2, 5, 6, 3, 1) },
      { slug: "preto", featured: true, stock: s(3, 6, 0, 4, 2) },
    ],
    description: "Peça única com decote nas costas, alças cruzadas e comprimento ciclista.",
    fabricCare: FABRIC_NUVEM,
  },
  {
    slug: "casaco-pausa-alongado",
    code: "CPAL",
    name: "Casaco Pausa Alongado",
    nameEmphasis: "Alongado",
    priceCents: 39900,
    collection: "pausa",
    categories: ["casacos"],
    sensation: "NUVEM",
    model: null,
    pictogram: "CASACO",
    badge: "MAIS_VENDIDO",
    relevance: 90,
    salesCount: 410,
    publishedDaysAgo: 4,
    colors: [
      { slug: "areia", featured: true, stock: s(3, 6, 7, 5, 2) },
      { slug: "preto", featured: true, stock: s(2, 5, 6, 4, 3) },
      { slug: "verde-oliva", featured: false, stock: s(1, 3, 0, 2, 0) },
    ],
    description: "Comprimento alongado, zíper frontal de duas vias e bolsos laterais embutidos.",
    fabricCare: FABRIC_NUVEM,
  },
  {
    slug: "short-ciclista-toque-brisa",
    code: "SCTB",
    name: "Short Ciclista Toque Brisa",
    nameEmphasis: "Toque Brisa",
    priceCents: 16900,
    collection: "brisa",
    categories: ["leggings"],
    sensation: "BRISA",
    model: "CICLISTA",
    pictogram: "SHORT",
    badge: null,
    relevance: 70,
    salesCount: 190,
    publishedDaysAgo: 20,
    colors: [{ slug: "preto", featured: true, stock: s(4, 8, 10, 6, 3) }],
    description: "Comprimento ciclista, cós alto anatômico e costura plana que não marca.",
    fabricCare: FABRIC_BRISA,
  },
  {
    slug: "legging-ritual-flare",
    code: "LRFL",
    name: "Legging Ritual Flare",
    nameEmphasis: "Flare",
    priceCents: 31900,
    collection: "ritual",
    categories: ["leggings"],
    sensation: "NUVEM",
    model: "FLARE",
    pictogram: "FLARE",
    badge: "MAIS_VENDIDO",
    relevance: 92,
    salesCount: 380,
    publishedDaysAgo: 30,
    colors: [
      { slug: "preto", featured: true, stock: s(3, 9, 12, 7, 2) },
      { slug: "areia", featured: true, stock: s(2, 4, 5, 0, 0) },
    ],
    description: "Boca flare a partir do joelho, cintura alta e caimento fluido para a prática e para a rua.",
    fabricCare: FABRIC_NUVEM,
  },
  {
    slug: "legging-brisa-7-8",
    code: "LB78",
    name: "Legging Brisa 7/8",
    nameEmphasis: "7/8",
    priceCents: 26900,
    collection: "brisa",
    categories: ["leggings"],
    sensation: "BRISA",
    model: "SETE_OITAVOS",
    pictogram: "LEGGING",
    badge: "NOVO",
    relevance: 75,
    salesCount: 150,
    publishedDaysAgo: 6,
    colors: [
      { slug: "taupe", featured: true, stock: s(2, 6, 8, 5, 1) },
      { slug: "verde-oliva", featured: true, stock: s(3, 5, 7, 4, 0) },
    ],
    description: "Comprimento 7/8, tecido refrescante com secagem rápida e cós médio confortável.",
    fabricCare: FABRIC_BRISA,
  },
  {
    slug: "short-ciclista-toque-nuvem",
    code: "SCTN",
    name: "Short Ciclista Toque Nuvem",
    nameEmphasis: "Toque Nuvem",
    priceCents: 17900,
    collection: "respiro",
    categories: ["leggings"],
    sensation: "NUVEM",
    model: "CICLISTA",
    pictogram: "SHORT",
    badge: null,
    relevance: 65,
    salesCount: 120,
    publishedDaysAgo: 25,
    colors: [{ slug: "taupe", featured: true, stock: s(3, 6, 0, 4, 2) }],
    description: "Comprimento ciclista com toque amanteigado e cós duplo que não enrola.",
    fabricCare: FABRIC_NUVEM,
  },
  {
    slug: "legging-pausa-canelada",
    code: "LPCA",
    name: "Legging Pausa Canelada",
    nameEmphasis: "Canelada",
    priceCents: 29900,
    collection: "pausa",
    categories: ["leggings"],
    sensation: "NUVEM",
    model: "CINTURA_ALTA",
    pictogram: "LEGGING",
    badge: "EDICAO_LIMITADA",
    relevance: 60,
    salesCount: 90,
    publishedDaysAgo: 12,
    colors: [{ slug: "areia", featured: true, stock: s(1, 3, 4, 2, 0) }],
    description: "Textura canelada, cintura alta e comprimento total. Edição limitada da coleção Pausa.",
    fabricCare: FABRIC_NUVEM,
  },
];

const completeLook: Record<string, string[]> = {
  "legging-respiro-cintura-alta": ["top-respiro-alcas-finas", "casaco-pausa-alongado"],
  "top-respiro-alcas-finas": ["legging-respiro-cintura-alta", "casaco-pausa-alongado"],
  "macaquinho-respiro": ["casaco-pausa-alongado", "top-respiro-alcas-finas"],
  "casaco-pausa-alongado": ["legging-respiro-cintura-alta", "top-respiro-alcas-finas"],
  "short-ciclista-toque-brisa": ["top-respiro-alcas-finas", "casaco-pausa-alongado"],
  "legging-ritual-flare": ["top-respiro-alcas-finas", "casaco-pausa-alongado"],
  "legging-brisa-7-8": ["top-respiro-alcas-finas", "short-ciclista-toque-brisa"],
  "short-ciclista-toque-nuvem": ["top-respiro-alcas-finas", "casaco-pausa-alongado"],
  "legging-pausa-canelada": ["casaco-pausa-alongado", "top-respiro-alcas-finas"],
};
const youMayLike: Record<string, string[]> = {
  "legging-respiro-cintura-alta": ["legging-ritual-flare", "legging-brisa-7-8", "top-respiro-alcas-finas", "short-ciclista-toque-brisa"],
};

const imageCaptions: Record<ImageKind, string> = {
  FRENTE: "FOTO · FRENTE, FUNDO NEUTRO, LUZ LATERAL",
  COSTAS: "FOTO · COSTAS, FUNDO NEUTRO, LUZ LATERAL",
  DETALHE: "FOTO · DETALHE DO CÓS E DO TECIDO",
  VIDEO: "VÍDEO · PEÇA EM MOVIMENTO, 6 S EM LOOP",
};

// ─── Configurações e conteúdo editável ────────────────────────────────
const settings = {
  shipping: {
    freeShippingThresholdCents: 29900,
    pickup: { enabled: true, label: "Retirar na loja", address: "[endereço da loja]", days: 1 },
  },
  home: {
    hero: {
      kicker: "Coleção Respiro · Outono",
      titleLine1: "Movimento",
      titleLine2: "é vida.",
      videoUrl: null,
      posterUrl: null,
      caption: "VÍDEO · CAMPANHA RESPIRO, 8 S EM LOOP",
      primaryCta: { label: "Comprar a coleção", href: "/colecao/novidades" },
      secondaryCta: { label: "Ver o filme", href: "#filme" },
    },
    campaign: {
      title: "Na campanha",
      items: [
        { productSlug: "top-respiro-alcas-finas", colorSlug: "areia" },
        { productSlug: "legging-respiro-cintura-alta", colorSlug: "verde-oliva" },
      ],
      cta: "Adicionar o look",
    },
    shopTheLook: {
      kicker: "Compre o look",
      title: "Respiro",
      titleEmphasis: "em areia",
      caption: "FOTO · LOOK COMPLETO EM ESTÚDIO, LUZ LATERAL",
      imageUrl: null,
      items: [
        { productSlug: "top-respiro-alcas-finas", colorSlug: "areia", hotspot: { x: 53, y: 22 } },
        { productSlug: "legging-respiro-cintura-alta", colorSlug: "areia", hotspot: { x: 57, y: 59 } },
        { productSlug: "casaco-pausa-alongado", colorSlug: "areia", hotspot: { x: 40, y: 40 } },
      ],
      note: "Levando as 3 peças: 15% off aplicado na sacola.",
      cta: "Adicionar o look completo",
    },
    sensations: [
      { sensation: "NUVEM", title: "Toque Nuvem", text: "Maciez amanteigada para leggings, tops e moletons", href: "/colecao/leggings?sensacao=nuvem" },
      { sensation: "BRISA", title: "Toque Brisa", text: "Frescor contínuo para os dias quentes", href: "/colecao/leggings?sensacao=brisa" },
    ],
    studio: {
      kicker: "Studio MOVA",
      title: "Aulas para",
      titleEmphasis: "respirar junto.",
      text: "Yoga, pilates de solo e alongamento guiado em vídeos curtos, liberados para quem compra MOVA LEV.",
      cta: { label: "Assistir às aulas", href: "/studio" },
      classes: [
        { title: "Yoga ao acordar", meta: "12 min · iniciante", tone: "#4D5A3A", videoUrl: null },
        { title: "Pilates de solo", meta: "20 min · intermediário", tone: "#5E564D", videoUrl: null },
        { title: "Alongamento noturno", meta: "8 min · todos", tone: "#3D3832", videoUrl: null },
      ],
    },
    instagram: {
      title: "#MovimentoÉVida",
      handle: "@movalev",
      url: "https://instagram.com/movalev",
      tiles: [
        { tone: "#E6D5C5", caption: "FOTO · ALONGAMENTO NA AREIA" },
        { tone: "#DDE0D3", caption: "FOTO · YOGA AO AR LIVRE" },
        { tone: "#CFC4B7", caption: "FOTO · DETALHE DO TECIDO" },
        { tone: "#ECE6DD", caption: "FOTO · LOOK NO ESPELHO" },
        { tone: "#A99A8A", caption: "FOTO · PILATES DE SOLO" },
        { tone: "#E6D5C5", caption: "FOTO · CAFÉ PÓS-TREINO" },
      ],
    },
  },
};

const shippingRegions = [
  { name: "Sudeste", ufs: ["SP", "RJ", "MG", "ES"], standardCents: 1990, standardDays: 5, expressCents: 3490, expressDays: 2 },
  { name: "Sul", ufs: ["PR", "SC", "RS"], standardCents: 2490, standardDays: 7, expressCents: 4290, expressDays: 3 },
  { name: "Centro-Oeste", ufs: ["DF", "GO", "MT", "MS"], standardCents: 2990, standardDays: 8, expressCents: 4990, expressDays: 4 },
  { name: "Nordeste", ufs: ["BA", "SE", "AL", "PE", "PB", "RN", "CE", "PI", "MA"], standardCents: 3490, standardDays: 10, expressCents: 5990, expressDays: 5 },
  { name: "Norte", ufs: ["PA", "AM", "AP", "RR", "RO", "AC", "TO"], standardCents: 3990, standardDays: 12, expressCents: 6990, expressDays: 6 },
];

async function seedStorage() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.STORAGE_BUCKET ?? "produtos";
  if (!url || !key) {
    console.warn("  ! SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes — bucket e admin não criados.");
    return null;
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data: existing } = await supabase.storage.getBucket(bucket);
  const options = {
    public: true,
    fileSizeLimit: "10MB",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif", "video/mp4", "video/webm"],
  };
  const { error } = existing ? await supabase.storage.updateBucket(bucket, options) : await supabase.storage.createBucket(bucket, options);
  if (error) throw error;
  console.log(`  ✓ bucket "${bucket}" (leitura pública, upload só pela API)`);
  return supabase;
}

async function seedAdmins(supabase: NonNullable<Awaited<ReturnType<typeof seedStorage>>>) {
  const isLocal = /127\.0\.0\.1|localhost/.test(process.env.SUPABASE_URL ?? "");
  const emails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  // Em ambiente local, um admin de teste (login por link mágico, que chega no Mailpit em :54324).
  if (isLocal) emails.push("admin@movalev.test");

  for (const email of new Set(emails)) {
    let userId: string | undefined;
    const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    userId = list?.users.find((u) => u.email?.toLowerCase() === email)?.id;
    if (!userId && isLocal) {
      const { data, error } = await supabase.auth.admin.createUser({ email, email_confirm: true });
      if (error) throw error;
      userId = data.user.id;
    }
    if (!userId) {
      console.warn(`  ! ${email} ainda não tem conta — ela vira admin quando rodar o seed depois do 1º login.`);
      continue;
    }
    await prisma.profile.upsert({ where: { id: userId }, create: { id: userId, email, role: "ADMIN" }, update: { role: "ADMIN" } });
    console.log(`  ✓ admin ${email}`);
  }
}

async function main() {
  console.log("Seed MOVA LEV");

  const colorIds = new Map<string, string>();
  for (const c of colors) {
    const row = await prisma.color.upsert({ where: { slug: c.slug }, create: c, update: c });
    colorIds.set(c.slug, row.id);
  }
  console.log(`  ✓ ${colors.length} cores`);

  const categoryIds = new Map<string, string>();
  for (const [i, c] of categories.entries()) {
    const data = { ...c, sortOrder: i };
    const row = await prisma.category.upsert({ where: { slug: c.slug }, create: data, update: data });
    categoryIds.set(c.slug, row.id);
  }
  console.log(`  ✓ ${categories.length} categorias`);

  const collectionIds = new Map<string, string>();
  for (const c of collections) {
    const row = await prisma.collection.upsert({ where: { slug: c.slug }, create: c, update: c });
    collectionIds.set(c.slug, row.id);
  }

  const productIds = new Map<string, string>();
  let variantCount = 0;
  for (const p of products) {
    const base = {
      name: p.name,
      nameEmphasis: p.nameEmphasis,
      description: p.description,
      fabricCare: p.fabricCare,
      priceCents: p.priceCents,
      badge: p.badge,
      sensation: p.sensation,
      model: p.model,
      pictogram: p.pictogram,
      relevance: p.relevance,
      salesCount: p.salesCount,
      publishedAt: new Date(Date.now() - p.publishedDaysAgo * 86_400_000),
      collectionId: collectionIds.get(p.collection) ?? null,
    };
    const product = await prisma.product.upsert({ where: { slug: p.slug }, create: { slug: p.slug, ...base }, update: base });
    productIds.set(p.slug, product.id);

    await prisma.productCategory.deleteMany({ where: { productId: product.id } });
    await prisma.productCategory.createMany({
      data: p.categories.map((slug, i) => ({ productId: product.id, categoryId: categoryIds.get(slug)!, sortOrder: i })),
    });

    await prisma.productColor.deleteMany({ where: { productId: product.id } });
    await prisma.productColor.createMany({
      data: p.colors.map((c, i) => ({ productId: product.id, colorId: colorIds.get(c.slug)!, sortOrder: i, featured: c.featured })),
    });

    for (const c of p.colors) {
      const colorId = colorIds.get(c.slug)!;
      for (const size of SIZES) {
        const sku = `ML-${p.code}-${c.slug.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3)}-${size}`;
        await prisma.variant.upsert({
          where: { productId_colorId_size: { productId: product.id, colorId, size } },
          create: { productId: product.id, colorId, size, sku, stock: c.stock[size] },
          update: { sku, stock: c.stock[size] },
        });
        variantCount++;
      }
    }

    // Placeholders de foto (sem storagePath): Frente, Costas, Detalhe do cós, Vídeo — por cor.
    await prisma.productImage.deleteMany({ where: { productId: product.id, storagePath: null } });
    const kinds: ImageKind[] = ["FRENTE", "COSTAS", "DETALHE", "VIDEO"];
    await prisma.productImage.createMany({
      data: p.colors.flatMap((c) =>
        kinds.map((kind, i) => ({
          productId: product.id,
          colorId: colorIds.get(c.slug)!,
          kind,
          alt: `${p.name} na cor ${colors.find((x) => x.slug === c.slug)!.name} — ${kind.toLowerCase()}`,
          caption: imageCaptions[kind],
          sortOrder: i,
        })),
      ),
    });
  }
  console.log(`  ✓ ${products.length} produtos, ${variantCount} variantes`);

  await prisma.productRelation.deleteMany({});
  const relations = [
    ...Object.entries(completeLook).flatMap(([from, tos]) => tos.map((to, i) => ({ from, to, kind: "COMPLETE_LOOK" as const, i }))),
    ...Object.entries(youMayLike).flatMap(([from, tos]) => tos.map((to, i) => ({ from, to, kind: "YOU_MAY_LIKE" as const, i }))),
  ];
  await prisma.productRelation.createMany({
    data: relations.map((r) => ({ productId: productIds.get(r.from)!, relatedId: productIds.get(r.to)!, kind: r.kind, sortOrder: r.i })),
  });
  console.log(`  ✓ ${relations.length} relações (Complete o look / Você também vai gostar)`);

  await prisma.progressiveTier.deleteMany({});
  await prisma.progressiveTier.createMany({
    data: [
      { minItems: 2, percent: 10 },
      { minItems: 3, percent: 15 },
      { minItems: 4, percent: 20 },
    ],
  });
  console.log("  ✓ desconto progressivo 2·10% / 3·15% / 4·20%");

  await prisma.shippingRegion.deleteMany({});
  await prisma.shippingRegion.createMany({ data: shippingRegions.map((r, i) => ({ ...r, sortOrder: i })) });
  console.log(`  ✓ ${shippingRegions.length} regiões de frete`);

  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }
  console.log("  ✓ configurações (frete, conteúdo da Home)");

  await prisma.coupon.upsert({
    where: { code: "BEMVINDA10" },
    create: {
      code: "BEMVINDA10",
      description: "10% na 1ª compra",
      type: "PERCENT",
      value: 10,
      firstPurchaseOnly: true,
      stacksWithProgressive: true,
    },
    update: {},
  });
  console.log("  ✓ cupom BEMVINDA10");

  const supabase = await seedStorage();
  if (supabase) await seedAdmins(supabase);

  console.log("Pronto.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
