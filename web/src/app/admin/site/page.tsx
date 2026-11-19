"use client";
import { useEffect, useState, type ReactNode } from "react";
import { BENEFIT_ICONS, DEFAULT_SITE_CONTENT, siteContentSchema, type SiteContent } from "@movalev/shared";
import { useAuth } from "@/lib/auth";
import { Card, Check, Input, PageTitle, Select, issuesToErrors } from "@/components/admin/ui";
import { errorText, useFeedback } from "@/components/admin/feedback";

type Link = { label: string; href: string };
const ICON_LABEL: Record<(typeof BENEFIT_ICONS)[number], string> = { truck: "Caminhão (frete)", exchange: "Setas (troca)", card: "Cartão (pagamento)", shield: "Escudo (segurança)" };

const move = <T,>(list: T[], i: number, d: -1 | 1) => {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const copy = [...list];
  [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  return copy;
};

function RowTools({ i, n, onMove, onRemove, label }: { i: number; n: number; onMove: (d: -1 | 1) => void; onRemove: () => void; label: string }) {
  const cls = "flex h-11 w-9 items-center justify-center text-[15px] text-texto-2 hover:text-texto disabled:opacity-30";
  return (
    <div className="flex shrink-0 items-end">
      <button type="button" className={cls} disabled={i === 0} onClick={() => onMove(-1)} aria-label={`Subir ${label}`}>↑</button>
      <button type="button" className={cls} disabled={i === n - 1} onClick={() => onMove(1)} aria-label={`Descer ${label}`}>↓</button>
      <button type="button" className={`${cls} hover:!text-erro`} onClick={onRemove} aria-label={`Remover ${label}`}>✕</button>
    </div>
  );
}

/** Lista de links (texto + endereço) com reordenar/remover/adicionar. */
function LinkList({ idBase, links, max, errors, errorPath, onChange, addLabel }: { idBase: string; links: Link[]; max: number; errors: Record<string, string>; errorPath: string; onChange: (l: Link[]) => void; addLabel: string }) {
  const upd = (i: number, k: keyof Link, v: string) => onChange(links.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  return (
    <div className="space-y-2">
      {links.map((l, i) => (
        <div key={i} className="flex flex-wrap items-start gap-2 sm:flex-nowrap">
          <Input id={`${idBase}-${i}-label`} label="Texto" value={l.label} maxLength={60} error={errors[`${errorPath}.${i}.label`]} onChange={(e) => upd(i, "label", e.target.value)} wrapClassName="w-full sm:w-48" />
          <Input id={`${idBase}-${i}-href`} label="Link" value={l.href} placeholder="/colecao/novidades ou https://…" error={errors[`${errorPath}.${i}.href`]} onChange={(e) => upd(i, "href", e.target.value)} wrapClassName="min-w-0 flex-1" />
          <RowTools i={i} n={links.length} label={l.label || "link"} onMove={(d) => onChange(move(links, i, d))} onRemove={() => onChange(links.filter((_, j) => j !== i))} />
        </div>
      ))}
      {links.length < max && (
        <button type="button" onClick={() => onChange([...links, { label: "", href: "/" }])} className="text-[13px] underline underline-offset-4 hover:text-oliva">
          + {addLabel}
        </button>
      )}
    </div>
  );
}

const Hint = ({ children }: { children: ReactNode }) => <p className="mb-4 text-[13px] text-texto-2">{children}</p>;

/** Textos fixos do site: barra de aviso, menu do topo, faixa de vantagens e rodapé. */
export default function SitePage() {
  const { apiFetch } = useAuth();
  const { toast, confirm } = useFeedback();
  const [form, setForm] = useState<SiteContent | null>(null);
  const [saved, setSaved] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<SiteContent>("/admin/settings/site")
      .then((s) => {
        setForm(s);
        setSaved(JSON.stringify(s));
      })
      .catch((err) => toast(errorText(err), "erro"));
  }, [apiFetch, toast]);

  const dirty = !!form && JSON.stringify(form) !== saved;
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (!form)
    return (
      <div role="status" aria-label="Carregando" className="space-y-4">
        <div className="skeleton h-12 w-72" />
        <div className="skeleton h-80" />
      </div>
    );
  const set = <K extends keyof SiteContent>(k: K, v: SiteContent[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const footer = form.footer;
  const setFooter = (patch: Partial<SiteContent["footer"]>) => set("footer", { ...footer, ...patch });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const parsed = siteContentSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(issuesToErrors(parsed.error.issues));
      return toast("Confira os campos destacados.", "erro");
    }
    setErrors({});
    setSaving(true);
    try {
      const s = await apiFetch<SiteContent>("/admin/settings/site", { method: "PUT", body: JSON.stringify(parsed.data) });
      setForm(s);
      setSaved(JSON.stringify(s));
      toast("Conteúdo salvo. O site já mostra a mudança.");
    } catch (err) {
      toast(errorText(err), "erro");
    } finally {
      setSaving(false);
    }
  }

  async function restore() {
    const ok = await confirm({ title: "Voltar aos textos originais?", text: "Barra de aviso, menu, vantagens e rodapé voltam ao padrão da loja. Nada é salvo até você clicar em Salvar.", confirm: "Voltar ao padrão" });
    if (ok) setForm(structuredClone(DEFAULT_SITE_CONTENT));
  }

  const a = form.announcement;
  return (
    <>
      <PageTitle>Topo, menu e rodapé</PageTitle>
      <form onSubmit={save} noValidate className="space-y-4">
        <Card title="Barra de aviso (topo)">
          <Hint>Faixa escura acima do menu, em todas as páginas da loja. Aceita {"{{parcelas}}"} e {"{{pix_desconto}}"}.</Hint>
          <Check label="Mostrar a barra de aviso" checked={a.enabled} onChange={(v) => set("announcement", { ...a, enabled: v })} />
          <div className="mt-3 grid gap-4 md:grid-cols-[2fr_1fr]">
            <Input id="ann-text" label="Texto" value={a.text} maxLength={140} error={errors["announcement.text"]} onChange={(e) => set("announcement", { ...a, text: e.target.value })} hint={`${a.text.length}/140`} />
            <Input id="ann-href" label="Link ao clicar (opcional)" value={a.href} placeholder="/colecao/novidades" error={errors["announcement.href"]} onChange={(e) => set("announcement", { ...a, href: e.target.value })} />
          </div>
        </Card>

        <Card title="Menu do topo">
          <Hint>Links ao lado de “Loja” (que abre as categorias). Até 5. Use caminhos da loja (/conta, /colecao/…, /pagina/…) ou links https://.</Hint>
          <LinkList idBase="nav" links={form.nav} max={5} errors={errors} errorPath="nav" onChange={(l) => set("nav", l)} addLabel="Adicionar link ao menu" />
        </Card>

        <Card title="Faixa de vantagens (home)">
          <Hint>Até 4 itens. Aceita {"{{parcelas}}"} e {"{{pix_desconto}}"} (vêm de Configurações › Pagamentos). Sem itens, a faixa some.</Hint>
          <div className="space-y-2">
            {form.benefits.map((b, i) => {
              const upd = (patch: Partial<typeof b>) => set("benefits", form.benefits.map((x, j) => (j === i ? { ...x, ...patch } : x)));
              return (
                <div key={i} className="flex flex-wrap items-start gap-2 lg:flex-nowrap">
                  <Select id={`ben-${i}-icon`} label="Ícone" value={b.icon} onChange={(e) => upd({ icon: e.target.value as typeof b.icon })} wrapClassName="w-full sm:w-48">
                    {BENEFIT_ICONS.map((ic) => (
                      <option key={ic} value={ic}>{ICON_LABEL[ic]}</option>
                    ))}
                  </Select>
                  <Input id={`ben-${i}-title`} label="Título" value={b.title} maxLength={40} error={errors[`benefits.${i}.title`]} onChange={(e) => upd({ title: e.target.value })} wrapClassName="min-w-0 flex-1" />
                  <Input id={`ben-${i}-text`} label="Texto menor" value={b.text} maxLength={60} error={errors[`benefits.${i}.text`]} onChange={(e) => upd({ text: e.target.value })} wrapClassName="min-w-0 flex-1" />
                  <RowTools i={i} n={form.benefits.length} label={b.title || "vantagem"} onMove={(d) => set("benefits", move(form.benefits, i, d))} onRemove={() => set("benefits", form.benefits.filter((_, j) => j !== i))} />
                </div>
              );
            })}
            {form.benefits.length < 4 && (
              <button type="button" onClick={() => set("benefits", [...form.benefits, { icon: "shield", title: "", text: "" }])} className="text-[13px] underline underline-offset-4 hover:text-oliva">
                + Adicionar vantagem
              </button>
            )}
          </div>
        </Card>

        <Card title="Rodapé">
          <Hint>Redes sociais e CNPJ do rodapé vêm de Configurações › Dados da loja.</Hint>
          <div className="grid gap-4 md:grid-cols-2">
            <Input id="ft-news" label="Chamada da newsletter" value={footer.newsletterTitle} maxLength={120} error={errors["footer.newsletterTitle"]} onChange={(e) => setFooter({ newsletterTitle: e.target.value })} />
            <Input id="ft-note" label="Nota no pé (formas de pagamento)" value={footer.bottomNote} maxLength={120} error={errors["footer.bottomNote"]} onChange={(e) => setFooter({ bottomNote: e.target.value })} hint="Aceita {{parcelas}}." />
          </div>
          <div className="mt-6 space-y-6">
            {footer.columns.map((col, i) => (
              <fieldset key={i} className="border border-linha p-4">
                <legend className="px-1 text-[13px] text-texto-2">Coluna {i + 1}</legend>
                <div className="mb-3 flex items-start gap-2">
                  <Input id={`col-${i}-title`} label="Título da coluna" value={col.title} maxLength={40} error={errors[`footer.columns.${i}.title`]} onChange={(e) => setFooter({ columns: footer.columns.map((c, j) => (j === i ? { ...c, title: e.target.value } : c)) })} wrapClassName="min-w-0 flex-1 sm:max-w-xs" />
                  <RowTools i={i} n={footer.columns.length} label={`coluna ${col.title}`} onMove={(d) => setFooter({ columns: move(footer.columns, i, d) })} onRemove={() => setFooter({ columns: footer.columns.filter((_, j) => j !== i) })} />
                </div>
                <LinkList idBase={`col-${i}`} links={col.links} max={8} errors={errors} errorPath={`footer.columns.${i}.links`} onChange={(links) => setFooter({ columns: footer.columns.map((c, j) => (j === i ? { ...c, links } : c)) })} addLabel="Adicionar link" />
              </fieldset>
            ))}
            {footer.columns.length < 4 && (
              <button type="button" onClick={() => setFooter({ columns: [...footer.columns, { title: "Nova coluna", links: [] }] })} className="text-[13px] underline underline-offset-4 hover:text-oliva">
                + Adicionar coluna
              </button>
            )}
          </div>
        </Card>

        <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-4 border-t border-linha bg-offwhite/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8 lg:-mx-10 lg:px-10">
          <button type="submit" disabled={saving || !dirty} className="btn-primary h-12">
            {saving ? "Salvando…" : "Salvar conteúdo"}
          </button>
          {dirty && !saving && <span className="text-[13px] text-texto-2">Alterações não salvas</span>}
          <button type="button" onClick={restore} className="ml-auto text-[13px] text-texto-2 underline underline-offset-4 hover:text-texto">
            Voltar ao padrão
          </button>
        </div>
      </form>
    </>
  );
}
