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
  PRODUCT_STATUSES,
  PRODUCT_STATUS_HINT,
  PRODUCT_STATUS_LABEL,
  SENSATIONS,
  SENSATION_LABEL,
  SIZES,
  adminProductSchema,
  formatBRL,
  slugify,
  type AdminProductInput,
} from "@movalev/shared";
import { getSupabase, useAuth } from "@/lib/auth";
import { Card, Check, Input, MoneyInput, PageTitle, Select, Textarea, issuesToErrors } from "@/components/admin/ui";
import { errorText, useFeedback } from "@/components/admin/feedback";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { compressImage, formatBytes } from "@/lib/imageCompress";
import { cn } from "@/lib/cn";

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
  promoPriceCents: null,
  seoTitle: "",
  seoDescription: "",
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
  const { toast, confirm } = useFeedback();
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [idemKey] = useState(() => crypto.randomUUID());

  // Avisa ao sair com alterações não salvas.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

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
        promoPriceCents: p.promoPriceCents ?? null,
        seoTitle: p.seoTitle ?? "",
        seoDescription: p.seoDescription ?? "",
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
  useEffect(() => void load().catch(() => toast("Não foi possível carregar o produto.", "erro")), [load, toast]);

  const set = <K extends keyof AdminProductInput>(k: K, v: AdminProductInput[K]) => {
    setDirty(true);
    setForm((f) => ({ ...f, [k]: v }));
  };
  const toggleIn = (k: "categoryIds" | "completeLookIds" | "youMayLikeIds", v: string) => {
    setDirty(true);
    setForm((f) => ({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] }));
  };

  async function lifecycle(action: "duplicate" | "archive" | "restore") {
    if (action === "archive" && !(await confirm({ title: "Arquivar produto?", text: "Ele sai da loja. Você pode restaurar depois na lista de arquivados.", confirm: "Arquivar" }))) return;
    try {
      if (action === "duplicate") {
        const copy = await apiFetch<{ id: string }>(`/admin/products/${id}/duplicate`, { method: "POST" });
        toast("Cópia criada como rascunho (estoque zerado).");
        router.push(`/admin/produtos/${copy.id}`);
        return;
      }
      await apiFetch(`/admin/products/${id}/${action}`, { method: "POST" });
      toast(action === "archive" ? "Produto arquivado." : "Produto restaurado como rascunho.");
      await load();
    } catch (err) {
      toast(errorText(err), "erro");
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const parsed = adminProductSchema.safeParse({ ...form, slug: form.slug || undefined, nameEmphasis: form.nameEmphasis || null, seoTitle: form.seoTitle || null, seoDescription: form.seoDescription || null });
    if (!parsed.success) {
      setErrors(issuesToErrors(parsed.error.issues));
      toast("Confira os campos destacados.", "erro");
      return;
    }
    if (!isNew && product && parsed.data.slug && parsed.data.slug !== product.slug) {
      const ok = await confirm({ title: "Mudar o endereço?", text: `Links antigos (/produto/${product.slug}) deixam de funcionar. Atualize divulgações e anúncios.`, confirm: "Mudar endereço" });
      if (!ok) return;
    }
    setErrors({});
    setSaving(true);
    try {
      if (isNew) {
        const created = await apiFetch<{ id: string }>("/admin/products", { method: "POST", body: JSON.stringify(parsed.data), idempotencyKey: idemKey });
        setDirty(false);
        toast("Produto criado. Agora cadastre variantes e fotos.");
        router.replace(`/admin/produtos/${created.id}`);
      } else {
        await apiFetch(`/admin/products/${id}`, { method: "PUT", body: JSON.stringify(parsed.data) });
        setDirty(false);
        toast("Produto salvo. A loja já mostra a alteração.");
        await load();
      }
    } catch (err) {
      toast(errorText(err), "erro");
    } finally {
      setSaving(false);
    }
  }

  if (!meta || (!isNew && !product))
    return (
      <div role="status" aria-label="Carregando" className="space-y-4">
        <div className="skeleton h-12 w-80" />
        <div className="skeleton h-72" />
      </div>
    );
  const discount = form.promoPriceCents && form.priceCents > form.promoPriceCents ? Math.round((1 - form.promoPriceCents / form.priceCents) * 100) : null;
  const seoTitle = form.seoTitle || `${form.name || "Nome do produto"} · MOVA LEV`;
  const seoDesc = form.seoDescription || form.description.slice(0, 155) || "Descrição do produto";
  const others = meta.products.filter((p) => p.id !== id);

  return (
    <>
      <Link href="/admin/produtos" className="mb-3 inline-flex min-h-touch items-center gap-2 text-[14px]"><ArrowLeftIcon /> Produtos</Link>
      <PageTitle
        actions={
          !isNew && product ? (
            <div className="flex flex-wrap items-center gap-4 text-[14px]">
              <Link href={`/produto/${product.slug}`} target="_blank" className="underline">
                Ver na loja ↗
              </Link>
              <button type="button" className="underline hover:text-oliva" onClick={() => void lifecycle("duplicate")}>
                Duplicar
              </button>
              {product.status === "ARCHIVED" ? (
                <button type="button" className="underline hover:text-oliva" onClick={() => void lifecycle("restore")}>
                  Restaurar
                </button>
              ) : (
                <button type="button" className="text-texto-2 underline hover:text-erro" onClick={() => void lifecycle("archive")}>
                  Arquivar
                </button>
              )}
            </div>
          ) : undefined
        }
      >
        {isNew ? "Novo produto" : form.name}
      </PageTitle>

      <form onSubmit={save} noValidate className="space-y-4">
        <Card title="Dados">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Nome" value={form.name} error={errors.name} onChange={(e) => set("name", e.target.value)} />
            <Input label="Endereço (slug)" value={form.slug ?? ""} placeholder={slugify(form.name)} error={errors.slug} hint="Deixe em branco para gerar pelo nome." onChange={(e) => set("slug", e.target.value)} />
            <Input label="2ª linha em itálico na página" value={form.nameEmphasis ?? ""} hint="Ex.: “Cintura Alta”" onChange={(e) => set("nameEmphasis", e.target.value)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <MoneyInput label="Preço (R$)" cents={form.priceCents} error={errors.priceCents} onChange={(c) => set("priceCents", c ?? 0)} />
              <div>
                <MoneyInput label="Preço promocional (R$)" nullable cents={form.promoPriceCents} error={errors.promoPriceCents} onChange={(c) => set("promoPriceCents", c)} />
                <p className="mt-1 text-[12px] text-texto-2">
                  {discount ? `${discount}% off · a loja mostra ${formatBRL(form.priceCents, { compact: true })} riscado` : "Vazio = sem promoção"}
                </p>
              </div>
            </div>
            <Textarea label="Detalhes" value={form.description} error={errors.description} onChange={(e) => set("description", e.target.value)} wrapClassName="md:col-span-2" />
            <Textarea label="Tecido e cuidados" value={form.fabricCare} error={errors.fabricCare} onChange={(e) => set("fabricCare", e.target.value)} wrapClassName="md:col-span-2" />
          </div>
        </Card>

        <Card title="Classificação">
          <div className="grid gap-4 md:grid-cols-3">
            <Select label="Status" value={form.status} hint={PRODUCT_STATUS_HINT[form.status]} onChange={(e) => set("status", e.target.value as AdminProductInput["status"])}>
              {PRODUCT_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {PRODUCT_STATUS_LABEL[st]}
                </option>
              ))}
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

        <Card title="SEO (Google e redes sociais)">
          <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,420px)]">
            <div className="space-y-4">
              <Input label={`Título (${(form.seoTitle ?? "").length}/70)`} value={form.seoTitle ?? ""} placeholder={`${form.name || "Nome"} · MOVA LEV`} error={errors.seoTitle} hint="Vazio = nome do produto." onChange={(e) => set("seoTitle", e.target.value)} />
              <Textarea label={`Descrição (${(form.seoDescription ?? "").length}/160)`} value={form.seoDescription ?? ""} placeholder="Resumo que aparece no Google" error={errors.seoDescription} hint="Vazio = início dos detalhes." onChange={(e) => set("seoDescription", e.target.value)} />
            </div>
            <div aria-label="Prévia no Google" className="self-start border border-linha bg-white p-4">
              <p className="label-sm mb-2 text-texto-2">Prévia</p>
              <p className="truncate text-[13px] text-[#4d5156]">movalev.com.br › produto › {form.slug || slugify(form.name) || "endereco"}</p>
              <p className="mt-1 line-clamp-1 text-[18px] text-[#1a0dab]">{seoTitle}</p>
              <p className="mt-1 line-clamp-2 text-[13px] text-[#4d5156]">{seoDesc}</p>
            </div>
          </div>
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
          {!isNew && dirty && <p className="self-center text-[13px] text-[#8a5a12]">Alterações não salvas</p>}
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
  const { toast } = useFeedback();
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
  const [saving, setSaving] = useState(false);
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  useEffect(() => setRows(build()), [build]);
  const upd = (i: number, patch: Partial<Variant>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  async function save() {
    // Validação no navegador (a API valida de novo): SKU único e no formato, estoque inteiro ≥ 0.
    const errs: Record<number, string> = {};
    const seen = new Map<string, number>();
    rows.forEach((v, i) => {
      if (!/^[A-Z0-9-]{3,40}$/.test(v.sku)) errs[i] = "SKU: 3–40 letras maiúsculas, números ou hífen";
      else if (seen.has(v.sku)) errs[i] = errs[seen.get(v.sku)!] = "SKU repetido";
      seen.set(v.sku, i);
      if (!Number.isInteger(v.stock) || v.stock < 0) errs[i] = "Estoque deve ser inteiro, 0 ou mais";
      if (v.priceCents !== null && (!Number.isInteger(v.priceCents) || v.priceCents <= 0)) errs[i] = "Preço inválido";
    });
    setRowErrors(errs);
    if (Object.keys(errs).length) return toast("Confira as variantes destacadas.", "erro");
    setSaving(true);
    try {
      await apiFetch(`/admin/products/${productId}/variants`, { method: "PUT", body: JSON.stringify({ variants: rows.map(({ colorId, size, sku, stock, priceCents }) => ({ colorId, size, sku: sku.toUpperCase(), stock, priceCents })) }) });
      toast("Variantes, estoque e preços salvos.");
      await onSaved();
    } catch (err) {
      toast(errorText(err), "erro");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card
      title="Variantes, estoque e preço"
      className="mt-4"
      actions={
        <button type="button" onClick={() => void save()} disabled={saving} className="btn-dark h-11 px-6">
          {saving ? "Salvando…" : "Salvar variantes"}
        </button>
      }
    >
      <p className="mb-3 text-[13px] text-texto-2">Estoque 0 aparece riscado na loja. Preço próprio vazio = preço do produto. Mudou as cores? Salve o produto antes.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-[14px]">
          <thead className="text-left text-[12px] uppercase tracking-[0.08em] text-texto-2">
            <tr>
              <th className="py-2 font-normal">Cor</th>
              <th className="font-normal">Tam.</th>
              <th className="font-normal">SKU</th>
              <th className="font-normal">Estoque</th>
              <th className="font-normal">Preço próprio (R$)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v, i) => {
              const color = meta.colors.find((c) => c.id === v.colorId);
              return (
                <tr key={`${v.colorId}-${v.size}`} className={cn("border-t border-linha", rowErrors[i] && "bg-erro/5")}>
                  <td className="py-1.5 pr-3">{color?.name}</td>
                  <td className="pr-3">{v.size}</td>
                  <td className="pr-3">
                    <input aria-label={`SKU ${color?.name} ${v.size}`} aria-invalid={!!rowErrors[i]} value={v.sku} onChange={(e) => upd(i, { sku: e.target.value.toUpperCase().replace(/\s/g, "") })} className="h-9 w-44 border border-linha-forte px-2" />
                    {rowErrors[i] && <span className="block text-[11px] text-erro">{rowErrors[i]}</span>}
                  </td>
                  <td className="pr-3">
                    <input
                      aria-label={`Estoque ${color?.name} ${v.size}`}
                      type="number"
                      min={0}
                      step={1}
                      value={v.stock}
                      onChange={(e) => upd(i, { stock: Math.max(0, Math.trunc(Number(e.target.value) || 0)) })}
                      className={`h-9 w-24 border px-2 ${v.stock === 0 ? "border-erro/50 text-erro" : "border-linha-forte"}`}
                    />
                  </td>
                  <td>
                    <input
                      aria-label={`Preço ${color?.name} ${v.size}`}
                      inputMode="decimal"
                      placeholder="—"
                      defaultValue={v.priceCents == null ? "" : (v.priceCents / 100).toFixed(2).replace(".", ",")}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\./g, "").replace(",", ".");
                        upd(i, { priceCents: raw ? Math.round(Number(raw) * 100) : null });
                      }}
                      className="h-9 w-28 border border-linha-forte px-2"
                    />
                  </td>
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
  const { toast, confirm } = useFeedback();
  const [busy, setBusy] = useState<string | null>(null);
  const [drag, setDrag] = useState<string | null>(null);

  async function upload(colorId: string, kind: Image["kind"], original: File) {
    setBusy(`${colorId}-${kind}`);
    try {
      // Fotos: redimensiona e comprime antes de subir (vídeo vai como está).
      const { file, before, after } = kind === "VIDEO" ? { file: original, before: original.size, after: original.size } : await compressImage(original);
      if (file.size > 10 * 1024 * 1024) throw new Error("Arquivo acima de 10 MB mesmo depois de comprimido.");
      const signed = await apiFetch<{ bucket: string; path: string; token: string }>("/admin/uploads/sign", {
        method: "POST",
        body: JSON.stringify({ productId, fileName: file.name, contentType: file.type, size: file.size }),
      });
      const supabase = await getSupabase();
      const { error } = await supabase!.storage.from(signed.bucket).uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
      if (error) throw new Error("Falha no envio do arquivo. Tente de novo.");
      const color = meta.colors.find((c) => c.id === colorId)!;
      await apiFetch(`/admin/products/${productId}/images`, {
        method: "POST",
        body: JSON.stringify({ storagePath: signed.path, colorId, kind, alt: `${productName} na cor ${color.name} — ${IMAGE_KIND_LABEL[kind].toLowerCase()}` }),
      });
      toast(after < before ? `Foto enviada (${formatBytes(before)} → ${formatBytes(after)}).` : "Arquivo enviado.");
      await onChange();
    } catch (err) {
      toast(errorText(err), "erro");
    } finally {
      setBusy(null);
    }
  }

  async function reorder(list: Image[], from: number, to: number) {
    if (from === to || to < 0 || to >= list.length) return;
    const next = [...list];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it!);
    try {
      await apiFetch(`/admin/products/${productId}/images/order`, { method: "PUT", body: JSON.stringify({ ids: next.map((i) => i.id) }) });
      await onChange();
    } catch (err) {
      toast(errorText(err), "erro");
    }
  }

  async function remove(img: Image) {
    const ok = await confirm({ title: "Excluir esta foto?", text: "A foto sai da loja e o arquivo é apagado. Não dá para desfazer.", confirm: "Excluir foto", danger: true });
    if (!ok) return;
    try {
      await apiFetch(`/admin/images/${img.id}`, { method: "DELETE" });
      toast("Foto excluída.");
      await onChange();
    } catch (err) {
      toast(errorText(err), "erro");
    }
  }

  async function saveAlt(img: Image, alt: string) {
    if (alt.trim() === img.alt || alt.trim().length < 3) return;
    try {
      await apiFetch(`/admin/images/${img.id}`, { method: "PATCH", body: JSON.stringify({ alt: alt.trim() }) });
      toast("Descrição da foto salva.");
    } catch (err) {
      toast(errorText(err), "erro");
    }
  }

  return (
    <Card title="Fotos e vídeo" className="mt-4">
      <p className="mb-4 text-[13px] text-texto-2">
        Arraste para reordenar (ou use as setas). A <strong className="font-normal">1ª foto é a principal</strong>: aparece no card e abre a galeria; a 2ª aparece ao passar o mouse. As fotos são reduzidas e comprimidas automaticamente antes do envio.
      </p>
      {colorIds.map((colorId) => {
        const color = meta.colors.find((c) => c.id === colorId)!;
        const list = images.filter((i) => i.colorId === colorId).sort((a, b) => a.sortOrder - b.sortOrder);
        return (
          <div key={colorId} className="mb-7">
            <h3 className="mb-2 flex items-center gap-2 text-[15px] font-normal">
              <span className="h-4 w-4 rounded-full border border-linha-forte" style={{ background: color.hex }} />
              {color.name}
            </h3>
            {list.length === 0 && <p className="mb-3 text-[13px] text-texto-2">Sem fotos nesta cor ainda.</p>}
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {list.map((img, i) => (
                <li
                  key={img.id}
                  draggable
                  onDragStart={() => setDrag(img.id)}
                  onDragEnd={() => setDrag(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = list.findIndex((x) => x.id === drag);
                    if (from >= 0) void reorder(list, from, i);
                    setDrag(null);
                  }}
                  className={cn("relative border bg-white p-2 transition-opacity", drag === img.id ? "opacity-40" : "", i === 0 ? "border-oliva" : "border-linha")}
                >
                  {i === 0 && <span className="label-sm absolute left-3 top-3 z-10 bg-oliva px-1.5 py-0.5 text-[9px] text-offwhite">Principal</span>}
                  <div className="flex aspect-[3/4] cursor-grab items-center justify-center bg-bege bg-cover bg-center text-center text-[11px] text-texto-2" style={img.url ? { backgroundImage: `url(${img.url})` } : undefined}>
                    {!img.url && "placeholder"}
                  </div>
                  <p className="mt-1.5 text-[12px] text-texto-2">{IMAGE_KIND_LABEL[img.kind]}</p>
                  {img.url && (
                    <input aria-label="Descrição da foto (acessibilidade e Google)" defaultValue={img.alt} onBlur={(e) => void saveAlt(img, e.target.value)} className="mt-1 h-8 w-full border border-linha px-2 text-[12px]" />
                  )}
                  <div className="mt-1 flex items-center gap-2 text-[12px]">
                    <button type="button" disabled={i === 0} onClick={() => void reorder(list, i, i - 1)} className="min-h-[32px] px-1 disabled:opacity-30" aria-label="Mover para antes">
                      ←
                    </button>
                    <button type="button" disabled={i === list.length - 1} onClick={() => void reorder(list, i, i + 1)} className="min-h-[32px] px-1 disabled:opacity-30" aria-label="Mover para depois">
                      →
                    </button>
                    {i > 0 && img.url && (
                      <button type="button" onClick={() => void reorder(list, i, 0)} className="min-h-[32px] underline">
                        Principal
                      </button>
                    )}
                    {img.url && (
                      <button type="button" onClick={() => void remove(img)} className="ml-auto min-h-[32px] text-erro underline">
                        Excluir
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              {IMAGE_KINDS.map((kind) => (
                <label key={kind} className={cn("btn-secondary h-10 cursor-pointer px-4 text-[11px]", busy && "pointer-events-none opacity-50")}>
                  {busy === `${colorId}-${kind}` ? "Enviando…" : `+ ${IMAGE_KIND_LABEL[kind]}`}
                  <input
                    type="file"
                    accept={kind === "VIDEO" ? "video/mp4,video/webm" : "image/jpeg,image/png,image/webp,image/avif"}
                    className="sr-only"
                    disabled={!!busy}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) void upload(colorId, kind, file);
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
