/**
 * Fotos de DEMONSTRAÇÃO (fictícias) para a loja parecer pronta enquanto as fotos
 * oficiais não chegam. Fonte: Unsplash (licença gratuita, uso comercial permitido,
 * sem atribuição obrigatória). Nenhuma foto mostra peças da MOVA LEV de verdade.
 *
 *   npm run demo:fotos -w @movalev/api            → baixa, sobe para o Storage (pasta demo/) e liga no banco
 *   npm run demo:fotos -w @movalev/api -- --remover → desliga tudo e volta aos desenhos
 *
 * Só mexe no que é de demonstração: imagens em `demo/`, banners com `/demo/` e os
 * campos de foto da home (o conteúdo original fica salvo em settings.home_demo_backup).
 */
import { prisma } from "../src/lib/prisma";
import { publicImageUrl, supabaseAdmin } from "../src/lib/supabase";
import { env } from "../src/env";
import { homeContentSchema } from "@movalev/shared";

type Kind = "FRENTE" | "COSTAS" | "DETALHE";
type Shot = "retrato" | "largo" | "quadrado";

/** Formatos gerados no CDN do Unsplash (recorte centrado em rosto/assunto). */
const SHOT: Record<Shot, string> = {
  retrato: "w=1200&h=1600&fit=crop&crop=faces,entropy&q=78&fm=jpg",
  largo: "w=2400&h=1350&fit=crop&crop=entropy&q=75&fm=jpg",
  quadrado: "w=800&h=800&fit=crop&crop=faces,entropy&q=75&fm=jpg",
};

/** produto → cor → [frente, costas (hover), detalhe] (ids de fotos do Unsplash). */
const PRODUTOS: Record<string, Record<string, [string, string, string]>> = {
  "casaco-pausa-alongado": {
    areia: ["1685464583257-66f61ea61380", "1685464583143-f9802b19d98c", "1685464583529-7f527c50e22f"],
    preto: ["1774791581006-82c995251341", "1717674796293-0a49f3721880", "1644769752255-e80980882aeb"],
    "verde-oliva": ["1754167718036-81b4de3c344d", "1726839484671-8314a739c48a", "1646284933164-7f9b4f35ce87"],
  },
  "legging-brisa-7-8": {
    taupe: ["1768929096172-ca7a26ce9630", "1762331655528-4af4bccf7c62", "1579454566790-f9e5697ddf36"],
    "verde-oliva": ["1713201357737-48f47ac2490a", "1668308687914-300c663897e7", "1646284933164-7f9b4f35ce87"],
  },
  "legging-pausa-canelada": {
    areia: ["1744374345182-ad26dd573b53", "1690085028725-481caf2f27db", "1607957598810-191e891df4d5"],
  },
  "legging-respiro-cintura-alta": {
    areia: ["1607957598794-451c9938284a", "1607957599720-4ce6b1352c7e", "1652676881605-3632fec0ccc3"],
    "verde-oliva": ["1713201670701-217932c674ae", "1673872967212-e78fec4df6fa", "1646284933164-7f9b4f35ce87"],
    preto: ["1789111161024-14711920a5b0", "1789110519393-2f292a378a3a", "1762331651871-76ae345a365f"],
    taupe: ["1606902965551-dce093cda6e7", "1600881333290-31fdbdfbe493", "1579454556452-df22791550f8"],
  },
  "legging-ritual-flare": {
    preto: ["1789110853564-23a6b1d206e7", "1789111161057-90c5ce12dc21", "1762331660576-cbf66a7db84d"],
    areia: ["1647712481376-084e042d9330", "1654796575508-87551283b394", "1621694680688-d80e3a778e0e"],
  },
  "macaquinho-respiro": {
    taupe: ["1628519471223-4af740268c74", "1606902965551-dce093cda6e7", "1579454566790-f9e5697ddf36"],
    preto: ["1762331648554-94fdae0956da", "1762331648768-257e4e6ac790", "1762331650558-4b345e9080ad"],
  },
  "short-ciclista-toque-brisa": {
    preto: ["1628519492564-f9b926d1fc9a", "1606787967379-373be086ddc6", "1612428057985-237d5292556a"],
  },
  "short-ciclista-toque-nuvem": {
    taupe: ["1628271491650-c2346e8aa7c5", "1639389109728-9099e20600d5", "1579454556452-df22791550f8"],
  },
  "top-respiro-alcas-finas": {
    "verde-oliva": ["1713201670701-217932c674ae", "1673872967212-e78fec4df6fa", "1646284933164-7f9b4f35ce87"],
    areia: ["1597299001669-6454fec8ac25", "1730073179873-e47e9a0bc3d2", "1690085028725-481caf2f27db"],
    taupe: ["1600881333290-31fdbdfbe493", "1579454556452-df22791550f8", "1579454566790-f9e5697ddf36"],
  },
};

/** Banners das categorias (foto larga). */
const BANNERS: Record<string, string> = {
  leggings: "1697060739671-586c21fa5e30",
  tops: "1534971142555-884e9edc15e9",
  conjuntos: "1747239891485-0f98c4ee9c76",
  macaquinhos: "1717500251742-8043bda71f3c",
  casacos: "1685464583257-66f61ea61380",
  acessorios: "1651786120506-390d37d4d9e3",
};

/** Home: hero, Compre o look, Sensações, Studio e Instagram. */
const HOME = {
  hero: "1747239685045-fcbcf98985db",
  look: "1713201670701-217932c674ae",
  sensations: ["1713201673819-122ab540f947", "1667586733525-0eea514bfb49"],
  studio: ["1717500251833-d807c5753ded", "1717500252179-2811af29e4f7", "1747240031720-dced770be260"],
  instagram: [
    "1607957598794-451c9938284a",
    "1713201670701-217932c674ae",
    "1628519492564-f9b926d1fc9a",
    "1747239685045-fcbcf98985db",
    "1628271491650-c2346e8aa7c5",
    "1713201357737-48f47ac2490a",
  ],
};

/**
 * Compre o look combinando com a foto (top + legging verde-oliva). Pontos em % da
 * FOTO (o site converte para o recorte de cada tela).
 */
const LOOK = {
  titleEmphasis: "em oliva",
  note: "Levando as 2 peças: 10% off aplicado na sacola.",
  items: [
    { productSlug: "top-respiro-alcas-finas", colorSlug: "verde-oliva", hotspot: { x: 52, y: 55 } },
    { productSlug: "legging-respiro-cintura-alta", colorSlug: "verde-oliva", hotspot: { x: 58, y: 82 } },
  ],
};

const BACKUP_KEY = "home_demo_backup";
const enviadas = new Map<string, string>();

/** Baixa do CDN do Unsplash e sobe para o Storage (uma vez por foto+formato). */
async function subir(id: string, shot: Shot): Promise<string> {
  const path = `demo/${id}-${shot}.jpg`;
  if (enviadas.has(path)) return path;
  const res = await fetch(`https://images.unsplash.com/photo-${id}?${SHOT[shot]}`);
  if (!res.ok) throw new Error(`Falha ao baixar ${id}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const { error } = await supabaseAdmin().storage.from(env.STORAGE_BUCKET).upload(path, buf, { contentType: "image/jpeg", upsert: true, cacheControl: "31536000" });
  if (error) throw new Error(`Falha ao subir ${path}: ${error.message}`);
  enviadas.set(path, path);
  process.stdout.write(".");
  return path;
}

async function aplicar() {
  // 1) Produtos: frente, costas e detalhe de cada cor (vídeo continua placeholder).
  let fotos = 0;
  for (const [slug, cores] of Object.entries(PRODUTOS)) {
    const product = await prisma.product.findUnique({ where: { slug }, include: { colors: { include: { color: true } }, images: true } });
    if (!product) {
      console.warn(`\nProduto ${slug} não existe — pulado.`);
      continue;
    }
    for (const [colorSlug, ids] of Object.entries(cores)) {
      const pc = product.colors.find((c) => c.color.slug === colorSlug);
      if (!pc) continue;
      const kinds: Kind[] = ["FRENTE", "COSTAS", "DETALHE"];
      for (const [i, kind] of kinds.entries()) {
        const img = product.images.find((im) => im.colorId === pc.colorId && im.kind === kind);
        // Não sobrescreve foto oficial já enviada pelo admin.
        if (!img || (img.storagePath && !img.storagePath.startsWith("demo/"))) continue;
        const path = await subir(ids[i]!, "retrato");
        await prisma.productImage.update({ where: { id: img.id }, data: { storagePath: path } });
        fotos++;
      }
    }
  }

  // 2) Banners das categorias.
  for (const [slug, id] of Object.entries(BANNERS)) {
    const cat = await prisma.category.findUnique({ where: { slug } });
    if (!cat || (cat.bannerUrl && !cat.bannerUrl.includes("/demo/"))) continue;
    await prisma.category.update({ where: { slug }, data: { bannerUrl: publicImageUrl(await subir(id, "largo")) } });
  }

  // 3) Home (guarda o original uma vez para poder voltar).
  const setting = await prisma.setting.findUnique({ where: { key: "home" } });
  const original = homeContentSchema.parse(setting?.value);
  if (!(await prisma.setting.findUnique({ where: { key: BACKUP_KEY } }))) {
    await prisma.setting.create({ data: { key: BACKUP_KEY, value: original } });
  }
  const url = async (id: string, shot: Shot) => publicImageUrl(await subir(id, shot));
  const home = structuredClone(original);
  home.hero.posterUrl ??= await url(HOME.hero, "largo");
  home.shopTheLook.imageUrl ??= await url(HOME.look, "retrato");
  if (home.shopTheLook.imageUrl.includes("/demo/")) Object.assign(home.shopTheLook, LOOK);
  for (const [i, s] of home.sensations.entries()) if (HOME.sensations[i]) s.imageUrl ??= await url(HOME.sensations[i]!, "retrato");
  for (const [i, c] of home.studio.classes.entries()) if (HOME.studio[i]) c.imageUrl ??= await url(HOME.studio[i]!, "retrato");
  for (const [i, t] of home.instagram.tiles.entries()) t.imageUrl ??= await url(HOME.instagram[i % HOME.instagram.length]!, "quadrado");
  await prisma.setting.update({ where: { key: "home" }, data: { value: homeContentSchema.parse(home) } });

  console.log(`\nPronto: ${fotos} fotos de produto, ${Object.keys(BANNERS).length} banners e a home com fotos de demonstração (${enviadas.size} arquivos em demo/).`);
}

async function remover() {
  const imgs = await prisma.productImage.updateMany({ where: { storagePath: { startsWith: "demo/" } }, data: { storagePath: null } });
  const cats = await prisma.category.updateMany({ where: { bannerUrl: { contains: "/demo/" } }, data: { bannerUrl: null } });
  const backup = await prisma.setting.findUnique({ where: { key: BACKUP_KEY } });
  if (backup) {
    await prisma.setting.update({ where: { key: "home" }, data: { value: backup.value ?? {} } });
    await prisma.setting.delete({ where: { key: BACKUP_KEY } });
  }
  // Apaga os arquivos de demonstração do Storage.
  const bucket = supabaseAdmin().storage.from(env.STORAGE_BUCKET);
  const { data: files } = await bucket.list("demo", { limit: 1000 });
  if (files?.length) await bucket.remove(files.map((f) => `demo/${f.name}`));
  console.log(`Removido: ${imgs.count} fotos de produto, ${cats.count} banners, home ${backup ? "restaurada" : "sem backup"}, ${files?.length ?? 0} arquivos apagados.`);
}

(process.argv.includes("--remover") ? remover() : aplicar())
  .catch((err) => {
    console.error("\n", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
