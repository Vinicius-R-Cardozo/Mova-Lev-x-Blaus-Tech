"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { adminCouponSchema, formatBRL } from "@movalev/shared";
import { useAuth } from "@/lib/auth";
import { Card, Check, Input, MoneyInput, Notice, PageTitle, Select, issuesToErrors } from "@/components/admin/ui";

type Coupon = { id: string; code: string; description: string | null; type: "PERCENT" | "FIXED"; value: number; minSubtotalCents: number; firstPurchaseOnly: boolean; stacksWithProgressive: boolean; maxRedemptions: number | null; redemptionsCount: number; active: boolean; startsAt: string | null; endsAt: string | null };
type CouponForm = { code: string; description: string; type: "PERCENT" | "FIXED"; value: number; minSubtotalCents: number; firstPurchaseOnly: boolean; stacksWithProgressive: boolean; maxRedemptions: number | null; active: boolean; startsAt: string; endsAt: string };
const EMPTY: CouponForm = { code: "", description: "", type: "PERCENT", value: 10, minSubtotalCents: 0, firstPurchaseOnly: false, stacksWithProgressive: true, maxRedemptions: null as number | null, active: true, startsAt: "", endsAt: "" };

export default function CuponsPage() {
  const { apiFetch } = useAuth();
  const [list, setList] = useState<Coupon[] | null>(null);
  const [editing, setEditing] = useState<string | "novo" | null>(null);
  const [form, setForm] = useState<CouponForm>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ kind: "ok" | "erro"; text: string } | null>(null);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const load = useCallback(() => apiFetch<Coupon[]>("/admin/coupons").then(setList), [apiFetch]);
  useEffect(() => void load(), [load]);

  const edit = (c?: Coupon) => {
    setErrors({});
    setNotice(null);
    setKey(crypto.randomUUID());
    setEditing(c ? c.id : "novo");
    setForm(c ? { code: c.code, type: c.type, value: c.value, minSubtotalCents: c.minSubtotalCents, firstPurchaseOnly: c.firstPurchaseOnly, stacksWithProgressive: c.stacksWithProgressive, maxRedemptions: c.maxRedemptions, active: c.active, description: c.description ?? "", startsAt: c.startsAt?.slice(0, 10) ?? "", endsAt: c.endsAt?.slice(0, 10) ?? "" } : EMPTY);
  };

  async function save(e: FormEvent) {
    e.preventDefault();
    const parsed = adminCouponSchema.safeParse({ ...form, description: form.description || null, startsAt: form.startsAt || null, endsAt: form.endsAt || null });
    if (!parsed.success) return setErrors(issuesToErrors(parsed.error.issues));
    try {
      if (editing === "novo") await apiFetch("/admin/coupons", { method: "POST", body: JSON.stringify(parsed.data), idempotencyKey: key });
      else await apiFetch(`/admin/coupons/${editing}`, { method: "PUT", body: JSON.stringify(parsed.data) });
      setEditing(null);
      setNotice({ kind: "ok", text: "Cupom salvo." });
      await load();
    } catch (err) {
      setNotice({ kind: "erro", text: err instanceof Error ? err.message : "Erro." });
    }
  }

  return (
    <>
      <PageTitle actions={!editing && <button type="button" onClick={() => edit()} className="btn-primary h-11 px-6">Novo cupom</button>}>Cupons</PageTitle>
      {notice && <div className="mb-4"><Notice kind={notice.kind}>{notice.text}</Notice></div>}
      {editing ? (
        <Card title={editing === "novo" ? "Novo cupom" : form.code}>
          <form onSubmit={save} noValidate className="grid gap-4 md:grid-cols-3">
            <Input label="Código" value={form.code} error={errors.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
            <Select label="Tipo" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "PERCENT" | "FIXED" })}>
              <option value="PERCENT">Percentual (%)</option>
              <option value="FIXED">Valor fixo (R$)</option>
            </Select>
            {form.type === "PERCENT" ? (
              <Input label="Desconto (%)" type="number" min={1} max={90} value={form.value} error={errors.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
            ) : (
              <MoneyInput label="Desconto (R$)" cents={form.value} error={errors.value} onChange={(c) => setForm({ ...form, value: c ?? 0 })} />
            )}
            <Input label="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} wrapClassName="md:col-span-3" />
            <MoneyInput label="Compra mínima (R$)" cents={form.minSubtotalCents} onChange={(c) => setForm({ ...form, minSubtotalCents: c ?? 0 })} />
            <Input label="Limite de usos" type="number" min={1} placeholder="sem limite" value={form.maxRedemptions ?? ""} onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value ? Number(e.target.value) : null })} />
            <div />
            <Input label="Início" type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
            <Input label="Fim" type="date" value={form.endsAt} error={errors.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
            <div />
            <Check label="Ativo" checked={form.active} onChange={(v) => setForm({ ...form, active: v })} />
            <Check label="Só na 1ª compra" checked={form.firstPurchaseOnly} onChange={(v) => setForm({ ...form, firstPurchaseOnly: v })} />
            <Check label="Acumula com o desconto progressivo" checked={form.stacksWithProgressive} onChange={(v) => setForm({ ...form, stacksWithProgressive: v })} />
            <div className="flex gap-3 md:col-span-3">
              <button type="submit" className="btn-primary h-11 px-6">Salvar</button>
              <button type="button" onClick={() => setEditing(null)} className="btn-secondary h-11 px-6">Cancelar</button>
            </div>
          </form>
        </Card>
      ) : (
        <div className="overflow-x-auto border border-linha bg-white">
          <table className="w-full min-w-[700px] text-left text-[14px]">
            <thead className="border-b border-linha bg-bege/50 text-[12px] uppercase tracking-[0.08em] text-texto-2"><tr><th className="p-3 font-normal">Código</th><th className="p-3 font-normal">Desconto</th><th className="p-3 font-normal">Regras</th><th className="p-3 font-normal">Usos</th><th className="p-3 font-normal">Status</th></tr></thead>
            <tbody>
              {list?.map((c) => (
                <tr key={c.id} className="border-b border-linha last:border-0">
                  <td className="p-3"><button type="button" onClick={() => edit(c)} className="font-normal underline-offset-4 hover:underline">{c.code}</button><span className="block text-[12px] text-texto-2">{c.description}</span></td>
                  <td className="p-3">{c.type === "PERCENT" ? `${c.value}%` : formatBRL(c.value)}</td>
                  <td className="p-3 text-[13px] text-texto-2">{[c.firstPurchaseOnly && "1ª compra", c.stacksWithProgressive ? "acumula" : "não acumula", c.minSubtotalCents > 0 && `mín. ${formatBRL(c.minSubtotalCents, { compact: true })}`].filter(Boolean).join(" · ")}</td>
                  <td className="p-3">{c.redemptionsCount}{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ""}</td>
                  <td className="p-3">{c.active ? "Ativo" : "Inativo"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
