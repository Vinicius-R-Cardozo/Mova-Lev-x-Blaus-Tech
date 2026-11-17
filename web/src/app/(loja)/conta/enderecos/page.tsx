"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { UFS, accountAddressSchema, type AddressDTO } from "@movalev/shared";
import { useAuth } from "@/lib/auth";
import { Field } from "@/components/checkout/Field";

const empty = { label: "", recipient: "", cep: "", street: "", number: "", complement: "", district: "", city: "", uf: "", isDefault: false };
type Form = typeof empty;

export default function EnderecosPage() {
  const { apiFetch } = useAuth();
  const [list, setList] = useState<AddressDTO[] | null>(null);
  const [editing, setEditing] = useState<string | "novo" | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(() => apiFetch<AddressDTO[]>("/me/addresses").then(setList).catch(() => setList([])), [apiFetch]);
  useEffect(() => void load(), [load]);

  // Autopreenchimento pelo CEP (mesma consulta do checkout, feita no servidor).
  useEffect(() => {
    const cep = form.cep.replace(/\D/g, "");
    if (cep.length !== 8 || !editing) return;
    const t = setTimeout(() => {
      apiFetch<{ address: { street: string; district: string; city: string; uf: string } | null }>("/checkout/quote", { method: "POST", body: JSON.stringify({ items: [], cep }) })
        .then((r) => r.address && setForm((f) => ({ ...f, street: f.street || r.address!.street, district: f.district || r.address!.district, city: r.address!.city, uf: r.address!.uf })))
        .catch(() => undefined);
    }, 300);
    return () => clearTimeout(t);
  }, [form.cep, editing, apiFetch]);

  const startEdit = (a?: AddressDTO) => {
    setErrors({});
    setMessage("");
    setEditing(a ? a.id : "novo");
    setForm(a ? { ...empty, ...a, label: a.label ?? "", recipient: a.recipient ?? "", complement: a.complement ?? "" } : empty);
  };

  async function save(e: FormEvent) {
    e.preventDefault();
    const parsed = accountAddressSchema.safeParse({ ...form, label: form.label || undefined, recipient: form.recipient || undefined });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
      return setErrors(errs);
    }
    setSaving(true);
    try {
      if (editing === "novo") await apiFetch("/me/addresses", { method: "POST", body: JSON.stringify(parsed.data), idempotencyKey: crypto.randomUUID() });
      else await apiFetch(`/me/addresses/${editing}`, { method: "PUT", body: JSON.stringify(parsed.data) });
      setEditing(null);
      setMessage("Endereço salvo.");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Excluir este endereço?")) return;
    await apiFetch(`/me/addresses/${id}`, { method: "DELETE" });
    await load();
  }

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <section aria-labelledby="end-titulo">
      <h1 id="end-titulo" className="text-h2-sm md:text-[56px]">
        Endereços
      </h1>
      <p role="status" className="mt-3 text-body-sm text-oliva">{message}</p>

      {!editing && (
        <>
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {list?.map((a) => (
              <li key={a.id} className="border border-linha-forte bg-white p-5">
                <p className="text-[16px] font-normal">
                  {a.label || "Endereço"} {a.isDefault && <span className="label-sm ml-2 bg-salvia px-2 py-1 text-[10px]">Principal</span>}
                </p>
                <p className="mt-2 text-[15px] font-light text-texto-3">
                  {a.street}, {a.number}
                  {a.complement ? ` · ${a.complement}` : ""}
                  <br />
                  {a.district} — {a.city}/{a.uf} · {a.cep.replace(/^(\d{5})/, "$1-")}
                </p>
                <div className="mt-3 flex gap-5">
                  <button type="button" onClick={() => startEdit(a)} className="min-h-touch text-[15px] underline underline-offset-4">
                    Editar
                  </button>
                  <button type="button" onClick={() => void remove(a.id)} className="min-h-touch text-[15px] text-texto-2 underline underline-offset-4">
                    Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {list?.length === 0 && <p className="mt-4 text-body font-light">Nenhum endereço salvo.</p>}
          <button type="button" onClick={() => startEdit()} className="btn-secondary mt-8">
            Adicionar endereço
          </button>
        </>
      )}

      {editing && (
        <form onSubmit={save} noValidate className="mt-6 grid max-w-2xl gap-5 md:grid-cols-2">
          <Field label="Nome do endereço (opcional)" name="label" placeholder="Casa, trabalho…" value={form.label} onChange={set("label")} />
          <Field label="Quem recebe (opcional)" name="recipient" value={form.recipient} onChange={set("recipient")} />
          <Field label="CEP" name="cep" inputMode="numeric" value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value.replace(/\D/g, "").slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2") })} error={errors.cep} />
          <div className="hidden md:block" />
          <Field label="Rua" name="street" value={form.street} onChange={set("street")} error={errors.street} />
          <Field label="Número" name="number" value={form.number} onChange={set("number")} error={errors.number} />
          <Field label="Complemento" name="complement" value={form.complement} onChange={set("complement")} />
          <Field label="Bairro" name="district" value={form.district} onChange={set("district")} error={errors.district} />
          <Field label="Cidade" name="city" value={form.city} onChange={set("city")} error={errors.city} />
          <div>
            <label htmlFor="f-uf" className="mb-2 block text-[13px] text-texto-2">UF</label>
            <select id="f-uf" value={form.uf} onChange={set("uf")} aria-invalid={!!errors.uf} className="h-[54px] w-full border border-linha-forte bg-white px-3">
              <option value="" />
              {UFS.map((u) => <option key={u}>{u}</option>)}
            </select>
            {errors.uf && <p className="mt-1.5 text-[13px] text-erro">{errors.uf}</p>}
          </div>
          <label className="flex min-h-touch items-center gap-3 text-[15px] md:col-span-2">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} className="h-5 w-5 accent-oliva" />
            Usar como endereço principal
          </label>
          <div className="flex gap-3 md:col-span-2">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? "Salvando…" : "Salvar endereço"}</button>
            <button type="button" onClick={() => setEditing(null)} className="btn-secondary">Cancelar</button>
          </div>
        </form>
      )}
    </section>
  );
}
