"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { API_URL } from "@/lib/site";
import { PageTitle, downloadCsv } from "@/components/admin/ui";

type Sub = { id: string; email: string; source: string; consentAt: string };

export default function NewsletterPage() {
  const { apiFetch, session } = useAuth();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; items: Sub[]; pageSize: number } | null>(null);
  useEffect(() => void apiFetch<{ total: number; items: Sub[]; pageSize: number }>(`/admin/newsletter?pagina=${page}`).then(setData), [apiFetch, page]);
  const exportCsv = () =>
    downloadCsv(async (path) => (await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${session!.access_token}` } })).text(), "/admin/newsletter.csv", `newsletter-movalev-${new Date().toISOString().slice(0, 10)}.csv`);

  return (
    <>
      <PageTitle actions={<button type="button" onClick={() => void exportCsv()} className="btn-secondary h-11 px-5">Exportar CSV</button>}>Newsletter</PageTitle>
      <p className="mb-4 text-[14px] text-texto-2">{data ? `${data.total} assinantes ativos` : "Carregando…"}</p>
      <div className="overflow-x-auto border border-linha bg-white">
        <table className="w-full min-w-[520px] text-left text-[14px]">
          <thead className="border-b border-linha bg-bege/50 text-[12px] uppercase tracking-[0.08em] text-texto-2"><tr><th className="p-3 font-normal">E-mail</th><th className="p-3 font-normal">Origem</th><th className="p-3 font-normal">Consentimento</th></tr></thead>
          <tbody>
            {data?.items.map((s) => (
              <tr key={s.id} className="border-b border-linha last:border-0"><td className="p-3">{s.email}</td><td className="p-3">{s.source}</td><td className="p-3">{new Date(s.consentAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td></tr>
            ))}
          </tbody>
        </table>
        {data?.items.length === 0 && <p className="p-6 text-texto-2">Nenhum assinante ainda.</p>}
      </div>
      {data && data.total > data.pageSize && (
        <div className="mt-4 flex gap-3">
          <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)} className="btn-secondary h-10 px-4 disabled:opacity-40">Anterior</button>
          <button type="button" disabled={page * data.pageSize >= data.total} onClick={() => setPage(page + 1)} className="btn-secondary h-10 px-4 disabled:opacity-40">Próxima</button>
        </div>
      )}
    </>
  );
}
