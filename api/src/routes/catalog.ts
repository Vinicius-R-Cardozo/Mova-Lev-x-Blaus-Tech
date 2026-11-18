import type { FastifyInstance, FastifyReply } from "fastify";
import type { StoreConfigDTO } from "@movalev/shared";
import { paymentSettings, storeSettings } from "../lib/settings";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  MODEL_SLUG,
  catalogQuerySchema,
  homeContentSchema,
  type CategoryDTO,
  type CategoryPageDTO,
  type HomeDTO,
  type Model,
  type ProductDetailDTO,
  type Sensation,
} from "@movalev/shared";
import { prisma } from "../lib/prisma";
import { cardInclude, toCard, toColor, toImage, toSizes, type CardProduct } from "../lib/catalog";
import { responseCache } from "../lib/cache";

const CATALOG_TTL_MS = 60_000;

/** Categoria virtual com todas as peças, ordenadas pelas mais novas. */
const NOVIDADES: CategoryDTO = {
  slug: "novidades",
  name: "Novidades",
  description: "Recém-chegados da coleção Respiro: tons de areia, oliva e taupe para combinar entre si.",
  bannerCaption: "FOTO · CAMPANHA RESPIRO, LUZ NATURAL",
  bannerUrl: null,
  pictogram: "CONJUNTO",
  tone: "#E6D5C5",
  showInMenu: true,
};

const MODEL_BY_SLUG = Object.fromEntries(Object.entries(MODEL_SLUG).map(([k, v]) => [v, k])) as Record<string, Model>;

const toCategory = (c: {
  slug: string;
  name: string;
  description: string | null;
  bannerCaption: string | null;
  bannerUrl: string | null;
  pictogram: CategoryDTO["pictogram"];
  tone: string;
  showInMenu: boolean;
}): CategoryDTO => ({
  slug: c.slug,
  name: c.name,
  description: c.description,
  bannerCaption: c.bannerCaption,
  bannerUrl: c.bannerUrl,
  pictogram: c.pictogram,
  tone: c.tone,
  showInMenu: c.showInMenu,
});

function cache(reply: FastifyReply, seconds = 60) {
  reply.header("Cache-Control", `public, max-age=${Math.min(seconds, 30)}, s-maxage=${seconds}, stale-while-revalidate=300`);
}

const notFound = (reply: FastifyReply, message: string) => reply.code(404).send({ error: "nao_encontrado", message });

async function cardsBySlugs(refs: { productSlug: string; colorSlug: string }[]) {
  const products = await prisma.product.findMany({
    where: { slug: { in: refs.map((r) => r.productSlug) }, status: "ACTIVE" },
    include: cardInclude,
  });
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  return refs.flatMap((r) => {
    const p = bySlug.get(r.productSlug);
    return p ? [{ ref: r, card: toCard(p, r.colorSlug) }] : [];
  });
}

export async function catalogRoutes(app: FastifyInstance) {
  // Respostas do catálogo ficam 60 s em memória (limpas na hora quando o admin altera algo).
  app.addHook("onRequest", async (req, reply) => {
    if (req.method !== "GET") return;
    const hit = responseCache.get(`catalog:${req.url}`, CATALOG_TTL_MS);
    if (!hit) return;
    cache(reply, 60);
    return reply.header("X-Cache", "HIT").type(hit.type).send(hit.body);
  });
  app.addHook("onSend", async (req, reply, payload) => {
    if (req.method === "GET" && reply.statusCode === 200 && typeof payload === "string" && !reply.getHeader("X-Cache")) {
      responseCache.set(`catalog:${req.url}`, payload, String(reply.getHeader("content-type") ?? "application/json"));
      reply.header("X-Cache", "MISS");
    }
    return payload;
  });

  // ── Loja: dados da empresa, canais e formas de pagamento (rodapé, páginas legais, checkout) ──
  app.get("/catalog/store", async (_req, reply): Promise<StoreConfigDTO> => {
    const [store, payments] = await Promise.all([storeSettings(), paymentSettings()]);
    cache(reply, 60);
    return { store, payments };
  });

  // ── Categorias (menu, atalhos, rodapé) ──
  app.get("/catalog/categories", async (_req, reply) => {
    const rows = await prisma.category.findMany({ where: { archivedAt: null }, orderBy: { sortOrder: "asc" } });
    cache(reply, 300);
    return [NOVIDADES, ...rows.map(toCategory)];
  });

  // ── Home ──
  app.get("/catalog/home", async (_req, reply): Promise<HomeDTO> => {
    const [setting, categories, newest, best] = await Promise.all([
      prisma.setting.findUnique({ where: { key: "home" } }),
      prisma.category.findMany({ where: { archivedAt: null }, orderBy: { sortOrder: "asc" } }),
      prisma.product.findMany({ where: { status: "ACTIVE" }, orderBy: { publishedAt: "desc" }, take: 4, include: cardInclude }),
      prisma.product.findMany({ where: { status: "ACTIVE" }, orderBy: { salesCount: "desc" }, take: 4, include: cardInclude }),
    ]);
    const content = homeContentSchema.parse(setting?.value);
    const [campaign, look] = await Promise.all([cardsBySlugs(content.campaign.items), cardsBySlugs(content.shopTheLook.items)]);
    cache(reply, 60);
    return {
      hero: content.hero,
      campaign: { title: content.campaign.title, cta: content.campaign.cta, items: campaign.map((c) => c.card) },
      categories: categories.map(toCategory),
      newArrivals: newest.map((p) => toCard(p)),
      bestSellers: best.map((p) => toCard(p)),
      shopTheLook: {
        ...content.shopTheLook,
        items: look.map(({ ref, card }) => ({
          product: card,
          hotspot: content.shopTheLook.items.find((i) => i.productSlug === ref.productSlug)!.hotspot,
        })),
      },
      sensations: content.sensations,
      studio: content.studio,
      instagram: content.instagram,
    };
  });

  // ── Categoria com filtros (todos processados aqui, nunca no navegador) ──
  app.get<{ Params: { slug: string } }>("/catalog/categories/:slug/products", async (req, reply) => {
    const q = catalogQuerySchema.parse(req.query);
    const slug = z.string().regex(/^[a-z0-9-]+$/).max(60).parse(req.params.slug);

    let category: CategoryDTO;
    let categoryId: string | null = null;
    const productWhere: Prisma.ProductWhereInput = { status: "ACTIVE" };
    if (slug === NOVIDADES.slug) {
      category = NOVIDADES;
    } else {
      const row = await prisma.category.findUnique({ where: { slug } });
      if (!row || row.archivedAt) return notFound(reply, "Categoria não encontrada.");
      categoryId = row.id;
      category = toCategory(row);
      productWhere.categories = { some: { categoryId: row.id } };
    }

    // Facetas calculadas sobre a categoria inteira (antes dos filtros).
    const [priceAgg, facetColors] = await Promise.all([
      prisma.product.aggregate({ where: productWhere, _min: { priceCents: true }, _max: { priceCents: true } }),
      prisma.color.findMany({
        where: { productColors: { some: { product: productWhere } } },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    const filtered: Prisma.ProductWhereInput = { ...productWhere };
    if (q.modelo) filtered.model = MODEL_BY_SLUG[q.modelo];
    if (q.sensacao.length) filtered.sensation = { in: q.sensacao.map((s) => s.toUpperCase() as Sensation) };
    if (q.precoMin !== undefined || q.precoMax !== undefined) {
      filtered.priceCents = {
        ...(q.precoMin !== undefined ? { gte: q.precoMin * 100 } : {}),
        ...(q.precoMax !== undefined ? { lte: q.precoMax * 100 } : {}),
      };
    }

    const where: Prisma.ProductColorWhereInput = {
      product: filtered,
      ...(q.cor.length ? { color: { slug: { in: q.cor } } } : { featured: true }),
    };

    // Tamanho: só cores que têm aquele tamanho em estoque.
    if (q.tamanho.length) {
      const pairs = await prisma.variant.findMany({
        where: { size: { in: q.tamanho }, stock: { gt: 0 }, product: filtered },
        select: { productId: true, colorId: true },
        distinct: ["productId", "colorId"],
      });
      where.OR = pairs.length ? pairs.map((p) => ({ productId: p.productId, colorId: p.colorId })) : [{ productId: "00000000-0000-0000-0000-000000000000" }];
    }

    const sort = q.ordem === "relevancia" && slug === NOVIDADES.slug ? "novidades" : q.ordem;
    const orderBy: Prisma.ProductColorOrderByWithRelationInput[] =
      sort === "novidades"
        ? [{ product: { publishedAt: "desc" } }, { sortOrder: "asc" }]
        : sort === "menor-preco"
          ? [{ product: { priceCents: "asc" } }, { sortOrder: "asc" }]
          : sort === "maior-preco"
            ? [{ product: { priceCents: "desc" } }, { sortOrder: "asc" }]
            : [{ product: { relevance: "desc" } }, { sortOrder: "asc" }];

    // "Relevância" numa categoria: a ordem definida no painel (categoria → produtos) e,
    // empatando, a relevância do produto. Ordenar por relação 1:N não dá no banco,
    // então ordena aqui (categorias têm dezenas de itens, não milhares).
    const curated = sort === "relevancia" && categoryId;
    const [total, rows] = await Promise.all([
      prisma.productColor.count({ where }),
      curated
        ? prisma.productColor
            .findMany({
              where,
              orderBy,
              include: { product: { include: { ...cardInclude, categories: { where: { categoryId: categoryId! }, select: { sortOrder: true } } } } },
            })
            .then((all) =>
              all
                .sort((a, b) => (a.product.categories[0]?.sortOrder ?? 9999) - (b.product.categories[0]?.sortOrder ?? 9999))
                .slice((q.pagina - 1) * q.porPagina, q.pagina * q.porPagina),
            )
        : prisma.productColor.findMany({
            where,
            orderBy,
            skip: (q.pagina - 1) * q.porPagina,
            take: q.porPagina,
            include: { product: { include: cardInclude } },
          }),
    ]);

    cache(reply, 60);
    const page: CategoryPageDTO = {
      category,
      items: rows.map((r) => toCard(r.product as CardProduct, r.colorId)),
      total,
      page: q.pagina,
      pageSize: q.porPagina,
      facets: {
        colors: facetColors.map(toColor),
        priceMinCents: priceAgg._min.priceCents ?? 0,
        priceMaxCents: priceAgg._max.priceCents ?? 0,
      },
    };
    return page;
  });

  // ── Produto ──
  app.get<{ Params: { slug: string } }>("/catalog/products/:slug", async (req, reply) => {
    const slug = z.string().regex(/^[a-z0-9-]+$/).max(120).parse(req.params.slug);
    // Oculto abre por link direto (a página fica sem indexação).
    const p = await prisma.product.findFirst({
      where: { slug, status: { in: ["ACTIVE", "HIDDEN"] } },
      include: {
        ...cardInclude,
        collection: true,
        categories: { where: { category: { archivedAt: null } }, include: { category: true }, orderBy: { sortOrder: "asc" } },
        related: { include: { related: { include: cardInclude } }, orderBy: { sortOrder: "asc" } },
      },
    });
    if (!p) return notFound(reply, "Produto não encontrado.");

    const active = p.related.filter((r) => r.related.status === "ACTIVE");
    const completeLook = active.filter((r) => r.kind === "COMPLETE_LOOK").map((r) => toCard(r.related));
    let youMayLike = active.filter((r) => r.kind === "YOU_MAY_LIKE").map((r) => toCard(r.related));
    if (youMayLike.length < 4) {
      const firstCategory = p.categories[0]?.categoryId;
      const extra = await prisma.product.findMany({
        where: {
          status: "ACTIVE",
          id: { notIn: [p.id, ...youMayLike.map((c) => c.id)] },
          ...(firstCategory ? { categories: { some: { categoryId: firstCategory } } } : {}),
        },
        orderBy: { relevance: "desc" },
        take: 4 - youMayLike.length,
        include: cardInclude,
      });
      youMayLike = [...youMayLike, ...extra.map((e) => toCard(e))];
    }

    const detail: ProductDetailDTO = {
      id: p.id,
      slug: p.slug,
      name: p.name,
      nameEmphasis: p.nameEmphasis,
      priceCents: p.priceCents,
      compareAtPriceCents: p.compareAtPriceCents,
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
      hidden: p.status === "HIDDEN",
      badge: p.badge,
      sensation: p.sensation,
      model: p.model,
      pictogram: p.pictogram,
      description: p.description,
      fabricCare: p.fabricCare,
      collection: p.collection ? { slug: p.collection.slug, name: p.collection.name, season: p.collection.season } : null,
      category: p.categories[0] ? { slug: p.categories[0].category.slug, name: p.categories[0].category.name } : null,
      rating: p.ratingCount > 0 && p.ratingAvg ? { average: Number(p.ratingAvg), count: p.ratingCount } : null,
      colors: p.colors.map((pc) => ({
        ...toColor(pc.color),
        images: p.images.filter((i) => i.colorId === pc.colorId).map(toImage),
        sizes: toSizes(p.variants, pc.colorId, p.priceCents),
      })),
      completeLook,
      youMayLike,
    };
    cache(reply, 60);
    return detail;
  });

  // ── Busca simples por nome ──
  app.get("/catalog/search", async (req, reply) => {
    const { q } = z.object({ q: z.string().trim().min(2).max(60) }).parse(req.query);
    const terms = q.split(/\s+/).filter(Boolean).slice(0, 5);
    const rows = await prisma.product.findMany({
      where: { status: "ACTIVE", AND: terms.map((t) => ({ name: { contains: t, mode: "insensitive" as const } })) },
      orderBy: { relevance: "desc" },
      take: 24,
      include: cardInclude,
    });
    cache(reply, 60);
    return { query: q, items: rows.map((r) => toCard(r)) };
  });

  // ── Sitemap: slugs públicos ──
  app.get("/catalog/slugs", async (_req, reply) => {
    const [products, categories] = await Promise.all([
      prisma.product.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true } }),
      prisma.category.findMany({ where: { archivedAt: null }, select: { slug: true } }),
    ]);
    cache(reply, 600);
    return { products, categories: [NOVIDADES.slug, ...categories.map((c) => c.slug)] };
  });
}
