"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { homeContentSchema, type HomeContent } from "@movalev/shared";
import { useAuth } from "@/lib/auth";
import { Card, Input, Notice, PageTitle, Select, Textarea } from "@/components/admin/ui";

type MetaProduct = { id: string; name: string; slug: string; colors: { color: { slug: string; name: string } }[] };

function ProductColorPicker({ products, value, onChange, label }: { products: MetaProduct[]; value: { productSlug: string; colorSlug: string }; onChange: (v: { productSlug: string; colorSlug: string }) => void; label: string }) {
  const p = products.find((x) => x.slug === value.productSlug);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Select label={`${label} · peça`} value={value.productSlug} onChange={(e) => {
        const np = products.find((x) => x.slug === e.target.value);
        onChange({ productSlug: e.target.value, colorSlug: np?.colors[0]?.color.slug ?? "" });
      }}>
        {products.map((x) => <option key={x.id} value={x.slug}>{x.name}</option>)}
      </Select>
      <Select label="Cor" value={value.colorSlug} onChange={(e) => onChange({ ...value, colorSlug: e.target.value })}>
        {p?.colors.map((c) => <option key={c.color.slug} value={c.color.slug}>{c.color.name}</option>)}
      </Select>
    </div>
  );
}

export default function ConteudoPage() {
  const { apiFetch } = useAuth();
  const [home, setHome] = useState<HomeContent | null>(null);
  const [products, setProducts] = useState<MetaProduct[]>([]);
  const [notice, setNotice] = useState<{ kind: "ok" | "erro"; text: string } | null>(null);

  useEffect(() => {
    apiFetch<HomeContent>("/admin/settings/home").then(setHome);
    apiFetch<{ products: MetaProduct[] }>("/admin/meta").then((m) => setProducts(m.products));
  }, [apiFetch]);

  async function saveHome() {
    const parsed = homeContentSchema.safeParse(home);
    if (!parsed.success) return setNotice({ kind: "erro", text: `Confira: ${parsed.error.issues[0]?.path.join(".")} — ${parsed.error.issues[0]?.message}` });
    try {
      await apiFetch("/admin/settings/home", { method: "PUT", body: JSON.stringify(parsed.data) });
      setNotice({ kind: "ok", text: "Home salva. A loja atualiza em instantes." });
    } catch (err) {
      setNotice({ kind: "erro", text: err instanceof Error ? err.message : "Erro." });
    }
  }

  if (!home) return <p role="status">Carregando…</p>;
  const hero = home.hero;
  const setHero = (patch: Partial<HomeContent["hero"]>) => setHome({ ...home, hero: { ...hero, ...patch } });
  const look = home.shopTheLook;
  const setLook = (patch: Partial<HomeContent["shopTheLook"]>) => setHome({ ...home, shopTheLook: { ...look, ...patch } });

  return (
    <>
      <PageTitle actions={<button type="button" onClick={() => void saveHome()} className="btn-primary h-11 px-6">Salvar Home</button>}>Home e coleções</PageTitle>
      {notice && <div className="mb-4"><Notice kind={notice.kind}>{notice.text}</Notice></div>}

      <Card title="Hero">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Kicker" value={hero.kicker} onChange={(e) => setHero({ kicker: e.target.value })} />
          <Input label="Legenda do placeholder" value={hero.caption} onChange={(e) => setHero({ caption: e.target.value })} />
          <Input label="Título — 1ª linha" value={hero.titleLine1} onChange={(e) => setHero({ titleLine1: e.target.value })} />
          <Input label="Título — 2ª linha (itálico)" value={hero.titleLine2} onChange={(e) => setHero({ titleLine2: e.target.value })} />
          <Input label="Vídeo (URL .mp4)" value={hero.videoUrl ?? ""} hint="Vazio = placeholder. Ex.: arquivo no Storage do Supabase." onChange={(e) => setHero({ videoUrl: e.target.value || null })} />
          <Input label="Imagem de capa do vídeo (URL)" value={hero.posterUrl ?? ""} onChange={(e) => setHero({ posterUrl: e.target.value || null })} />
          <Input label="Botão claro — texto" value={hero.primaryCta.label} onChange={(e) => setHero({ primaryCta: { ...hero.primaryCta, label: e.target.value } })} />
          <Input label="Botão claro — link" value={hero.primaryCta.href} onChange={(e) => setHero({ primaryCta: { ...hero.primaryCta, href: e.target.value } })} />
        </div>
      </Card>

      <Card title="Na campanha" className="mt-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Título do card" value={home.campaign.title} onChange={(e) => setHome({ ...home, campaign: { ...home.campaign, title: e.target.value } })} />
          <Input label="Botão" value={home.campaign.cta} onChange={(e) => setHome({ ...home, campaign: { ...home.campaign, cta: e.target.value } })} />
        </div>
        <div className="mt-4 space-y-3">
          {home.campaign.items.map((it, i) => (
            <ProductColorPicker key={i} label={`Peça ${i + 1}`} products={products} value={it} onChange={(v) => setHome({ ...home, campaign: { ...home.campaign, items: home.campaign.items.map((x, j) => (j === i ? v : x)) } })} />
          ))}
        </div>
      </Card>

      <Card title="Compre o look" className="mt-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Input label="Kicker" value={look.kicker} onChange={(e) => setLook({ kicker: e.target.value })} />
          <Input label="Título" value={look.title} onChange={(e) => setLook({ title: e.target.value })} />
          <Input label="Título (itálico)" value={look.titleEmphasis} onChange={(e) => setLook({ titleEmphasis: e.target.value })} />
          <Input label="Foto (URL)" value={look.imageUrl ?? ""} onChange={(e) => setLook({ imageUrl: e.target.value || null })} wrapClassName="md:col-span-2" />
          <Input label="Botão" value={look.cta} onChange={(e) => setLook({ cta: e.target.value })} />
          <Textarea label="Texto abaixo da lista" value={look.note} onChange={(e) => setLook({ note: e.target.value })} wrapClassName="md:col-span-3" />
        </div>
        <div className="mt-4 space-y-4">
          {look.items.map((it, i) => (
            <div key={i} className="grid gap-3 border-t border-linha pt-4 md:grid-cols-[2fr_100px_100px] md:items-end">
              <ProductColorPicker label={`Peça ${i + 1}`} products={products} value={it} onChange={(v) => setLook({ items: look.items.map((x, j) => (j === i ? { ...x, ...v } : x)) })} />
              <Input label="Ponto + (x %)" type="number" min={0} max={100} value={it.hotspot.x} onChange={(e) => setLook({ items: look.items.map((x, j) => (j === i ? { ...x, hotspot: { ...x.hotspot, x: Number(e.target.value) } } : x)) })} />
              <Input label="Ponto + (y %)" type="number" min={0} max={100} value={it.hotspot.y} onChange={(e) => setLook({ items: look.items.map((x, j) => (j === i ? { ...x, hotspot: { ...x.hotspot, y: Number(e.target.value) } } : x)) })} />
            </div>
          ))}
        </div>
      </Card>

      <p className="mt-4 text-[14px] text-texto-2">
        Coleções e categorias agora têm telas próprias: <Link href="/admin/colecoes" className="underline">Coleções</Link> · <Link href="/admin/categorias" className="underline">Categorias</Link>.
      </p>
    </>
  );
}
