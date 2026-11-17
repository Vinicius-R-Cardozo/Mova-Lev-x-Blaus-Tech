"use client";
import { useEffect, useState } from "react";
import { UFS, adminShippingSchema, adminTiersSchema, formatBRL } from "@movalev/shared";
import { useAuth } from "@/lib/auth";
import { Card, Check, Input, MoneyInput, Notice, PageTitle } from "@/components/admin/ui";

type Tier = { minItems: number; percent: number };
type Region = { name: string; ufs: string[]; standardCents: number; standardDays: number; expressCents: number | null; expressDays: number | null; active: boolean };
type Shipping = { freeShippingThresholdCents: number; pickup: { enabled: boolean; label: string; address: string; days: number }; regions: Region[] };

export default function RegrasPage() {
  const { apiFetch } = useAuth();
  const [tiers, setTiers] = useState<Tier[] | null>(null);
  const [ship, setShip] = useState<Shipping | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "erro"; text: string } | null>(null);

  useEffect(() => {
    apiFetch<{ tiers: Tier[] }>("/admin/settings/progressive").then((r) => setTiers(r.tiers));
    apiFetch<Shipping>("/admin/settings/shipping").then(setShip);
  }, [apiFetch]);

  async function saveTiers() {
    const parsed = adminTiersSchema.safeParse({ tiers });
    if (!parsed.success) return setNotice({ kind: "erro", text: parsed.error.issues[0]?.message ?? "Faixas inválidas." });
    try {
      await apiFetch("/admin/settings/progressive", { method: "PUT", body: JSON.stringify(parsed.data) });
      setNotice({ kind: "ok", text: "Desconto progressivo salvo. A sacola e o checkout já usam as novas faixas." });
    } catch (err) {
      setNotice({ kind: "erro", text: err instanceof Error ? err.message : "Erro." });
    }
  }

  async function saveShipping() {
    const parsed = adminShippingSchema.safeParse(ship);
    if (!parsed.success) return setNotice({ kind: "erro", text: parsed.error.issues[0]?.message ?? "Regras de frete inválidas." });
    try {
      await apiFetch("/admin/settings/shipping", { method: "PUT", body: JSON.stringify(parsed.data) });
      setNotice({ kind: "ok", text: "Regras de frete salvas." });
    } catch (err) {
      setNotice({ kind: "erro", text: err instanceof Error ? err.message : "Erro." });
    }
  }

  if (!tiers || !ship) return <p role="status">Carregando…</p>;
  const updRegion = (i: number, patch: Partial<Region>) => setShip({ ...ship, regions: ship.regions.map((r, j) => (j === i ? { ...r, ...patch } : r)) });

  return (
    <>
      <PageTitle>Desconto e frete</PageTitle>
      {notice && <div className="mb-4"><Notice kind={notice.kind}>{notice.text}</Notice></div>}

      <Card title="Desconto progressivo" actions={<button type="button" onClick={() => void saveTiers()} className="btn-dark h-11 px-6">Salvar faixas</button>}>
        <p className="mb-4 text-[13px] text-texto-2">As faixas precisam crescer em peças e em desconto. A mensagem da barra é gerada a partir delas.</p>
        <ul className="space-y-2">
          {tiers.map((t, i) => (
            <li key={i} className="flex flex-wrap items-end gap-3">
              <Input label="A partir de (peças)" type="number" min={2} value={t.minItems} onChange={(e) => setTiers(tiers.map((x, j) => (j === i ? { ...x, minItems: Number(e.target.value) } : x)))} wrapClassName="w-40" />
              <Input label="Desconto (%)" type="number" min={1} max={60} value={t.percent} onChange={(e) => setTiers(tiers.map((x, j) => (j === i ? { ...x, percent: Number(e.target.value) } : x)))} wrapClassName="w-32" />
              <button type="button" onClick={() => setTiers(tiers.filter((_, j) => j !== i))} className="h-11 text-[14px] text-erro underline">Remover</button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setTiers([...tiers, { minItems: (tiers.at(-1)?.minItems ?? 1) + 1, percent: (tiers.at(-1)?.percent ?? 5) + 5 }])} className="mt-3 text-[14px] underline">+ Adicionar faixa</button>
      </Card>

      <Card title="Frete" className="mt-4" actions={<button type="button" onClick={() => void saveShipping()} className="btn-dark h-11 px-6">Salvar frete</button>}>
        <div className="grid gap-4 md:grid-cols-3">
          <MoneyInput label="Frete grátis a partir de (R$, já com desconto)" cents={ship.freeShippingThresholdCents} onChange={(c) => setShip({ ...ship, freeShippingThresholdCents: c ?? 0 })} />
        </div>
        <h3 className="mt-6 text-[15px] font-normal">Retirar na loja</h3>
        <div className="mt-2 grid gap-4 md:grid-cols-[auto_1fr_2fr_120px] md:items-end">
          <Check label="Oferecer" checked={ship.pickup.enabled} onChange={(v) => setShip({ ...ship, pickup: { ...ship.pickup, enabled: v } })} />
          <Input label="Nome da opção" value={ship.pickup.label} onChange={(e) => setShip({ ...ship, pickup: { ...ship.pickup, label: e.target.value } })} />
          <Input label="Endereço da loja" value={ship.pickup.address} onChange={(e) => setShip({ ...ship, pickup: { ...ship.pickup, address: e.target.value } })} />
          <Input label="Prazo (dias úteis)" type="number" min={0} value={ship.pickup.days} onChange={(e) => setShip({ ...ship, pickup: { ...ship.pickup, days: Number(e.target.value) } })} />
        </div>
        <h3 className="mt-6 text-[15px] font-normal">Regiões (valor fixo e prazo por UF)</h3>
        <div className="mt-2 space-y-4">
          {ship.regions.map((r, i) => (
            <fieldset key={i} className="border border-linha p-4">
              <legend className="px-1 text-[14px]">{r.name || "Nova região"}</legend>
              <div className="grid gap-3 md:grid-cols-6 md:items-end">
                <Input label="Nome" value={r.name} onChange={(e) => updRegion(i, { name: e.target.value })} wrapClassName="md:col-span-2" />
                <MoneyInput label="Padrão (R$)" cents={r.standardCents} onChange={(c) => updRegion(i, { standardCents: c ?? 0 })} />
                <Input label="Padrão (dias)" type="number" min={1} value={r.standardDays} onChange={(e) => updRegion(i, { standardDays: Number(e.target.value) })} />
                <MoneyInput label="Expressa (R$)" nullable cents={r.expressCents} onChange={(c) => updRegion(i, { expressCents: c })} />
                <Input label="Expressa (dias)" type="number" min={1} value={r.expressDays ?? ""} onChange={(e) => updRegion(i, { expressDays: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label={`UFs de ${r.name}`}>
                {UFS.map((uf) => {
                  const on = r.ufs.includes(uf);
                  return (
                    <button key={uf} type="button" aria-pressed={on} onClick={() => updRegion(i, { ufs: on ? r.ufs.filter((x) => x !== uf) : [...r.ufs, uf] })} className={`h-8 w-10 border text-[12px] ${on ? "border-preto bg-preto text-offwhite" : "border-linha-forte"}`}>
                      {uf}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex gap-4">
                <Check label="Ativa" checked={r.active} onChange={(v) => updRegion(i, { active: v })} />
                <button type="button" onClick={() => setShip({ ...ship, regions: ship.regions.filter((_, j) => j !== i) })} className="text-[14px] text-erro underline">Remover região</button>
              </div>
            </fieldset>
          ))}
        </div>
        <button type="button" onClick={() => setShip({ ...ship, regions: [...ship.regions, { name: "", ufs: [], standardCents: 1990, standardDays: 7, expressCents: null, expressDays: null, active: true }] })} className="mt-3 text-[14px] underline">+ Adicionar região</button>
        <p className="mt-4 text-[13px] text-texto-2">Hoje: frete grátis acima de {formatBRL(ship.freeShippingThresholdCents, { compact: true })} no envio padrão; expressa sempre cobrada.</p>
      </Card>
    </>
  );
}
