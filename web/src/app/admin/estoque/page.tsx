"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { MANUAL_STOCK_TYPES, STOCK_MOVEMENT_LABEL, adminStockAdjustSchema, type StockMovementType } from "@movalev/shared";
import { PageTitle } from "@/components/admin/ui";
import { EmptyState, Pagination, TableSkeleton, errorText, useFeedback } from "@/components/admin/feedback";
import { StockTabs, MovementList } from "./shared";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";

type Row = {
  id: string;
  sku: string;
  size: string;
  stock: number;
  productId: string;
  productName: string;
  productStatus: string;
  color: { name: string; hex: string };
  level: "esgotado" | "baixo" | "ok";
  lastMovement: { type: StockMovementType; delta: number; createdAt: string } | null;
};
type StockResponse = { total: number; page: number; perPage: number; threshold: number; summary: { variants: number; units: number; soldOut: number; low: number }; items: Row[] };
type Meta = { categories: { id: string; name: string }[] };

const LEVEL_TONE = { esgotado: "text-erro", baixo: "text-[#8a5a12]", ok: "text-texto" } as const;
const fmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

export default function EstoquePage() {
  const { apiFetch } = useAuth();
  const { toast } = useFeedback();
  const [data, setData] = useState<StockResponse | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState({ q: "", status: "", categoryId: "", page: 1 });
  const [adjusting, setAdjusting] = useState<Row | null>(null);
  const [history, setHistory] = useState<string | null>(null);
  const [threshold, setThreshold] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(f.page), perPage: "50" });
    if (f.q.trim()) qs.set("q", f.q.trim());
    if (f.status) qs.set("status", f.status);
    if (f.categoryId) qs.set("categoryId", f.categoryId);
    try {
      const d = await apiFetch<StockResponse>(`/admin/stock?${qs}`);
      setData(d);
      setThreshold((t) => t ?? d.threshold);
    } catch (err) {
      toast(errorText(err), "erro");
    } finally {
      setLoading(false);
    }
  }, [apiFetch, f, toast]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), f.q ? 300 : 0);
    return () => window.clearTimeout(t);
  }, [load, f.q]);
  useEffect(() => {
    apiFetch<Meta>("/admin/meta").then(setMeta).catch(() => undefined);
  }, [apiFetch]);

  const setFilter = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch, page: patch.page ?? 1 }));

  async function saveThreshold() {
    if (threshold === null || !Number.isInteger(threshold) || threshold < 0) return toast("Use um número inteiro, 0 ou mais.", "erro");
    try {
      await apiFetch("/admin/settings/stock", { method: "PUT", body: JSON.stringify({ lowStockThreshold: threshold }) });
      toast(`Alerta de estoque baixo: até ${threshold} un.`);
      await load();
    } catch (err) {
      toast(errorText(err), "erro");
    }
  }

  const s = data?.summary;
  return (
    <>
      <PageTitle>Estoque</PageTitle>
      <StockTabs active="visao" />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Variantes à venda" value={s?.variants} />
        <SummaryCard label="Peças em estoque" value={s?.units} />
        <SummaryCard label="Esgotadas" value={s?.soldOut} tone="erro" onClick={() => setFilter({ status: "esgotado" })} active={f.status === "esgotado"} />
        <SummaryCard label={`Estoque baixo (≤ ${data?.threshold ?? "…"})`} value={s?.low} tone="alerta" onClick={() => setFilter({ status: "baixo" })} active={f.status === "baixo"} />
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_200px_auto]">
        <input aria-label="Buscar" placeholder="Buscar por produto, cor ou SKU" className="input h-11 bg-white" value={f.q} onChange={(e) => setFilter({ q: e.target.value })} />
        <select aria-label="Categoria" className="input h-11 bg-white" value={f.categoryId} onChange={(e) => setFilter({ categoryId: e.target.value })}>
          <option value="">Todas as categorias</option>
          {meta?.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <form
          className="flex items-center gap-2 text-[14px]"
          onSubmit={(e) => {
            e.preventDefault();
            void saveThreshold();
          }}
        >
          <label htmlFor="limite" className="whitespace-nowrap text-texto-2">
            Alerta até
          </label>
          <input id="limite" type="number" min={0} step={1} className="input h-11 w-20 bg-white" value={threshold ?? ""} onChange={(e) => setThreshold(e.target.value === "" ? null : Math.trunc(Number(e.target.value)))} />
          <span className="text-texto-2">un.</span>
          <button type="submit" className="btn-secondary h-11 px-4">
            Salvar
          </button>
        </form>
      </div>
      <div className="mb-5 flex flex-wrap gap-2 text-[14px]">
        {[
          { k: "", label: "Todas" },
          { k: "esgotado", label: "Esgotadas" },
          { k: "baixo", label: "Estoque baixo" },
          { k: "ok", label: "Com estoque" },
        ].map((o) => (
          <button key={o.k} type="button" aria-pressed={f.status === o.k} onClick={() => setFilter({ status: o.k })} className={cn("h-9 border px-3", f.status === o.k ? "border-preto bg-preto text-offwhite" : "border-linha-forte bg-white hover:border-preto")}>
            {o.label}
          </button>
        ))}
      </div>

      {loading && !data ? (
        <TableSkeleton rows={10} cols={5} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="Nenhuma variante aqui" text={f.status || f.q ? "Ajuste a busca ou os filtros." : "Cadastre variantes na tela de cada produto."} />
      ) : (
        <div className={cn("overflow-x-auto border border-linha bg-white transition-opacity", loading && "opacity-60")} aria-busy={loading}>
          <table className="w-full min-w-[820px] text-[14px]">
            <thead className="border-b border-linha text-left text-[12px] uppercase tracking-[0.08em] text-texto-2">
              <tr>
                <th className="px-4 py-3 font-normal">Produto</th>
                <th className="px-3 font-normal">Variante</th>
                <th className="px-3 font-normal">SKU</th>
                <th className="px-3 text-right font-normal">Estoque</th>
                <th className="px-3 font-normal">Última movimentação</th>
                <th className="px-4 text-right font-normal">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((v) => (
                <FragmentRow key={v.id} v={v} open={history === v.id} onAdjust={() => setAdjusting(v)} onHistory={() => setHistory(history === v.id ? null : v.id)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} perPage={data.perPage} total={data.total} onPage={(page) => setFilter({ page })} />}

      {adjusting && (
        <AdjustDialog
          row={adjusting}
          onClose={() => setAdjusting(null)}
          onDone={async () => {
            setAdjusting(null);
            await load();
          }}
        />
      )}
    </>
  );
}

function FragmentRow({ v, open, onAdjust, onHistory }: { v: Row; open: boolean; onAdjust: () => void; onHistory: () => void }) {
  return (
    <>
      <tr className="border-b border-linha last:border-b-0 hover:bg-offwhite/60">
        <td className="px-4 py-2.5">
          <Link href={`/admin/produtos/${v.productId}`} className="hover:underline">
            {v.productName}
          </Link>
          {v.productStatus !== "ACTIVE" && <span className="label-sm ml-2 bg-bege px-1.5 py-0.5 text-[9px]">{v.productStatus === "DRAFT" ? "Rascunho" : "Oculto"}</span>}
        </td>
        <td className="px-3">
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full border border-linha-forte" style={{ background: v.color.hex }} />
            {v.color.name} · {v.size}
          </span>
        </td>
        <td className="px-3 font-mono text-[12px] text-texto-2">{v.sku}</td>
        <td className={cn("px-3 text-right text-[16px] tabular-nums", LEVEL_TONE[v.level])}>
          {v.stock}
          {v.level !== "ok" && <span className="label-sm ml-2 text-[9px]">{v.level === "esgotado" ? "esgotado" : "baixo"}</span>}
        </td>
        <td className="px-3 text-[13px] text-texto-2">
          {v.lastMovement ? (
            <>
              {STOCK_MOVEMENT_LABEL[v.lastMovement.type]} ({v.lastMovement.delta > 0 ? "+" : ""}
              {v.lastMovement.delta}) · {fmt.format(new Date(v.lastMovement.createdAt))}
            </>
          ) : (
            "—"
          )}
        </td>
        <td className="px-4 text-right">
          <div className="flex justify-end gap-3 text-[13px]">
            <button type="button" className="underline hover:text-oliva" onClick={onAdjust}>
              Ajustar
            </button>
            <button type="button" aria-expanded={open} className="underline hover:text-oliva" onClick={onHistory}>
              Histórico
            </button>
          </div>
        </td>
      </tr>
      {open && (
        <tr className="border-b border-linha bg-offwhite/50">
          <td colSpan={6} className="px-4 py-4">
            <MovementList variantId={v.id} compact />
          </td>
        </tr>
      )}
    </>
  );
}

function SummaryCard({ label, value, tone, onClick, active }: { label: string; value?: number; tone?: "erro" | "alerta"; onClick?: () => void; active?: boolean }) {
  const content = (
    <>
      <p className="label-sm text-texto-2">{label}</p>
      <p className={cn("mt-2 font-display text-[40px] leading-none tabular-nums", tone === "erro" && value ? "text-erro" : tone === "alerta" && value ? "text-[#8a5a12]" : "")}>{value ?? "…"}</p>
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} aria-pressed={active} className={cn("press border bg-white p-5 text-left", active ? "border-preto" : "border-linha hover:border-linha-forte")}>
      {content}
    </button>
  ) : (
    <div className="border border-linha bg-white p-5">{content}</div>
  );
}

const TYPE_HELP: Record<(typeof MANUAL_STOCK_TYPES)[number], string> = {
  ENTRADA: "Chegou mercadoria: soma ao estoque.",
  DEVOLUCAO: "Peça devolvida em condições de venda: soma ao estoque.",
  SAIDA: "Perda, avaria, brinde ou uso interno: tira do estoque.",
  AJUSTE: "Contagem física: define o estoque exato.",
};

function AdjustDialog({ row, onClose, onDone }: { row: Row; onClose: () => void; onDone: () => Promise<void> }) {
  const { apiFetch } = useAuth();
  const { toast } = useFeedback();
  const ref = useRef<HTMLDialogElement>(null);
  const [type, setType] = useState<(typeof MANUAL_STOCK_TYPES)[number]>("ENTRADA");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => ref.current?.showModal(), []);

  const n = qty === "" ? NaN : Number(qty);
  const target = Number.isFinite(n) ? (type === "AJUSTE" ? n : type === "SAIDA" ? row.stock - n : row.stock + n) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = adminStockAdjustSchema.safeParse({ variantId: row.id, type, quantity: Number.isFinite(n) ? n : -1, note: note || undefined, expectedStock: row.stock });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    if (target !== null && target < 0) return setErrors({ quantity: `Só há ${row.stock} em estoque.` });
    setErrors({});
    setBusy(true);
    try {
      const r = await apiFetch<{ stock: number }>("/admin/stock/adjust", { method: "POST", body: JSON.stringify(parsed.data) });
      toast(`${row.sku}: estoque agora é ${r.stock}.`);
      await onDone();
    } catch (err) {
      toast(errorText(err), "erro");
      setBusy(false);
    }
  }

  return (
    <dialog ref={ref} onCancel={(e) => (e.preventDefault(), onClose())} aria-labelledby="ajuste-titulo" className="w-[min(480px,calc(100vw-2rem))] bg-offwhite p-0 text-texto backdrop:bg-preto/50">
      <form onSubmit={submit} className="p-6" noValidate>
        <h2 id="ajuste-titulo" className="font-display text-[28px] leading-tight">
          Ajustar estoque
        </h2>
        <p className="mt-1 text-[14px] font-light text-texto-2">
          {row.productName} · {row.color.name} · {row.size} · <span className="font-mono">{row.sku}</span>
        </p>
        <fieldset className="mt-5">
          <legend className="mb-2 text-[13px] text-texto-2">Motivo</legend>
          <div className="grid grid-cols-2 gap-2">
            {MANUAL_STOCK_TYPES.map((t) => (
              <label key={t} className={cn("flex min-h-touch cursor-pointer items-center gap-2 border px-3 text-[14px]", type === t ? "border-preto bg-white" : "border-linha-forte")}>
                <input type="radio" name="tipo" className="accent-oliva" checked={type === t} onChange={() => setType(t)} />
                {STOCK_MOVEMENT_LABEL[t]}
              </label>
            ))}
          </div>
          <p className="mt-2 text-[13px] font-light text-texto-3">{TYPE_HELP[type]}</p>
        </fieldset>
        <div className="mt-4 grid grid-cols-[1fr_auto] items-end gap-4">
          <div>
            <label htmlFor="qtd" className="mb-1.5 block text-[13px] text-texto-2">
              {type === "AJUSTE" ? "Estoque contado" : "Quantidade"}
            </label>
            <input id="qtd" type="number" inputMode="numeric" min={0} step={1} className={cn("input h-12 bg-white", errors.quantity && "border-erro")} value={qty} onChange={(e) => setQty(e.target.value.replace(/[^\d]/g, ""))} autoFocus />
            {errors.quantity && <p className="mt-1 text-[12px] text-erro">{errors.quantity}</p>}
          </div>
          <p className="pb-3 text-[15px] tabular-nums" aria-live="polite">
            {row.stock} → <strong className={cn("font-normal", target !== null && target < 0 ? "text-erro" : "text-oliva-escuro")}>{target ?? "…"}</strong>
          </p>
        </div>
        <div className="mt-4">
          <label htmlFor="obs" className="mb-1.5 block text-[13px] text-texto-2">
            Observação {type === "SAIDA" || type === "AJUSTE" ? "(obrigatória)" : "(opcional)"}
          </label>
          <input id="obs" className={cn("input h-12 bg-white", errors.note && "border-erro")} maxLength={200} placeholder={type === "ENTRADA" ? "Ex.: NF 1234 do fornecedor" : type === "SAIDA" ? "Ex.: peça com defeito na costura" : "Ex.: inventário de novembro"} value={note} onChange={(e) => setNote(e.target.value)} />
          {errors.note && <p className="mt-1 text-[12px] text-erro">{errors.note}</p>}
        </div>
        <div className="mt-7 flex justify-end gap-3">
          <button type="button" className="btn-secondary h-11 px-6" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary h-11 px-6" disabled={busy}>
            {busy ? "Salvando…" : "Salvar ajuste"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
