"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CONTENT_PLACEHOLDERS, CONTENT_WIDGETS, fillPlaceholders, pageInputSchema, placeholderValues, slugify, type PageDTO } from "@movalev/shared";
import { useAuth } from "@/lib/auth";
import { useStoreConfig } from "@/lib/storeConfig";
import { Card, Check, Input, PageTitle, Textarea, issuesToErrors } from "@/components/admin/ui";
import { errorText, useFeedback } from "@/components/admin/feedback";
import { pagePath } from "@/components/admin/pagePath";
import { Markdown } from "@/components/content/Markdown";
import { cn } from "@/lib/cn";

type Form = { slug: string; title: string; emphasis: string; kicker: string; intro: string; body: string; seoTitle: string; seoDescription: string; showToc: boolean; published: boolean };
const EMPTY: Form = { slug: "", title: "", emphasis: "", kicker: "", intro: "", body: "## Primeiro título\n\nEscreva o texto aqui.", seoTitle: "", seoDescription: "", showToc: false, published: true };
const toForm = (p: PageDTO): Form => ({ slug: p.slug, title: p.title, emphasis: p.emphasis ?? "", kicker: p.kicker ?? "", intro: p.intro ?? "", body: p.body, seoTitle: p.seoTitle ?? "", seoDescription: p.seoDescription ?? "", showToc: p.showToc, published: p.published });
const orNull = (v: string) => (v.trim() ? v.trim() : null);

const HELP: [string, string][] = [
  ["## Título", "título de seção (entra no índice)"],
  ["### Subtítulo", "título menor"],
  ["**negrito**  *itálico*", "destaque no texto"],
  ["- item", "lista com marcadores"],
  ["1. item", "lista numerada"],
  ["[texto](/contato)", "link (caminho da loja ou https://)"],
  ["| A | B |", "tabela (2ª linha: | --- | --- |)"],
  ["---", "linha divisória"],
];

/** Editor de página de texto: Markdown com prévia ao lado e marcadores das Configurações. */
export default function PaginaEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "nova";
  const router = useRouter();
  const { apiFetch } = useAuth();
  const { toast, confirm } = useFeedback();
  const config = useStoreConfig();
  const [page, setPage] = useState<PageDTO | null>(null);
  const [form, setForm] = useState<Form | null>(isNew ? EMPTY : null);
  const [saved, setSaved] = useState<Form | null>(isNew ? EMPTY : null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"texto" | "previa">("texto");
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isNew) return;
    apiFetch<PageDTO>(`/admin/pages/${id}`)
      .then((p) => {
        setPage(p);
        setForm(toForm(p));
        setSaved(toForm(p));
      })
      .catch((err) => toast(errorText(err), "erro"));
  }, [apiFetch, id, isNew, toast]);

  const dirty = !!form && JSON.stringify(form) !== JSON.stringify(saved);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const values = useMemo(() => placeholderValues(config.store, config.payments), [config]);
  const previewBody = useMemo(() => (form ? fillPlaceholders(form.body, values) : ""), [form, values]);

  if (!form)
    return (
      <div role="status" aria-label="Carregando" className="space-y-4">
        <div className="skeleton h-12 w-72" />
        <div className="skeleton h-96" />
      </div>
    );

  const system = page?.system ?? false;
  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => {
      if (!f) return f;
      const next = { ...f, [k]: v };
      // Página nova: o endereço acompanha o título até alguém mexer nele.
      if (k === "title" && !slugTouched) next.slug = slugify(String(v)).slice(0, 60);
      return next;
    });

  /** Insere um marcador/componente onde está o cursor. */
  function insert(snippet: string, ownLine = false) {
    const el = bodyRef.current;
    const body = form!.body;
    const start = el?.selectionStart ?? body.length;
    const end = el?.selectionEnd ?? body.length;
    const text = ownLine ? `\n\n${snippet}\n\n` : snippet;
    set("body", body.slice(0, start) + text + body.slice(end));
    setTab("texto");
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + text.length, start + text.length);
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const parsed = pageInputSchema.safeParse({
      ...form,
      emphasis: orNull(form!.emphasis),
      kicker: orNull(form!.kicker),
      intro: orNull(form!.intro),
      seoTitle: orNull(form!.seoTitle),
      seoDescription: orNull(form!.seoDescription),
    });
    if (!parsed.success) {
      setErrors(issuesToErrors(parsed.error.issues));
      return toast("Confira os campos destacados.", "erro");
    }
    setErrors({});
    setSaving(true);
    try {
      const p = await apiFetch<PageDTO>(isNew ? "/admin/pages" : `/admin/pages/${id}`, { method: isNew ? "POST" : "PUT", body: JSON.stringify(parsed.data) });
      setPage(p);
      setForm(toForm(p));
      setSaved(toForm(p));
      toast(p.published ? `Página salva. Já está no ar em ${pagePath(p)}.` : "Rascunho salvo (não aparece no site).");
      if (isNew) router.replace(`/admin/paginas/${p.id}`);
    } catch (err) {
      const msg = errorText(err);
      if (/endereço/.test(msg)) setErrors({ slug: msg });
      toast(msg, "erro");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!page) return;
    const ok = await confirm({ title: `Excluir a página “${page.title}”?`, text: `O endereço ${pagePath(page)} deixa de existir.`, confirm: "Excluir página", danger: true });
    if (!ok) return;
    try {
      await apiFetch(`/admin/pages/${page.id}`, { method: "DELETE" });
      setSaved(form);
      toast("Página excluída.");
      router.push("/admin/paginas");
    } catch (err) {
      toast(errorText(err), "erro");
    }
  }

  const publicPath = pagePath({ slug: form.slug || "…", system });

  return (
    <>
      <Link href="/admin/paginas" className="mb-3 inline-block text-[13px] text-texto-2 hover:text-texto hover:underline">
        ← Páginas
      </Link>
      <PageTitle
        actions={
          page?.published && (
            <a href={pagePath(page)} target="_blank" rel="noopener noreferrer" className="text-[14px] underline underline-offset-4 hover:text-oliva">
              Ver no site ↗
            </a>
          )
        }
      >
        {isNew ? "Nova página" : [form.title, form.emphasis].filter(Boolean).join(" ") || "Página"}
      </PageTitle>

      <form onSubmit={save} noValidate className="space-y-4">
        <Card title="Topo da página">
          <div className="grid gap-4 md:grid-cols-2">
            <Input id="pg-title" label="Título" value={form.title} error={errors.title} onChange={(e) => set("title", e.target.value)} maxLength={80} />
            <Input id="pg-emphasis" label="Final do título em itálico (opcional)" value={form.emphasis} error={errors.emphasis} onChange={(e) => set("emphasis", e.target.value)} maxLength={60} hint="Ex.: título “Fale”, itálico “com a gente”." />
            <Input id="pg-kicker" label="Rótulo acima do título (opcional)" value={form.kicker} error={errors.kicker} onChange={(e) => set("kicker", e.target.value)} maxLength={40} placeholder="Ajuda" />
            <Input
              id="pg-slug"
              label="Endereço"
              value={form.slug}
              error={errors.slug}
              disabled={system}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
              }}
              hint={system ? `Fixo: ${publicPath} (o site aponta para ele).` : `Fica em ${publicPath}`}
              maxLength={60}
            />
            <Textarea id="pg-intro" label="Introdução (opcional)" value={form.intro} error={errors.intro} onChange={(e) => set("intro", e.target.value)} maxLength={400} wrapClassName="md:col-span-2" />
          </div>
        </Card>

        <Card title="Texto">
          <div className="mb-3 flex gap-1 xl:hidden" role="tablist" aria-label="Modo do editor">
            {(["texto", "previa"] as const).map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("h-9 px-4 text-[13px]", tab === t ? "bg-preto text-offwhite" : "bg-bege text-texto-2 hover:text-texto")}>
                {t === "texto" ? "Escrever" : "Pré-visualizar"}
              </button>
            ))}
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <div className={cn(tab !== "texto" && "hidden xl:block")}>
              <label htmlFor="pg-body" className="mb-1.5 block text-[13px] text-texto-2">
                Texto (Markdown)
              </label>
              <textarea
                id="pg-body"
                ref={bodyRef}
                value={form.body}
                onChange={(e) => set("body", e.target.value)}
                aria-invalid={!!errors.body}
                spellCheck
                className={cn("min-h-[520px] w-full border bg-white px-3 py-2.5 font-mono text-[13px] leading-relaxed focus:border-preto focus:outline-none", errors.body ? "border-erro" : "border-linha-forte")}
              />
              {errors.body && <p className="mt-1 text-[12px] text-erro">{errors.body}</p>}
              <div className="mt-3 space-y-3 text-[12px] text-texto-2">
                <div>
                  <p className="mb-1.5">Dados da loja (clique para inserir — vêm de Configurações › Dados da loja):</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CONTENT_PLACEHOLDERS.map((p) => (
                      <button key={p.key} type="button" title={p.label} onClick={() => insert(`{{${p.key}}}`)} className="border border-linha bg-white px-2 py-1 font-mono hover:border-preto">
                        {`{{${p.key}}}`}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5">
                    Use <span className="font-mono">{"{{marcador?}}"}</span> para a linha sumir quando o dado estiver vazio (ex.: WhatsApp).
                  </p>
                </div>
                <div>
                  <p className="mb-1.5">Componentes (numa linha sozinha):</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CONTENT_WIDGETS.map((w) => (
                      <button key={w.key} type="button" onClick={() => insert(`[[${w.key}]]`, true)} className="border border-linha bg-white px-2 py-1 hover:border-preto">
                        {w.label}
                      </button>
                    ))}
                  </div>
                </div>
                <details>
                  <summary className="cursor-pointer select-none hover:text-texto">Como formatar</summary>
                  <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                    {HELP.map(([code, what]) => (
                      <div key={code} className="contents">
                        <dt className="font-mono text-texto">{code}</dt>
                        <dd>{what}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
              </div>
            </div>
            <div className={cn(tab !== "previa" && "hidden xl:block")}>
              <p className="mb-1.5 text-[13px] text-texto-2">Prévia</p>
              <div className="max-h-[760px] overflow-y-auto border border-linha bg-offwhite px-5 py-6">
                {form.kicker && <p className="label-sm text-texto-3">{form.kicker}</p>}
                <p className="mt-2 font-display text-[36px] leading-tight">
                  {form.title || "Título"} {form.emphasis && <em>{form.emphasis}</em>}
                </p>
                {form.intro && <p className="mt-3 text-[15px] font-light text-texto-3">{fillPlaceholders(form.intro, values)}</p>}
                <article className="prose-mova mt-8 [&>h2:first-child]:mt-0">
                  <Markdown source={previewBody} preview />
                </article>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Opções e Google">
          <div className="grid gap-4 md:grid-cols-2">
            <Input id="pg-seo-title" label="Título no Google (opcional)" value={form.seoTitle} error={errors.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} maxLength={70} hint={`${form.seoTitle.length}/70 · vazio = título da página`} />
            <Input id="pg-seo-desc" label="Descrição no Google (opcional)" value={form.seoDescription} error={errors.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} maxLength={160} hint={`${form.seoDescription.length}/160 · vazio = introdução`} />
          </div>
          <div className="mt-4 flex flex-wrap gap-x-8">
            <Check label="Mostrar índice “Nesta página” (com os títulos ##)" checked={form.showToc} onChange={(v) => set("showToc", v)} />
            {!system && <Check label="Publicada (desmarque para deixar como rascunho)" checked={form.published} onChange={(v) => set("published", v)} />}
          </div>
        </Card>

        <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-4 border-t border-linha bg-offwhite/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8 lg:-mx-10 lg:px-10">
          <button type="submit" disabled={saving || (!isNew && !dirty)} className="btn-primary h-12">
            {saving ? "Salvando…" : isNew ? "Criar página" : "Salvar página"}
          </button>
          {dirty && !saving && <span className="text-[13px] text-texto-2">Alterações não salvas</span>}
          {page && !system && (
            <button type="button" onClick={remove} className="ml-auto text-[13px] text-erro underline underline-offset-4">
              Excluir página
            </button>
          )}
        </div>
      </form>
    </>
  );
}
