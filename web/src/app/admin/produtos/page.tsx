"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BADGE_LABEL, formatBRL, type Badge } from "@movalev/shared";
import { useAuth } from "@/lib/auth";
import { PageTitle } from "@/components/admin/ui";
import { cn } from "@/lib/cn";

type Row = { id: string; name: string; slug: string; status: "ACTIVE" | "DRAFT" | "ARCHIVED"; priceCents: number; badge: Badge | null; stock: number; soldOutVariants: number; colors: { name: string; hex: string }[]; photos: number };
const STATUS = { ACTIVE: "Ativo", DRAFT: "Rascunho", ARCHIVED: "Arquivado" } as const;

export default function ProdutosPage() {
  const { apiFetch } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      const qs = new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}) });
      apiFetch<Row[]>(`/admin/products?${qs}`).then(setRows).catch(() => setRows([]));
    }, 250);
    return () => clearTimeout(t);
  }, [apiFetch, q, status]);

  return (
    <>
      <PageTitle actions={<Link href="/admin/produtos/novo" className="btn-primary h-11 px-6">Novo produto</Link>}>Produtos</PageTitle>
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="sr-only" htmlFor="busca-prod">Buscar produto</label>
        <input id="busca-prod" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar pelo nome" className="h-11 w-64 border border-linha-forte bg-white px-3 text-[15px]" />
        <label className="sr-only" htmlFor="status-prod">Status</label>
        <select id="status-prod" value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 border border-linha-forte bg-white px-3 text-[15px]">
          <option value="">Todos os status</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto border border-linha bg-white">
        <table className="w-full min-w-[760px] text-left text-[14px]">
          <thead className="border-b border-linha bg-bege/50 text-[12px] uppercase tracking-[0.08em] text-texto-2">
            <tr><th className="p-3 font-normal">Produto</th><th className="p-3 font-normal">Cores</th><th className="p-3 font-normal">Preço</th><th className="p-3 font-normal">Estoque</th><th className="p-3 font-normal">Fotos</th><th className="p-3 font-normal">Status</th></tr>
          </thead>
          <tbody>
            {rows?.map((r) => (
              <tr key={r.id} className="border-b border-linha last:border-0 hover:bg-bege/30">
                <td className="p-3">
                  <Link href={`/admin/produtos/${r.id}`} className="font-normal underline-offset-4 hover:underline">{r.name}</Link>
                  {r.badge && <span className="label-sm ml-2 bg-bege px-1.5 py-0.5 text-[9px]">{BADGE_LABEL[r.badge]}</span>}
                </td>
                <td className="p-3"><span className="flex gap-1">{r.colors.map((c) => <span key={c.name} title={c.name} className="h-4 w-4 rounded-full border border-linha-forte" style={{ background: c.hex }} />)}</span></td>
                <td className="p-3">{formatBRL(r.priceCents, { compact: true })}</td>
                <td className={cn("p-3", r.stock === 0 && "text-erro")}>{r.stock} un.{r.soldOutVariants > 0 && <span className="text-texto-2"> · {r.soldOutVariants} esgotadas</span>}</td>
                <td className="p-3">{r.photos || <span className="text-texto-2">placeholder</span>}</td>
                <td className="p-3">{STATUS[r.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows?.length === 0 && <p className="p-6 text-texto-2">Nenhum produto.</p>}
        {!rows && <p className="p-6" role="status">Carregando…</p>}
      </div>
    </>
  );
}
