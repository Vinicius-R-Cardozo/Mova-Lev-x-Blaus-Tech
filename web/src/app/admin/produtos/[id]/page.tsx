"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  BADGES,
  BADGE_LABEL,
  IMAGE_KINDS,
  IMAGE_KIND_LABEL,
  MODELS,
  MODEL_LABEL,
  PICTOGRAMS,
  SENSATIONS,
  SENSATION_LABEL,
  SIZES,
  adminProductSchema,
  slugify,
  type AdminProductInput,
} from "@movalev/shared";
import { getSupabase, useAuth } from "@/lib/auth";
import { Card, Check, Input, MoneyInput, Notice, PageTitle, Select, Textarea, issuesToErrors } from "@/components/admin/ui";
import { ArrowLeftIcon } from "@/components/ui/icons";

type Meta = {
  colors: { id: string; name: string; hex: string; slug: string }[];
  categories: { id: string; name: string }[];
  collections: { id: string; name: string }[];
  products: { id: string; name: string }[];
};
type Variant = { id: string; colorId: string; size: (typeof SIZES)[number]; sku: string; stock: number; priceCents: number | null };
type Image = { id: string; colorId: string | null; kind: (typeof IMAGE_KINDS)[number]; alt: string; url: string | null; sortOrder: number; storagePath: string | null };
type Product = AdminProductInput & { id: string; slug: string; variants: Variant[]; images: Image[] };

const EMPTY: AdminProductInput = {
  name: "",
  slug: "",
  nameEmphasis: "",
  description: "",
  fabricCare: "",
  priceCents: 0,
  badge: null,
  sensation: "NUVEM",
  model: null,
  pictogram: "LEGGING",
  status: "DRAFT",
  relevance: 50,
  collectionId: null,
  categoryIds: [],
  colors: [],
  completeLookIds: [],
  youMayLikeIds: [],
};

export default function ProductEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "novo";
  const router = useRouter();
  const { apiFetch } = useAuth();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<AdminProductInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ kind: "ok" | "erro"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [idemKey] = useState(() => crypto.randomUUID());

  const load = useCallback(async () => {
    const m = await apiFetch<Meta>("/admin/meta");
    setMeta(m);
    if (!isNew) {
      const p = await apiFetch<Product & { colors: { colorId: string; featured: boolean }[] }>(`/admin/products/${id}`);
      setProduct(p);
      setForm({
        name: p.name,
        slug: p.slug,
        nameEmphasis: p.nameEmphasis ?? "",
        description: p.description,
        fabricCare: p.fabricCare,
        priceCents: p.priceCents,
        badge: p.badge,
        sensation: p.sensation,
        model: p.model,
        pictogram: p.pictogram,
        status: p.status,
        relevance: p.relevance,
        collectionId: p.collectionId,
        categoryIds: p.categoryIds,
        colors: p.colors.map((c) => ({ colorId: c.colorId, featured: c.featured })),
        completeLookIds: p.completeLookIds,
        youMayLikeIds: p.youMayLikeIds,
      });
    }
  }, [apiFetch, id, isNew]);
  useEffect(() => void load().catch(() => setNotice({ kind: "erro", text: "Não foi possível carregar." })), [load]);

  const set = <K extends keyof AdminProductInput>(k: K, v: AdminProductInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const toggleIn = (k: "categoryIds" | "completeLookIds" | "youMayLikeIds", v: string) =>
    setForm((f) => ({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] }));

  async function save(e: FormEvent) {
    e.preventDefault();
    const parsed = adminProductSchema.safeParse({ ...form, slug: form.slug || undefined, nameEmphasis: form.nameEmphasis || null });
    if (!parsed.success) {
      setErrors(issuesToErrors(parsed.error.issues));
      setNotice({ kind: "erro", text: "Confira os campos destacados." });
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      if (isNew) {
        const created = await apiFetch<{ id: string }>("/admin/products", { method: "POST", body: JSON.stringify(parsed.data), idempotencyKey: idemKey });
        router.replace(`/admin/produtos/${created.id}`);
      } else {
        await apiFetch(`/admin/products/${id}`, { method: "PUT", body: JSON.stringify(parsed.data) });
        setNotice({ kind: "ok", text: "Produto salvo." });
        await load();
      }
    } catch (err) {
      setNotice({ kind: "erro", text: err instanceof Error ? err.message : "Erro ao salvar." });
    } finally {
      setSaving(false);
    }
  }

  if (!meta || (!isNew && !product)) return <p role="status">Carregando…</p>;
  const others = meta.products.filter((p) => p.id !== id);

  return (
    <>
      <Link href="/admin/produtos" className="mb-3 inline-flex min-h-touch items-center gap-2 text-[14px]"><ArrowLeftIcon /> Produtos</Link>
      <PageTitle actions={!isNew && product ? <Link href={`/produto/${product.slug}`} target="_blank" className="text-[14px] underline">Ver na loja ↗</Link> : undefined}>
        {isNew ? "Novo produto" : form.name}
      </PageTitle>
      {notice && <div className="mb-4"><Notice kind={notice.kind}>{notice.text}</Notice></div>}

      <form onSubmit={save} noValidate className="space-y-4">
        <Card title="Dados">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Nome" value={form.name} error={errors.name} onChange={(e) => set("name", e.target.value)} />
            <Input label="Endereço (slug)" value={form.slug ?? ""} placeholder={slugify(form.name)} error={errors.slug} hint="Deixe em branco para gerar pelo nome." onChange={(e) => set("slug", e.target.value)} />
            <Input label="2ª linha em itálico na página" value={form.nameEmphasis ?? ""} hint="Ex.: “Cintura Alta”" onChange={(e) => set("nameEmphasis", e.target.value)} />
            <MoneyInput label="Preço (R$)" cents={form.priceCents} error={errors.priceCents} onChange={(c) => set("priceCents", c ?? 0)} />
            <Textarea label="Detalhes" value={form.description} error={errors.description} onChange={(e) => set("description", e.target.value)} wrapClassName="md:col-span-2" />
            <Textarea label="Tecido e cuidados" value={form.fabricCare} error={errors.fabricCare} onChange={(e) => set("fabricCare", e.target.value)} wrapClassName="md:col-span-2" />
          </div>
        </Card>

        <Card title="Classificação">
          <div className="grid gap-4 md:grid-cols-3">
            <Select label="Status" value={form.status} onChange={(e) => set("status", e.target.value as AdminProductInput["status"])}>
              <option value="ACTIVE">Ativo (na loja)</option>
              <option value="DRAFT">Rascunho</option>
              <option value="ARCHIVED">Arquivado</option>
            </Select>
            <Select label="Selo" value={form.badge ?? ""} onChange={(e) => set("badge", (e.target.value || null) as AdminProductInput["badge"])}>
              <option value="">Sem selo</option>
              {BADGES.map((b) => <option key={b} value={b}>{BADGE_LABEL[b]}</option>)}
            </Select>
            <Select label="Coleção" value={form.collectionId ?? ""} onChange={(e) => set("collectionId", e.target.value || null)}>
              <option value="">Sem coleção</option>
              {meta.collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select label="Sensação" value={form.sensation} onChange={(e) => set("sensation", e.target.value as AdminProductInput["sensation"])}>
              {SENSATIONS.map((s) => <option key={s} value={s}>{SENSATION_LABEL[s]}</option>)}
            </Select>
            <Select label="Modelo" value={form.model ?? ""} onChange={(e) => set("model", (e.target.value || null) as AdminProductInput["model"])}>
              <option value="">—</option>
              {MODELS.map((m) => <option key={m} value={m}>{MODEL_LABEL[m]}</option>)}
            </Select>
            <Select label="Desenho do placeholder" value={form.pictogram} onChange={(e) => set("pictogram", e.target.value as AdminProductInput["pictogram"])}>
              {PICTOGRAMS.map((p) => <option key={p} value={p}>{p.toLowerCase()}</option>)}
            </Select>
            <Input label="Relevância (0–1000)" type="number" min={0} max={1000} value={form.relevance} onChange={(e) => set("relevance", Number(e.target.value))} />
          </div>
          <fieldset className="mt-5">
            <legend className="mb-1 text-[13px] text-texto-2">Categorias</legend>
            <div className="flex flex-wrap gap-x-5">
              {meta.categories.map((c) => <Check key={c.id} label={c.name} checked={form.categoryIds.includes(c.id)} onChange={() => toggleIn("categoryIds", c.id)} />)}
            </div>
          </fieldset>
          <fieldset className="mt-4">
            <legend className="mb-1 text-[13px] text-texto-2">Cores à venda {errors.colors && <span className="text-erro">· {errors.colors}</span>}</legend>
            <div className="grid gap-1 sm:grid-cols-2">
              {meta.colors.map((c) => {
                const sel = form.colors.find((x) => x.colorId === c.id);
                return (
                  <div key={c.id} className="flex items-center gap-4">
                    <Check
                      label={<><span className="h-4 w-4 rounded-full border border-linha-forte" style={{ background: c.hex }} />{c.name}</>}
                      checked={!!sel}
                      onChange={(v) => set("colors", v ? [...form.colors, { colorId: c.id, featured: form.colors.length < 2 }] : form.colors.filter((x) => x.colorId !== c.id))}
                    />
                    {sel && (
                      <Check
                        className="text-texto-2"
                        label="card próprio na categoria"
                        checked={sel.featured}
                        onChange={(v) => set("colors", form.colors.map((x) => (x.colorId === c.id ? { ...x, featured: v } : x)))}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </fieldset>
        </Card>

        <Card title="Sugestões">
          <div className="grid gap-6 md:grid-cols-2">
            <fieldset>
              <legend className="mb-1 text-[13px] text-texto-2">Complete o look (até 6, na ordem marcada)</legend>
              {others.map((p) => <Check key={p.id} label={p.name} checked={form.completeLookIds.includes(p.id)} onChange={() => toggleIn("completeLookIds", p.id)} />)}
            </fieldset>
            <fieldset>
              <legend className="mb-1 text-[13px] text-texto-2">Você também vai gostar (opcional — sem marcar, usa a categoria)</legend>
              {others.map((p) => <Check key={p.id} label={p.name} checked={form.youMayLikeIds.includes(p.id)} onChange={() => toggleIn("youMayLikeIds", p.id)} />)}
            </fieldset>
          </div>
        </Card>

        <div className="sticky bottom-0 z-10 -mx-4 flex gap-3 border-t border-linha bg-offwhite/95 px-4 py-3 backdrop-blur md:-mx-10 md:px-10">
          <button type="submit" disabled={saving} className="btn-primary h-12">{saving ? "Salvando…" : isNew ? "Criar produto" : "Salvar produto"}</button>
          {isNew && <p className="self-center text-[13px] text-texto-2">Variantes e fotos aparecem depois de criar.</p>}
        </div>
      </form>

      {!isNew && product && (
        <>
          <VariantsEditor productId={product.id} meta={meta} colorIds={form.colors.map((c) => c.colorId)} initial={product.variants} code={product.slug} onSaved={load} />
          <ImagesEditor productId={product.id} meta={meta} colorIds={form.colors.map((c) => c.colorId)} images={product.images} productName={product.name} onChange={load} />
        </>
      )}
    </>
  );
}

function VariantsEditor({ productId, meta, colorIds, initial, code, onSaved }: { productId: string; meta: Meta; colorIds: string[]; initial: Variant[]; code: string; onSaved: () => Promise<void> }) {
  const { apiFetch } = useAuth();
  const prefix = useMemo(() => "ML-" + code.split("-").map((w) => w[0]?.toUpperCase() ?? "").join("").slice(0, 4), [code]);
  const build = useCallback(
    () =>
      colorIds.flatMap((colorId) =>
        SIZES.map((size) => {
          const v = initial.find((x) => x.colorId === colorId && x.size === size);
          const color = meta.colors.find((c) => c.id === colorId)!;
          return v ?? { id: "", colorId, size, sku: `${prefix}-${color.slug.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3)}-${size}`, stock: 0, priceCents: null };
        }),
      ),
    [colorIds, initial, meta.colors, prefix],
  );
  const [rows, setRows] = useState<Variant[]>(build);
  const [notice, setNotice] = useState<{ kind: "ok" | "erro"; text: string } | null>(null);
  useEffect(() => setRows(build()), [build]);
  const upd = (i: number, patch: Partial<Variant>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  async function save() {
    try {
      await apiFetch(`/admin/products/${productId}/variants`, { method: "PUT", body: JSON.stringify({ variants: rows.map(({ colorId, size, sku, stock, priceCents }) => ({ colorId, size, sku: sku.toUpperCase(), stock, priceCents })) }) });
      setNotice({ kind: "ok", text: "Estoque e SKUs salvos." });
      await onSaved();
    } catch (err) {
      setNotice({ kind: "erro", text: err instanceof Error ? err.message : "Erro ao salvar." });
    }
  }

  return (
    <Card title="Variantes, estoque e preço" className="mt-4" actions={<button type="button" onClick={() => void save()} className="btn-dark h-11 px-6">Salvar variantes</button>}>
      {notice && <div className="mb-3"><Notice kind={notice.kind}>{notice.text}</Notice></div>}
      <p className="mb-3 text-[13px] text-texto-2">Estoque 0 aparece riscado na loja. Preço em branco = preço do produto. Salve o produto antes se mudou as cores.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-[14px]">
          <thead className="text-left text-[12px] uppercase tracking-[0.08em] text-texto-2"><tr><th className="py-2 font-normal">Cor</th><th className="font-normal">Tam.</th><th className="font-normal">SKU</th><th className="font-normal">Estoque</th><th className="font-normal">Preço próprio (R$)</th></tr></thead>
          <tbody>
            {rows.map((v, i) => {
              const color = meta.colors.find((c) => c.id === v.colorId);
              return (
                <tr key={`${v.colorId}-${v.size}`} className="border-t border-linha">
                  <td className="py-1.5 pr-3">{color?.name}</td>
                  <td className="pr-3">{v.size}</td>
                  <td className="pr-3"><input aria-label={`SKU ${color?.name} ${v.size}`} value={v.sku} onChange={(e) => upd(i, { sku: e.target.value.toUpperCase() })} className="h-9 w-44 border border-linha-forte px-2" /></td>
                  <td className="pr-3"><input aria-label={`Estoque ${color?.name} ${v.size}`} type="number" min={0} value={v.stock} onChange={(e) => upd(i, { stock: Math.max(0, Number(e.target.value)) })} className={`h-9 w-24 border px-2 ${v.stock === 0 ? "border-erro/50 text-erro" : "border-linha-forte"}`} /></td>
                  <td><input aria-label={`Preço ${color?.name} ${v.size}`} inputMode="decimal" placeholder="—" defaultValue={v.priceCents == null ? "" : (v.priceCents / 100).toFixed(2).replace(".", ",")} onChange={(e) => { const raw = e.target.value.replace(",", "."); upd(i, { priceCents: raw ? Math.round(Number(raw) * 100) : null }); }} className="h-9 w-28 border border-linha-forte px-2" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ImagesEditor({ productId, meta, colorIds, images, productName, onChange }: { productId: string; meta: Meta; colorIds: string[]; images: Image[]; productName: string; onChange: () => Promise<void> }) {
  const { apiFetch } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "erro"; text: string } | null>(null);

  async function upload(colorId: string, kind: Image["kind"], file: File) {
    setBusy(`${colorId}-${kind}`);
    setNotice(null);
    try {
      const signed = await apiFetch<{ bucket: string; path: string; token: string }>("/admin/uploads/sign", {
        method: "POST",
        body: JSON.stringify({ productId, fileName: file.name, contentType: file.type, size: file.size }),
      });
      const supabase = await getSupabase();
      const { error } = await supabase!.storage.from(signed.bucket).uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
      if (error) throw new Error("Falha no envio do arquivo.");
      const color = meta.colors.find((c) => c.id === colorId)!;
      await apiFetch(`/admin/products/${productId}/images`, {
        method: "POST",
        body: JSON.stringify({ storagePath: signed.path, colorId, kind, alt: `${productName} na cor ${color.name} — ${IMAGE_KIND_LABEL[kind].toLowerCase()}` }),
      });
      setNotice({ kind: "ok", text: "Foto enviada." });
      await onChange();
    } catch (err) {
      setNotice({ kind: "erro", text: err instanceof Error ? err.message : "Erro no envio." });
    } finally {
      setBusy(null);
    }
  }

  async function move(list: Image[], index: number, dir: -1 | 1) {
    const next = [...list];
    const [it] = next.splice(index, 1);
    next.splice(index + dir, 0, it!);
    await apiFetch(`/admin/products/${productId}/images/order`, { method: "PUT", body: JSON.stringify({ ids: next.map((i) => i.id) }) });
    await onChange();
  }

  async function remove(img: Image) {
    if (!window.confirm("Excluir esta foto?")) return;
    await apiFetch(`/admin/images/${img.id}`, { method: "DELETE" });
    await onChange();
  }

  return (
    <Card title="Fotos e vídeo" className="mt-4">
      {notice && <div className="mb-3"><Notice kind={notice.kind}>{notice.text}</Notice></div>}
      <p className="mb-4 text-[13px] text-texto-2">JPG, PNG, WebP ou AVIF até 10 MB (vídeo MP4/WebM). A foto substitui o placeholder do mesmo tipo. A ordem define a galeria.</p>
      {colorIds.map((colorId) => {
        const color = meta.colors.find((c) => c.id === colorId)!;
        const list = images.filter((i) => i.colorId === colorId).sort((a, b) => a.sortOrder - b.sortOrder);
        return (
          <div key={colorId} className="mb-6">
            <h3 className="mb-2 flex items-center gap-2 text-[15px] font-normal"><span className="h-4 w-4 rounded-full border border-linha-forte" style={{ background: color.hex }} />{color.name}</h3>
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {list.map((img, i) => (
                <li key={img.id} className="border border-linha p-2">
                  <div className="flex aspect-[3/4] items-center justify-center bg-bege text-center text-[11px] text-texto-2" style={img.url ? { backgroundImage: `url(${img.url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
                    {!img.url && "placeholder"}
                  </div>
                  <p className="mt-1.5 text-[12px]">{IMAGE_KIND_LABEL[img.kind]}</p>
                  <div className="mt-1 flex gap-2 text-[12px]">
                    <button type="button" disabled={i === 0} onClick={() => void move(list, i, -1)} className="min-h-[32px] px-1 underline disabled:opacity-30" aria-label="Mover para antes">←</button>
                    <button type="button" disabled={i === list.length - 1} onClick={() => void move(list, i, 1)} className="min-h-[32px] px-1 underline disabled:opacity-30" aria-label="Mover para depois">→</button>
                    {img.url && <button type="button" onClick={() => void remove(img)} className="ml-auto min-h-[32px] text-erro underline">Excluir</button>}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              {IMAGE_KINDS.map((kind) => (
                <label key={kind} className="btn-secondary h-10 cursor-pointer px-4 text-[11px]">
                  {busy === `${colorId}-${kind}` ? "Enviando…" : `+ ${IMAGE_KIND_LABEL[kind]}`}
                  <input
                    type="file"
                    accept={kind === "VIDEO" ? "video/mp4,video/webm" : "image/jpeg,image/png,image/webp,image/avif"}
                    className="sr-only"
                    disabled={!!busy}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) void upload(colorId, kind, f);
                    }}
                  />
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </Card>
  );
}
