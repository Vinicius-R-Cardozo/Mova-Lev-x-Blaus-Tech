"use client";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useState, type FormEvent } from "react";
import { adminCouponSchema, formatBRL, type OrderStatus } from "@movalev/shared";
import { useAuth } from "@/lib/auth";
import { Card, Check, Input, MoneyInput, PageTitle, Select, issuesToErrors } from "@/components/admin/ui";
import { EmptyState, TableSkeleton, errorText, useFeedback } from "@/components/admin/feedback";
import { OrderBadge } from "@/components/admin/orderStatus";
import { cn } from "@/lib/cn";

type Coupon = { id: string; code: string; description: string | null; type: "PERCENT" | "FIXED"; value: number; minSubtotalCents: number; firstPurchaseOnly: boolean; stacksWithProgressive: boolean; maxRedemptions: number | null; redemptionsCount: number; active: boolean; startsAt: string | null; endsAt: string | null };
type CouponForm = { code: string; description: string; type: "PERCENT" | "FIXED"; value: number; minSubtotalCents: number; firstPurchaseOnly: boolean; stacksWithProgressive: boolean; maxRedemptions: number | null; active: boolean; startsAt: string; endsAt: string };
type Redemption = { id: string; email: string; createdAt: string; order: { id: string; number: number; status: OrderStatus; totalCents: number; couponDiscountCents: number } };
const EMPTY: CouponForm = { code: "", description: "", type: "PERCENT", value: 10, minSubtotalCents: 0, firstPurchaseOnly: false, stacksWithProgressive: true, maxRedemptions: null, active: true, startsAt: "", endsAt: "" };
const fmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

/** Situação do cupom agora (o que a cliente vai encontrar no checkout). */
function statusOf(c: Coupon): { label: string; tone: string } {
  const now = Date.now();
  if (!c.active) return { label: "Inativo", tone: "bg-linha text-texto-2" };
  if (c.endsAt && new Date(c.endsAt).getTime() < now) return { label: "Expirado", tone: "bg-linha text-texto-2" };
  if (c.maxRedemptions !== null && c.redemptionsCount >= c.maxRedemptions) return { label: "Esgotado", tone: "bg-areia/70 text-texto-3" };
  if (c.startsAt && new Date(c.startsAt).getTime() > now) return { label: "Agendado", tone: "bg-salvia text-oliva-escuro" };
  return { label: "Ativo", tone: "bg-oliva/15 text-oliva-escuro" };
}

export default function CuponsPage() {
  const { apiFetch } = useAuth();
  const { toast, confirm } = useFeedback();
  const [list, setList] = useState<Coupon[] | null>(null);
  const [editing, setEditing] = useState<string | "novo" | null>(null);
  const [form, setForm] = useState<CouponForm>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [usage, setUsage] = useState<{ id: string; rows: Redemption[] | null } | null>(null);

  const load = useCallback(async () => {
    try {
      setList(await apiFetch<Coupon[]>("/admin/coupons"));
    } catch (err) {
      toast(errorText(err), "erro");
    }
  }, [apiFetch, toast]);
  useEffect(() => void load(), [load]);

  const toForm = (c: Coupon): CouponForm => ({ code: c.code, type: c.type, value: c.value, minSubtotalCents: c.minSubtotalCents, firstPurchaseOnly: c.firstPurchaseOnly, stacksWithProgressive: c.stacksWithProgressive, maxRedemptions: c.maxRedemptions, active: c.active, description: c.description ?? "", startsAt: c.startsAt?.slice(0, 10) ?? "", endsAt: c.endsAt?.slice(0, 10) ?? "" });
  const edit = (c?: Coupon) => {
    setErrors({});
    setEditing(c ? c.id : "novo");
    setForm(c ? toForm(c) : EMPTY);
  };
  const payload = (f: CouponForm) => adminCouponSchema.safeParse({ ...f, description: f.description || null, startsAt: f.startsAt || null, endsAt: f.endsAt || null });

  async function save(e: FormEvent) {
    e.preventDefault();
    const parsed = payload(form);
    if (!parsed.success) {
      setErrors(issuesToErrors(parsed.error.issues));
      return toast("Confira os campos destacados.", "erro");
    }
    setSaving(true);
    try {
      if (editing === "novo") await apiFetch("/admin/coupons", { method: "POST", body: JSON.stringify(parsed.data) });
      else await apiFetch(`/admin/coupons/${editing}`, { method: "PUT", body: JSON.stringify(parsed.data) });
      setEditing(null);
      toast(`Cupom ${parsed.data.code} salvo. Já vale no checkout.`);
      await load();
    } catch (err) {
      toast(errorText(err), "erro");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(c: Coupon) {
    const parsed = payload({ ...toForm(c), active: !c.active });
    if (!parsed.success) return toast("Abra o cupom e corrija os dados antes.", "erro");
    try {
      await apiFetch(`/admin/coupons/${c.id}`, { method: "PUT", body: JSON.stringify(parsed.data) });
      toast(c.active ? `${c.code} desativado.` : `${c.code} ativado.`);
      await load();
    } catch (err) {
      toast(errorText(err), "erro");
    }
  }

  async function remove(c: Coupon) {
    if (!(await confirm({ title: `Excluir o cupom ${c.code}?`, text: "Ele deixa de existir. Não dá para desfazer.", confirm: "Excluir", danger: true }))) return;
    try {
      await apiFetch(`/admin/coupons/${c.id}`, { method: "DELETE" });
      toast(`Cupom ${c.code} excluído.`);
      await load();
    } catch (err) {
      toast(errorText(err), "erro");
    }
  }

  async function showUsage(c: Coupon) {
    if (usage?.id === c.id) return setUsage(null);
    setUsage({ id: c.id, rows: null });
    try {
      setUsage({ id: c.id, rows: await apiFetch<Redemption[]>(`/admin/coupons/${c.id}/redemptions`) });
    } catch (err) {
      toast(errorText(err), "erro");
      setUsage(null);
    }
  }

  const visible = (list ?? []).filter((c) => !q.trim() || c.code.includes(q.trim().toUpperCase()) || (c.description ?? "").toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <>
      <PageTitle actions={!editing && <button type="button" onClick={() => edit()} className="btn-primary h-12 px-6">Novo cupom</button>}>Cupons</PageTitle>
      {editing ? (
        <Card title={editing === "novo" ? "Novo cupom" : form.code}>
          <form onSubmit={save} noValidate className="grid gap-4 md:grid-cols-3">
            <Input label="Código" value={form.code} error={errors.code} hint="Letras e números, sem espaço" onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s/g, "") })} />
            <Select label="Tipo" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "PERCENT" | "FIXED" })}>
              <option value="PERCENT">Percentual (%)</option>
              <option value="FIXED">Valor fixo (R$)</option>
            </Select>
            {form.type === "PERCENT" ? (
              <Input label="Desconto (%)" type="number" min={1} max={90} value={form.value} error={errors.value} onChange={(e) => setForm({ ...form, value: Math.trunc(Number(e.target.value)) })} />
            ) : (
              <MoneyInput label="Desconto (R$)" cents={form.value} error={errors.value} onChange={(c) => setForm({ ...form, value: c ?? 0 })} />
            )}
            <Input label="Descrição (só para a equipe)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} wrapClassName="md:col-span-3" />
            <MoneyInput label="Compra mínima (R$)" cents={form.minSubtotalCents} onChange={(c) => setForm({ ...form, minSubtotalCents: c ?? 0 })} />
            <Input label="Limite de usos" type="number" min={1} placeholder="sem limite" value={form.maxRedemptions ?? ""} error={errors.maxRedemptions} onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value ? Math.trunc(Number(e.target.value)) : null })} />
            <div />
            <Input label="Válido a partir de" type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
            <Input label="Válido até" type="date" value={form.endsAt} error={errors.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
            <div />
            <Check label="Ativo" checked={form.active} onChange={(v) => setForm({ ...form, active: v })} />
            <Check label="Só na 1ª compra" checked={form.firstPurchaseOnly} onChange={(v) => setForm({ ...form, firstPurchaseOnly: v })} />
            <Check label="Acumula com o desconto progressivo" checked={form.stacksWithProgressive} onChange={(v) => setForm({ ...form, stacksWithProgressive: v })} />
            <div className="flex gap-3 md:col-span-3">
              <button type="submit" disabled={saving} className="btn-primary h-11 px-6">
                {saving ? "Salvando…" : "Salvar"}
              </button>
              <button type="button" onClick={() => setEditing(null)} className="btn-secondary h-11 px-6">
                Cancelar
              </button>
            </div>
          </form>
        </Card>
      ) : !list ? (
        <TableSkeleton rows={5} cols={5} />
      ) : list.length === 0 ? (
        <EmptyState title="Nenhum cupom ainda" text="Crie cupons de % ou valor fixo, com validade, limite de usos e compra mínima." action={<button type="button" onClick={() => edit()} className="btn-primary h-11">Novo cupom</button>} />
      ) : (
        <>
          <input aria-label="Buscar cupom" placeholder="Buscar código ou descrição" className="input mb-4 h-11 max-w-md bg-white" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="overflow-x-auto border border-linha bg-white">
            <table className="w-full min-w-[820px] text-left text-[14px]">
              <thead className="border-b border-linha text-[12px] uppercase tracking-[0.08em] text-texto-2">
                <tr>
                  <th className="px-4 py-3 font-normal">Código</th>
                  <th className="px-3 font-normal">Desconto</th>
                  <th className="px-3 font-normal">Regras</th>
                  <th className="px-3 font-normal">Validade</th>
                  <th className="px-3 font-normal">Usos</th>
                  <th className="px-3 font-normal">Situação</th>
                  <th className="px-4 text-right font-normal">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => {
                  const st = statusOf(c);
                  return (
                    <Fragment key={c.id}>
                      <tr className="border-b border-linha last:border-0 hover:bg-offwhite/60">
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => edit(c)} className="font-mono font-normal underline-offset-4 hover:underline">
                            {c.code}
                          </button>
                          <span className="block text-[12px] text-texto-2">{c.description}</span>
                        </td>
                        <td className="px-3">{c.type === "PERCENT" ? `${c.value}%` : formatBRL(c.value)}</td>
                        <td className="px-3 text-[13px] text-texto-2">{[c.firstPurchaseOnly && "1ª compra", c.stacksWithProgressive ? "acumula" : "não acumula", c.minSubtotalCents > 0 && `mín. ${formatBRL(c.minSubtotalCents, { compact: true })}`].filter(Boolean).join(" · ")}</td>
                        <td className="px-3 text-[13px] text-texto-2">{c.startsAt || c.endsAt ? `${c.startsAt ? fmt.format(new Date(c.startsAt)) : "…"} – ${c.endsAt ? fmt.format(new Date(c.endsAt)) : "…"}` : "sem prazo"}</td>
                        <td className="px-3 tabular-nums">
                          {c.redemptionsCount}
                          {c.maxRedemptions ? ` / ${c.maxRedemptions}` : ""}
                        </td>
                        <td className="px-3">
                          <span className={cn("label-sm px-2 py-1 text-[10px]", st.tone)}>{st.label}</span>
                        </td>
                        <td className="px-4 text-right">
                          <div className="flex justify-end gap-3 text-[13px]">
                            <button type="button" className="underline hover:text-oliva" onClick={() => void toggle(c)}>
                              {c.active ? "Desativar" : "Ativar"}
                            </button>
                            {c.redemptionsCount > 0 ? (
                              <button type="button" aria-expanded={usage?.id === c.id} className="underline hover:text-oliva" onClick={() => void showUsage(c)}>
                                Usos
                              </button>
                            ) : (
                              <button type="button" className="text-texto-2 underline hover:text-erro" onClick={() => void remove(c)}>
                                Excluir
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {usage?.id === c.id && (
                        <tr className="border-b border-linha bg-offwhite/50">
                          <td colSpan={7} className="px-4 py-3">
                            {!usage.rows ? (
                              <div className="skeleton h-10" />
                            ) : (
                              <ul className="space-y-1.5 text-[13px]">
                                {usage.rows.map((r) => (
                                  <li key={r.id} className="flex flex-wrap items-center gap-3">
                                    <span className="tabular-nums text-texto-2">{fmt.format(new Date(r.createdAt))}</span>
                                    <Link href={`/admin/pedidos/${r.order.id}`} className="underline">
                                      Pedido #{r.order.number}
                                    </Link>
                                    <span>{r.email}</span>
                                    <span className="text-texto-2">desconto {formatBRL(r.order.couponDiscountCents)}</span>
                                    <OrderBadge status={r.order.status} />
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
