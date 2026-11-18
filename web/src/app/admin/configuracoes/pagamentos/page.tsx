"use client";
import { useEffect, useState } from "react";
import { formatBRL, installmentsFor, paymentSettingsSchema, pixTotalCents, type PaymentSettings } from "@movalev/shared";
import { Card, Check, Input, MoneyInput, PageTitle, issuesToErrors } from "@/components/admin/ui";
import { errorText, useFeedback } from "@/components/admin/feedback";
import { useAuth } from "@/lib/auth";

/** Formas de pagamento do checkout: Pix (desconto), cartão (parcelas) e boleto. */
export default function PagamentosPage() {
  const { apiFetch } = useAuth();
  const { toast } = useFeedback();
  const [form, setForm] = useState<PaymentSettings | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<PaymentSettings>("/admin/settings/payments")
      .then(setForm)
      .catch((err) => toast(errorText(err), "erro"));
  }, [apiFetch, toast]);

  if (!form)
    return (
      <div role="status" aria-label="Carregando" className="space-y-4">
        <div className="skeleton h-12 w-72" />
        <div className="skeleton h-64" />
      </div>
    );
  const set = <K extends keyof PaymentSettings>(k: K, v: PaymentSettings[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = paymentSettingsSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(issuesToErrors(parsed.error.issues));
      return toast(parsed.error.issues[0]?.message ?? "Confira os campos.", "erro");
    }
    setErrors({});
    setSaving(true);
    try {
      setForm(await apiFetch<PaymentSettings>("/admin/settings/payments", { method: "PUT", body: JSON.stringify(parsed.data) }));
      toast("Formas de pagamento salvas. O checkout e a vitrine já usam as novas regras.");
    } catch (err) {
      toast(errorText(err), "erro");
    } finally {
      setSaving(false);
    }
  }

  // Exemplo com uma compra de R$ 289 (preço de uma legging).
  const sample = 28900;
  const n = installmentsFor(sample, form.maxInstallments, form.minInstallmentCents);

  return (
    <>
      <PageTitle>Pagamentos</PageTitle>
      <form onSubmit={save} noValidate className="space-y-4">
        {errors.pixEnabled && <p className="border-l-2 border-erro bg-white px-4 py-3 text-[14px] text-erro">{errors.pixEnabled}</p>}
        <Card title="Pix">
          <Check label="Aceitar Pix" checked={form.pixEnabled} onChange={(v) => set("pixEnabled", v)} />
          {form.pixEnabled && (
            <div className="mt-4 grid items-end gap-4 md:grid-cols-[200px_1fr]">
              <Input label="Desconto no Pix (%)" type="number" min={0} max={30} step={1} value={form.pixDiscountPercent} error={errors.pixDiscountPercent} onChange={(e) => set("pixDiscountPercent", Math.trunc(Number(e.target.value) || 0))} />
              <p className="pb-3 text-[13px] text-texto-2">
                Ex.: compra de {formatBRL(sample, { compact: true })} fica {formatBRL(pixTotalCents(sample, form.pixDiscountPercent))} no Pix.
              </p>
            </div>
          )}
        </Card>
        <Card title="Cartão de crédito">
          <Check label="Aceitar cartão" checked={form.cardEnabled} onChange={(v) => set("cardEnabled", v)} />
          {form.cardEnabled && (
            <div className="mt-4 grid items-end gap-4 md:grid-cols-[200px_220px_1fr]">
              <Input label="Parcelas sem juros (até)" type="number" min={1} max={12} step={1} value={form.maxInstallments} error={errors.maxInstallments} onChange={(e) => set("maxInstallments", Math.min(12, Math.max(1, Math.trunc(Number(e.target.value) || 1))))} />
              <MoneyInput label="Parcela mínima (R$)" cents={form.minInstallmentCents} onChange={(c) => set("minInstallmentCents", c ?? 0)} />
              <p className="pb-3 text-[13px] text-texto-2">
                Ex.: {formatBRL(sample, { compact: true })} em até {n}x de {formatBRL(Math.round(sample / n))}
                {form.minInstallmentCents > 0 ? " (respeitando a parcela mínima)" : ""}.
              </p>
            </div>
          )}
        </Card>
        <Card title="Boleto">
          <Check label="Aceitar boleto" checked={form.boletoEnabled} onChange={(v) => set("boletoEnabled", v)} />
        </Card>
        <p className="text-[13px] text-texto-2">As regras valem para o checkout e para os preços mostrados na loja (“6x de…”, “no Pix”). O gateway de pagamento real ainda não está ligado: hoje os pedidos usam o modo de teste.</p>
        <div className="sticky bottom-0 z-10 -mx-4 border-t border-linha bg-offwhite/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8 lg:-mx-10 lg:px-10">
          <button type="submit" disabled={saving} className="btn-primary h-12">
            {saving ? "Salvando…" : "Salvar formas de pagamento"}
          </button>
        </div>
      </form>
    </>
  );
}
