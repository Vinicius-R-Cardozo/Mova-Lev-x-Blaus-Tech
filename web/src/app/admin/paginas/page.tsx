"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { PageDTO } from "@movalev/shared";
import { useAuth } from "@/lib/auth";
import { PageTitle } from "@/components/admin/ui";
import { pagePath } from "@/components/admin/pagePath";
import { EmptyState, TableSkeleton, errorText, useFeedback } from "@/components/admin/feedback";

const fmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

/** Páginas de texto do site (Sobre, Trocas, Termos, Privacidade, Guia, Contato e extras). */
export default function PaginasPage() {
  const { apiFetch } = useAuth();
  const { toast, confirm } = useFeedback();
  const [list, setList] = useState<PageDTO[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setList(await apiFetch<PageDTO[]>("/admin/pages"));
    } catch (err) {
      toast(errorText(err), "erro");
    }
  }, [apiFetch, toast]);
  useEffect(() => void load(), [load]);

  async function remove(p: PageDTO) {
    const ok = await confirm({ title: `Excluir a página “${p.title}”?`, text: `O endereço ${pagePath(p)} deixa de existir. Links que apontam para ela vão dar “página não encontrada”.`, confirm: "Excluir página", danger: true });
    if (!ok) return;
    setBusy(p.id);
    try {
      await apiFetch(`/admin/pages/${p.id}`, { method: "DELETE" });
      toast("Página excluída.");
      await load();
    } catch (err) {
      toast(errorText(err), "erro");
    } finally {
      setBusy(null);
    }
  }

  const newBtn = (
    <Link href="/admin/paginas/nova" className="btn-primary h-11">
      Nova página
    </Link>
  );

  return (
    <>
      <PageTitle actions={newBtn}>Páginas</PageTitle>
      <p className="-mt-4 mb-6 max-w-2xl text-[14px] text-texto-2">
        Textos institucionais do site. As páginas da loja têm endereço fixo (o rodapé e o menu apontam para elas) e não podem ser excluídas; as páginas extras ficam em <span className="font-mono">/pagina/…</span>.
      </p>
      {!list ? (
        <TableSkeleton rows={6} cols={4} />
      ) : list.length === 0 ? (
        <EmptyState title="Nenhuma página ainda" text="Rode o script de conteúdo inicial ou crie a primeira página." action={newBtn} />
      ) : (
        <div className="overflow-x-auto border border-linha bg-white">
          <table className="w-full min-w-[640px] text-left text-[14px]">
            <thead className="border-b border-linha text-[12px] uppercase tracking-[0.08em] text-texto-2">
              <tr>
                <th className="px-4 py-3 font-normal">Página</th>
                <th className="px-3 font-normal">Endereço</th>
                <th className="px-3 font-normal">Situação</th>
                <th className="px-3 font-normal">Atualizada</th>
                <th className="px-3 font-normal">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className="border-b border-linha last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/admin/paginas/${p.id}`} className="font-normal underline-offset-4 hover:underline">
                      {[p.title, p.emphasis].filter(Boolean).join(" ")}
                    </Link>
                    <span className="block text-[12px] text-texto-2">{p.system ? "Página da loja" : "Página extra"}</span>
                  </td>
                  <td className="px-3">
                    <a href={pagePath(p)} target="_blank" rel="noopener noreferrer" className="font-mono text-[13px] text-texto-2 hover:text-texto hover:underline">
                      {pagePath(p)}
                    </a>
                  </td>
                  <td className="px-3">
                    <span className={p.published ? "bg-oliva/15 px-2 py-0.5 text-[12px] text-oliva-escuro" : "bg-linha px-2 py-0.5 text-[12px] text-texto-2"}>{p.published ? "Publicada" : "Rascunho"}</span>
                  </td>
                  <td className="px-3 text-[13px] text-texto-2">{fmt.format(new Date(p.updatedAt))}</td>
                  <td className="px-3 text-right">
                    <div className="flex justify-end gap-4 text-[13px]">
                      <Link href={`/admin/paginas/${p.id}`} className="underline underline-offset-4 hover:text-oliva">
                        Editar
                      </Link>
                      {!p.system && (
                        <button type="button" disabled={busy === p.id} onClick={() => remove(p)} className="text-erro underline underline-offset-4 disabled:opacity-50">
                          {busy === p.id ? "Excluindo…" : "Excluir"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
