"use client";
import { useCallback, useEffect, useState } from "react";
import { adminCollectionSchema, homeContentSchema, slugify, type HomeContent } from "@movalev/shared";
import { useAuth } from "@/lib/auth";
import { Card, Input, Notice, PageTitle, Select, Textarea } from "@/components/admin/ui";

type MetaProduct = { id: string; name: string; slug: string; colors: { color: { slug: string; name: string } }[] };
type Collection = { id: string; slug: string; name: string; season: string | null; description: string | null; _count: { products: number } };

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
  const [collections, setCollections] = useState<Collection[]>([]);
  const [col, setCol] = useState<{ id?: string; slug: string; name: string; season: string; description: string } | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "erro"; text: string } | null>(null);

  const loadCollections = useCallback(() => apiFetch<Collection[]>("/admin/collections").then(setCollections), [apiFetch]);
  useEffect(() => {
    apiFetch<HomeContent>("/admin/settings/home").then(setHome);
    apiFetch<{ products: MetaProduct[] }>("/admin/meta").then((m) => setProducts(m.products));
    void loadCollections();
  }, [apiFetch, loadCollections]);

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

  async function saveCollection() {
    if (!col) return;
    const parsed = adminCollectionSchema.safeParse({ ...col, slug: col.slug || slugify(col.name), season: col.season || null, description: col.description || null });
    if (!parsed.success) return setNotice({ kind: "erro", text: parsed.error.issues[0]?.message ?? "Coleção inválida." });
    try {
      if (col.id) await apiFetch(`/admin/collections/${col.id}`, { method: "PUT", body: JSON.stringify(parsed.data) });
      else await apiFetch("/admin/collections", { method: "POST", body: JSON.stringify(parsed.data), idempotencyKey: crypto.randomUUID() });
      setCol(null);
      setNotice({ kind: "ok", text: "Coleção salva." });
      await loadCollections();
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

      <Card title="Coleções" className="mt-4" actions={!col && <button type="button" onClick={() => setCol({ slug: "", name: "", season: "", description: "" })} className="btn-secondary h-10 px-4">Nova coleção</button>}>
        {col ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Nome" value={col.name} onChange={(e) => setCol({ ...col, name: e.target.value })} />
            <Input label="Slug" value={col.slug} placeholder={slugify(col.name)} onChange={(e) => setCol({ ...col, slug: e.target.value })} />
            <Input label="Estação" value={col.season} onChange={(e) => setCol({ ...col, season: e.target.value })} />
            <Input label="Descrição" value={col.description} onChange={(e) => setCol({ ...col, description: e.target.value })} />
            <div className="flex gap-3 md:col-span-2">
              <button type="button" onClick={() => void saveCollection()} className="btn-primary h-11 px-6">Salvar coleção</button>
              <button type="button" onClick={() => setCol(null)} className="btn-secondary h-11 px-6">Cancelar</button>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-linha">
            {collections.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2 text-[14px]">
                <span>{c.name} <span className="text-texto-2">· {c.season ?? "—"} · {c._count.products} peças</span></span>
                <button type="button" onClick={() => setCol({ id: c.id, slug: c.slug, name: c.name, season: c.season ?? "", description: c.description ?? "" })} className="min-h-touch underline">Editar</button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
