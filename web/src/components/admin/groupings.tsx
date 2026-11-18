"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PICTOGRAMS, PRODUCT_STATUS_LABEL, adminCategorySchema, adminCollectionSchema, slugify, type ProductStatus } from "@movalev/shared";
import { Card, Check, Input, PageTitle, Select, Textarea, issuesToErrors } from "@/components/admin/ui";
import { EmptyState, TableSkeleton, errorText, useFeedback } from "@/components/admin/feedback";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { getSupabase, useAuth } from "@/lib/auth";
import { compressImage } from "@/lib/imageCompress";
import { cn } from "@/lib/cn";

export type Kind = "categoria" | "colecao";
const CFG = {
  categoria: { api: "/admin/categories", path: "/admin/categorias", one: "categoria", many: "Categorias", art: "a", cover: "bannerUrl" as const, ordered: true },
  colecao: { api: "/admin/collections", path: "/admin/colecoes", one: "coleção", many: "Coleções", art: "a", cover: "coverUrl" as const, ordered: false },
};

type Row = { id: string; name: string; slug: string; productCount: number; archivedAt: string | null; showInMenu?: boolean; season?: string | null; bannerUrl?: string | null; coverUrl?: string | null; tone?: string };

// ───────────────────────────── Lista ─────────────────────────────

/** Lista com reordenação (arrastar ou setas), arquivar, restaurar e excluir de vez. */
export function GroupingList({ kind }: { kind: Kind }) {
  const c = CFG[kind];
  const { apiFetch } = useAuth();
  const { toast, confirm } = useFeedback();
  const [archived, setArchived] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [drag, setDrag] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await apiFetch<Row[]>(`${c.api}${archived ? "?arquivadas=true" : ""}`));
    } catch (err) {
      toast(errorText(err), "erro");
    }
  }, [apiFetch, c.api, archived, toast]);
  useEffect(() => void load(), [load]);

  async function reorder(from: number, to: number) {
    if (!rows || from === to || to < 0 || to >= rows.length) return;
    const next = [...rows];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it!);
    setRows(next);
    try {
      await apiFetch(`${c.api}/order`, { method: "PUT", body: JSON.stringify({ ids: next.map((r) => r.id) }) });
      toast("Ordem salva. A loja já mostra a nova ordem.");
    } catch (err) {
      toast(errorText(err), "erro");
      await load();
    }
  }

  async function act(r: Row, action: "archive" | "restore" | "delete") {
    if (action === "archive" && !(await confirm({ title: `Arquivar ${c.one}?`, text: `“${r.name}” sai da loja${kind === "categoria" ? " e do menu" : ""}. Os produtos continuam à venda. Dá para restaurar depois.`, confirm: "Arquivar" }))) return;
    if (action === "delete" && !(await confirm({ title: "Excluir de vez?", text: <>“{r.name}” será apagad{c.art}. Os produtos não são apagados, só perdem o vínculo. <strong>Não dá para desfazer.</strong></>, confirm: "Excluir de vez", danger: true }))) return;
    try {
      if (action === "delete") await apiFetch(`${c.api}/${r.id}`, { method: "DELETE" });
      else await apiFetch(`${c.api}/${r.id}/${action}`, { method: "POST" });
      toast(action === "archive" ? "Arquivad" + c.art + "." : action === "restore" ? "Restaurad" + c.art + "." : "Excluíd" + c.art + ".");
      await load();
    } catch (err) {
      toast(errorText(err), "erro");
    }
  }

  return (
    <>
      <PageTitle actions={<Link href={`${c.path}/nova`} className="btn-primary h-12">Nova {c.one}</Link>}>{c.many}</PageTitle>
      <nav aria-label={c.many} className="mb-6 flex gap-6 border-b border-linha">
        {[false, true].map((a) => (
          <button key={String(a)} type="button" aria-pressed={archived === a} onClick={() => setArchived(a)} className={cn("label -mb-px min-h-touch border-b-2", archived === a ? "border-preto" : "border-transparent text-texto-2 hover:text-preto")}>
            {a ? "Arquivadas" : "Ativas"}
          </button>
        ))}
      </nav>
      {!rows ? (
        <TableSkeleton rows={6} cols={4} />
      ) : rows.length === 0 ? (
        <EmptyState title={archived ? "Nada arquivado" : `Nenhuma ${c.one} ainda`} text={archived ? "Itens arquivados aparecem aqui e podem ser restaurados." : undefined} action={!archived && <Link href={`${c.path}/nova`} className="btn-primary h-11">Nova {c.one}</Link>} />
      ) : (
        <>
          {!archived && <p className="mb-3 text-[13px] text-texto-2">Arraste para mudar a ordem{kind === "categoria" ? " do menu e dos atalhos da Home" : ""}.</p>}
          <ul className="border border-linha bg-white">
            {rows.map((r, i) => (
              <li
                key={r.id}
                draggable={!archived}
                onDragStart={() => setDrag(r.id)}
                onDragEnd={() => setDrag(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = rows.findIndex((x) => x.id === drag);
                  if (from >= 0) void reorder(from, i);
                  setDrag(null);
                }}
                className={cn("flex items-center gap-4 border-b border-linha px-4 py-3 last:border-b-0", !archived && "cursor-grab", drag === r.id && "opacity-40")}
              >
                {!archived && (
                  <span className="flex flex-col text-[12px] leading-none text-texto-2">
                    <button type="button" aria-label="Subir" disabled={i === 0} onClick={() => void reorder(i, i - 1)} className="px-1 py-0.5 disabled:opacity-30">
                      ▲
                    </button>
                    <button type="button" aria-label="Descer" disabled={i === rows.length - 1} onClick={() => void reorder(i, i + 1)} className="px-1 py-0.5 disabled:opacity-30">
                      ▼
                    </button>
                  </span>
                )}
                <span className="h-12 w-16 shrink-0 bg-bege bg-cover bg-center" style={{ backgroundColor: r.tone, ...((r[c.cover] ?? null) ? { backgroundImage: `url(${r[c.cover]})` } : {}) }} aria-hidden />
                <div className="min-w-0 flex-1">
                  <Link href={`${c.path}/${r.id}`} className="font-normal hover:underline">
                    {r.name}
                  </Link>
                  <p className="text-[13px] text-texto-2">
                    /{r.slug} · {r.productCount} {r.productCount === 1 ? "produto" : "produtos"}
                    {r.season ? ` · ${r.season}` : ""}
                    {kind === "categoria" && r.showInMenu ? " · no menu" : ""}
                  </p>
                </div>
                <div className="flex gap-3 text-[13px]">
                  {archived ? (
                    <>
                      <button type="button" className="underline hover:text-oliva" onClick={() => void act(r, "restore")}>
                        Restaurar
                      </button>
                      <button type="button" className="text-erro underline" onClick={() => void act(r, "delete")}>
                        Excluir de vez
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href={`${c.path}/${r.id}`} className="underline hover:text-oliva">
                        Editar
                      </Link>
                      <button type="button" className="text-texto-2 underline hover:text-erro" onClick={() => void act(r, "archive")}>
                        Arquivar
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

// ───────────────────────────── Editor ─────────────────────────────

type MetaProduct = { id: string; name: string; status: ProductStatus; collectionId: string | null };
type FormState = {
  name: string;
  slug: string;
  description: string;
  cover: string;
  // categoria
  bannerCaption: string;
  pictogram: (typeof PICTOGRAMS)[number];
  tone: string;
  showInMenu: boolean;
  // coleção
  season: string;
};
const EMPTY: FormState = { name: "", slug: "", description: "", cover: "", bannerCaption: "", pictogram: "LEGGING", tone: "#E6D5C5", showInMenu: false, season: "" };

export function GroupingEditor({ kind, id }: { kind: Kind; id: string }) {
  const c = CFG[kind];
  const isNew = id === "nova";
  const router = useRouter();
  const { apiFetch } = useAuth();
  const { toast } = useFeedback();
  const [form, setForm] = useState<FormState | null>(isNew ? EMPTY : null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [products, setProducts] = useState<MetaProduct[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [savedSelection, setSavedSelection] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [archived, setArchived] = useState(false);

  const load = useCallback(async () => {
    const meta = await apiFetch<{ products: MetaProduct[] }>("/admin/meta");
    setProducts(meta.products);
    if (isNew) return;
    const g = await apiFetch<Record<string, unknown> & { products: { id: string }[] }>(`${c.api}/${id}`);
    setArchived(!!g.archivedAt);
    setForm({
      name: String(g.name ?? ""),
      slug: String(g.slug ?? ""),
      description: String(g.description ?? ""),
      cover: String(g[c.cover] ?? ""),
      bannerCaption: String(g.bannerCaption ?? ""),
      pictogram: (g.pictogram as FormState["pictogram"]) ?? "LEGGING",
      tone: String(g.tone ?? "#E6D5C5"),
      showInMenu: !!g.showInMenu,
      season: String(g.season ?? ""),
    });
    const ids = g.products.map((p) => p.id);
    setSelected(ids);
    setSavedSelection(ids);
  }, [apiFetch, c.api, c.cover, id, isNew]);
  useEffect(() => void load().catch((err) => toast(errorText(err), "erro")), [load, toast]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  function payload(f: FormState) {
    const slug = f.slug || slugify(f.name);
    return kind === "categoria"
      ? { name: f.name, slug, description: f.description || null, bannerCaption: f.bannerCaption || null, bannerUrl: f.cover || null, pictogram: f.pictogram, tone: f.tone, showInMenu: f.showInMenu }
      : { name: f.name, slug, season: f.season || null, description: f.description || null, coverUrl: f.cover || null };
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const body = payload(form);
    const parsed = (kind === "categoria" ? adminCategorySchema : adminCollectionSchema).safeParse(body);
    if (!parsed.success) {
      setErrors(issuesToErrors(parsed.error.issues));
      return toast("Confira os campos destacados.", "erro");
    }
    setErrors({});
    setSaving(true);
    try {
      if (isNew) {
        const created = await apiFetch<{ id: string }>(c.api, { method: "POST", body: JSON.stringify(parsed.data) });
        toast(`${c.one[0]!.toUpperCase()}${c.one.slice(1)} criada. Agora escolha os produtos.`);
        router.replace(`${c.path}/${created.id}`);
        return;
      }
      await apiFetch(`${c.api}/${id}`, { method: "PUT", body: JSON.stringify(parsed.data) });
      toast("Salvo. A loja já mostra a alteração.");
    } catch (err) {
      toast(errorText(err), "erro");
    } finally {
      setSaving(false);
    }
  }

  async function saveProducts() {
    try {
      const r = await apiFetch<{ count: number; moved?: number }>(`${c.api}/${id}/products`, { method: "PUT", body: JSON.stringify({ productIds: selected }) });
      setSavedSelection(selected);
      toast(`${r.count} produtos salvos${r.moved ? ` (${r.moved} saíram de outra coleção)` : ""}.`);
    } catch (err) {
      toast(errorText(err), "erro");
    }
  }

  async function uploadCover(original: File) {
    if (isNew) return toast("Salve antes de enviar a capa.", "info");
    setUploading(true);
    try {
      const { file } = await compressImage(original, 2400, 0.85);
      const signed = await apiFetch<{ bucket: string; path: string; token: string }>("/admin/uploads/cover", { method: "POST", body: JSON.stringify({ kind, id, contentType: file.type, size: file.size }) });
      const supabase = await getSupabase();
      const { error } = await supabase!.storage.from(signed.bucket).uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
      if (error) throw new Error("Falha no envio da imagem.");
      set("cover", `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${signed.bucket}/${signed.path}`);
      toast("Capa enviada. Clique em Salvar para publicar.", "info");
    } catch (err) {
      toast(errorText(err), "erro");
    } finally {
      setUploading(false);
    }
  }

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const available = products.filter((p) => !selected.includes(p.id) && (!search.trim() || p.name.toLowerCase().includes(search.trim().toLowerCase())));
  const dirtyProducts = JSON.stringify(selected) !== JSON.stringify(savedSelection);
  const move = (i: number, d: -1 | 1) => setSelected((s) => {
    const n = [...s];
    const j = i + d;
    if (j < 0 || j >= n.length) return s;
    [n[i], n[j]] = [n[j]!, n[i]!];
    return n;
  });

  if (!form)
    return (
      <div role="status" aria-label="Carregando" className="space-y-4">
        <div className="skeleton h-12 w-72" />
        <div className="skeleton h-64" />
      </div>
    );

  return (
    <>
      <Link href={c.path} className="mb-3 inline-flex min-h-touch items-center gap-2 text-[14px]">
        <ArrowLeftIcon /> {c.many}
      </Link>
      <PageTitle actions={!isNew && kind === "categoria" && !archived ? <a href={`/colecao/${form.slug}`} target="_blank" rel="noreferrer" className="text-[14px] underline">Ver na loja ↗</a> : undefined}>
        {isNew ? `Nova ${c.one}` : form.name}
      </PageTitle>
      {archived && <p className="mb-4 border-l-2 border-taupe bg-white px-4 py-3 text-[14px]">Arquivad{c.art}: não aparece na loja. Restaure na lista para voltar.</p>}

      <form onSubmit={save} noValidate className="space-y-4">
        <Card title="Dados">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Nome" value={form.name} error={errors.name} onChange={(e) => set("name", e.target.value)} />
            <Input label="Endereço (slug)" value={form.slug} placeholder={slugify(form.name)} error={errors.slug} hint={kind === "categoria" ? `Página: /colecao/${form.slug || slugify(form.name) || "…"}` : "Vazio = gerado pelo nome."} onChange={(e) => set("slug", e.target.value)} />
            {kind === "colecao" && <Input label="Temporada" value={form.season} placeholder="Ex.: Outono 2026" onChange={(e) => set("season", e.target.value)} />}
            <Textarea label="Descrição" value={form.description} error={errors.description} hint={kind === "categoria" ? "Aparece no banner da página da categoria." : undefined} onChange={(e) => set("description", e.target.value)} wrapClassName="md:col-span-2" />
            {kind === "categoria" && (
              <>
                <Select label="Desenho (sem foto)" value={form.pictogram} onChange={(e) => set("pictogram", e.target.value as FormState["pictogram"])}>
                  {PICTOGRAMS.map((p) => (
                    <option key={p} value={p}>
                      {p.toLowerCase()}
                    </option>
                  ))}
                </Select>
                <div>
                  <label htmlFor="tom" className="mb-1.5 block text-[13px] text-texto-2">
                    Cor de fundo (sem foto)
                  </label>
                  <div className="flex gap-2">
                    <input id="tom" type="color" value={form.tone} onChange={(e) => set("tone", e.target.value.toUpperCase())} className="h-11 w-14 border border-linha-forte bg-white" />
                    <input aria-label="Cor em hexadecimal" value={form.tone} onChange={(e) => set("tone", e.target.value)} className={cn("h-11 flex-1 border bg-white px-3 font-mono text-[14px]", errors.tone ? "border-erro" : "border-linha-forte")} />
                  </div>
                  {errors.tone && <p className="mt-1 text-[12px] text-erro">{errors.tone}</p>}
                </div>
                <Check label="Mostrar no menu do site" checked={form.showInMenu} onChange={(v) => set("showInMenu", v)} />
              </>
            )}
          </div>
        </Card>

        <Card title="Imagem de capa">
          <div className="grid gap-5 md:grid-cols-[320px_1fr]">
            <div className="flex aspect-[16/7] items-center justify-center bg-cover bg-center text-[12px] text-texto-2" style={{ backgroundColor: form.tone, ...(form.cover ? { backgroundImage: `url(${form.cover})` } : {}) }}>
              {!form.cover && "Sem imagem (usa o desenho)"}
            </div>
            <div className="space-y-3">
              <label className={cn("btn-secondary inline-flex h-11 cursor-pointer px-5", (uploading || isNew) && "pointer-events-none opacity-50")}>
                {uploading ? "Enviando…" : form.cover ? "Trocar imagem" : "Enviar imagem"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="sr-only"
                  disabled={uploading || isNew}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) void uploadCover(f);
                  }}
                />
              </label>
              {form.cover && (
                <button type="button" className="ml-4 text-[13px] text-texto-2 underline hover:text-erro" onClick={() => set("cover", "")}>
                  Remover imagem
                </button>
              )}
              <p className="text-[13px] text-texto-2">{isNew ? "Salve primeiro para enviar a imagem." : "Foto horizontal (ex.: 2400 × 1000). É comprimida automaticamente."}</p>
              {kind === "categoria" && <Input label="Legenda (sem foto)" value={form.bannerCaption} onChange={(e) => set("bannerCaption", e.target.value)} />}
            </div>
          </div>
        </Card>

        <div className="sticky bottom-0 z-10 -mx-4 flex gap-3 border-t border-linha bg-offwhite/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8 lg:-mx-10 lg:px-10">
          <button type="submit" disabled={saving} className="btn-primary h-12">
            {saving ? "Salvando…" : isNew ? `Criar ${c.one}` : "Salvar"}
          </button>
        </div>
      </form>

      {!isNew && (
        <Card
          title={`Produtos ${kind === "categoria" ? "nesta categoria" : "nesta coleção"}`}
          className="mt-4"
          actions={
            <button type="button" className="btn-dark h-11 px-6" disabled={!dirtyProducts} onClick={() => void saveProducts()}>
              {dirtyProducts ? "Salvar produtos" : "Produtos salvos"}
            </button>
          }
        >
          <p className="mb-4 text-[13px] text-texto-2">
            {kind === "categoria"
              ? "A ordem abaixo é a ordem em “Relevância” na página da categoria. Use as setas para ordenar."
              : "Cada produto pertence a uma coleção só: adicionar aqui tira da coleção anterior."}
          </p>
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="label-sm mb-2 text-texto-2">Incluídos ({selected.length})</p>
              {selected.length === 0 ? (
                <p className="border border-dashed border-linha-forte px-4 py-8 text-center text-[14px] text-texto-2">Nenhum produto ainda. Adicione da lista ao lado.</p>
              ) : (
                <ol className="border border-linha">
                  {selected.map((pid, i) => {
                    const p = byId.get(pid);
                    return (
                      <li key={pid} className="flex items-center gap-3 border-b border-linha px-3 py-2 text-[14px] last:border-b-0">
                        {c.ordered && <span className="w-6 text-right tabular-nums text-texto-2">{i + 1}</span>}
                        <span className="min-w-0 flex-1 truncate">
                          {p?.name ?? "Produto arquivado"}
                          {p && p.status !== "ACTIVE" && <span className="label-sm ml-2 bg-bege px-1.5 text-[9px]">{PRODUCT_STATUS_LABEL[p.status]}</span>}
                        </span>
                        {c.ordered && (
                          <>
                            <button type="button" aria-label="Subir" disabled={i === 0} onClick={() => move(i, -1)} className="px-1 disabled:opacity-30">
                              ▲
                            </button>
                            <button type="button" aria-label="Descer" disabled={i === selected.length - 1} onClick={() => move(i, 1)} className="px-1 disabled:opacity-30">
                              ▼
                            </button>
                          </>
                        )}
                        <button type="button" className="text-[13px] text-texto-2 underline hover:text-erro" onClick={() => setSelected((s) => s.filter((x) => x !== pid))}>
                          Remover
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
            <div>
              <p className="label-sm mb-2 text-texto-2">Adicionar</p>
              <input aria-label="Buscar produto" placeholder="Buscar produto" className="input mb-2 h-11 bg-white" value={search} onChange={(e) => setSearch(e.target.value)} />
              <ul className="max-h-80 overflow-y-auto border border-linha">
                {available.length === 0 && <li className="px-3 py-6 text-center text-[14px] text-texto-2">Nada para adicionar.</li>}
                {available.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 border-b border-linha px-3 py-2 text-[14px] last:border-b-0">
                    <span className="min-w-0 flex-1 truncate">
                      {p.name}
                      {kind === "colecao" && p.collectionId && p.collectionId !== id && <span className="ml-2 text-[12px] text-[#8a5a12]">em outra coleção</span>}
                    </span>
                    <button type="button" className="text-[13px] underline hover:text-oliva" onClick={() => setSelected((s) => [...s, p.id])}>
                      Adicionar
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
