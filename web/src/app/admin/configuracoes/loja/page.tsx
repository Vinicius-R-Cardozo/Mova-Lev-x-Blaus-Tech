"use client";
import { useEffect, useState } from "react";
import { storeSettingsSchema, type StoreSettings } from "@movalev/shared";
import { Card, Input, PageTitle, issuesToErrors } from "@/components/admin/ui";
import { errorText, useFeedback } from "@/components/admin/feedback";
import { useAuth } from "@/lib/auth";

/** Dados da empresa, atendimento e redes sociais (rodapé, páginas legais, contato e e-mails). */
export default function LojaConfigPage() {
  const { apiFetch } = useAuth();
  const { toast } = useFeedback();
  const [form, setForm] = useState<StoreSettings | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<StoreSettings>("/admin/settings/store")
      .then(setForm)
      .catch((err) => toast(errorText(err), "erro"));
  }, [apiFetch, toast]);

  if (!form)
    return (
      <div role="status" aria-label="Carregando" className="space-y-4">
        <div className="skeleton h-12 w-72" />
        <div className="skeleton h-80" />
      </div>
    );
  const set = <K extends keyof StoreSettings>(k: K, v: StoreSettings[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = storeSettingsSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(issuesToErrors(parsed.error.issues));
      return toast("Confira os campos destacados.", "erro");
    }
    setErrors({});
    setSaving(true);
    try {
      setForm(await apiFetch<StoreSettings>("/admin/settings/store", { method: "PUT", body: JSON.stringify(parsed.data) }));
      toast("Dados da loja salvos. Rodapé e páginas já mostram a mudança.");
    } catch (err) {
      toast(errorText(err), "erro");
    } finally {
      setSaving(false);
    }
  }

  const field = (k: keyof StoreSettings, label: string, props: Partial<React.ComponentProps<typeof Input>> = {}) => (
    <Input label={label} value={String(form[k] ?? "")} error={errors[k]} onChange={(e) => set(k, e.target.value as never)} {...props} />
  );

  return (
    <>
      <PageTitle>Dados da loja</PageTitle>
      <form onSubmit={save} noValidate className="space-y-4">
        <Card title="Empresa">
          <p className="mb-4 text-[13px] text-texto-2">Aparecem nas páginas de Termos, Privacidade e Trocas e no rodapé. Campos vazios ficam como “[a preencher]” no site.</p>
          <div className="grid gap-4 md:grid-cols-2">
            {field("storeName", "Nome da loja")}
            {field("legalName", "Razão social")}
            {field("cnpj", "CNPJ", { placeholder: "00.000.000/0000-00" })}
            {field("address", "Endereço completo", { wrapClassName: "md:col-span-2" })}
          </div>
        </Card>
        <Card title="Atendimento">
          <div className="grid gap-4 md:grid-cols-2">
            {field("contactEmail", "E-mail de atendimento", { type: "email", hint: "Recebe as mensagens do formulário de contato." })}
            {field("dpoEmail", "E-mail do encarregado de dados (LGPD)", { type: "email" })}
            {field("whatsapp", "WhatsApp", { placeholder: "11987654321", hint: "Só números, com DDD." })}
            {field("hours", "Horário de atendimento")}
          </div>
        </Card>
        <Card title="Redes sociais">
          <div className="grid gap-4 md:grid-cols-2">
            {field("instagram", "Instagram (link)", { placeholder: "https://instagram.com/…" })}
            {field("tiktok", "TikTok (link)", { placeholder: "https://tiktok.com/@…" })}
            {field("pinterest", "Pinterest (link)")}
            {field("youtube", "YouTube (link)")}
          </div>
        </Card>
        <div className="sticky bottom-0 z-10 -mx-4 border-t border-linha bg-offwhite/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8 lg:-mx-10 lg:px-10">
          <button type="submit" disabled={saving} className="btn-primary h-12">
            {saving ? "Salvando…" : "Salvar dados da loja"}
          </button>
        </div>
      </form>
    </>
  );
}
