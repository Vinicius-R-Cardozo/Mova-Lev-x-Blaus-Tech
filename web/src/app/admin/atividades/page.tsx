"use client";
import { useCallback, useEffect, useState } from "react";
import { ROLE_LABEL } from "@movalev/shared";
import { PageTitle } from "@/components/admin/ui";
import { EmptyState, Pagination, TableSkeleton, errorText, useFeedback } from "@/components/admin/feedback";
import { useAuth } from "@/lib/auth";

type Entry = {
  id: string;
  actorEmail: string;
  actorRole: "ADMIN" | "EDITOR" | "CUSTOMER";
  action: string;
  entity: string;
  entityId: string | null;
  summary: string | null;
  before: unknown;
  after: unknown;
  ip: string | null;
  createdAt: string;
};
type Page = { total: number; page: number; perPage: number; items: Entry[]; entities: string[] };

const ENTITY_LABEL: Record<string, string> = { produto: "Produtos", pedido: "Pedidos", cupom: "Cupons", colecao: "Coleções", conteudo: "Conteúdo", configuracao: "Configurações", usuario: "Usuários", estoque: "Estoque", categoria: "Categorias" };
const fmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

/** Registro de atividades: quem alterou o quê e quando (preço, estoque, exclusões, status…). */
export default function AtividadesPage() {
  const { apiFetch } = useAuth();
  const { toast } = useFeedback();
  const [data, setData] = useState<Page | null>(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [entity, setEntity] = useState("");
  const [actor, setActor] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(
    async (p: number) => {
      const qs = new URLSearchParams({ page: String(p), perPage: "30" });
      if (q.trim()) qs.set("q", q.trim());
      if (entity) qs.set("entity", entity);
      if (actor.trim()) qs.set("actor", actor.trim());
      try {
        setData(await apiFetch<Page>(`/admin/audit?${qs}`));
        setPage(p);
      } catch (err) {
        toast(errorText(err), "erro");
      }
    },
    [apiFetch, q, entity, actor, toast],
  );

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filtros aplicam no submit
  }, [entity]);

  return (
    <>
      <PageTitle>Atividades</PageTitle>
      <form
        className="mb-5 grid gap-3 md:grid-cols-[1fr_200px_220px_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          void load(1);
        }}
      >
        <input aria-label="Buscar" placeholder="Buscar (ex.: preço, #1003, Legging)" className="input h-11 bg-white" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Área" className="input h-11 bg-white" value={entity} onChange={(e) => setEntity(e.target.value)}>
          <option value="">Todas as áreas</option>
          {(data?.entities ?? []).map((e) => (
            <option key={e} value={e}>
              {ENTITY_LABEL[e] ?? e}
            </option>
          ))}
        </select>
        <input aria-label="Quem" placeholder="Quem (e-mail)" className="input h-11 bg-white" value={actor} onChange={(e) => setActor(e.target.value)} />
        <button type="submit" className="btn-secondary h-11 px-6">
          Filtrar
        </button>
      </form>

      {!data ? (
        <TableSkeleton rows={8} cols={4} />
      ) : data.items.length === 0 ? (
        <EmptyState title="Nenhuma atividade" text="As alterações feitas no painel aparecem aqui: preços, estoque, status de pedidos, exclusões e acessos." />
      ) : (
        <ul className="border border-linha bg-white">
          {data.items.map((e) => (
            <li key={e.id} className="border-b border-linha last:border-b-0">
              <button type="button" className="grid w-full gap-1 px-4 py-3.5 text-left hover:bg-offwhite md:grid-cols-[150px_1fr_220px] md:gap-4" aria-expanded={open === e.id} onClick={() => setOpen(open === e.id ? null : e.id)}>
                <span className="text-[13px] tabular-nums text-texto-2">{fmt.format(new Date(e.createdAt))}</span>
                <span className="text-[15px]">
                  <span className="label-sm mr-2 text-texto-2">{ENTITY_LABEL[e.entity] ?? e.entity}</span>
                  {e.summary ?? e.action}
                </span>
                <span className="truncate text-[13px] text-texto-2 md:text-right">
                  {e.actorEmail} · {ROLE_LABEL[e.actorRole]}
                </span>
              </button>
              {open === e.id && (
                <div className="swap-up grid gap-4 border-t border-linha bg-offwhite/60 px-4 py-4 text-[13px] md:grid-cols-2">
                  <Json title="Antes" value={e.before} />
                  <Json title="Depois" value={e.after} />
                  <p className="text-texto-2 md:col-span-2">
                    Ação: <code>{e.action}</code>
                    {e.entityId && (
                      <>
                        {" "}
                        · Registro: <code>{e.entityId}</code>
                      </>
                    )}
                    {e.ip && <> · IP {e.ip}</>}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {data && <Pagination page={page} perPage={data.perPage} total={data.total} onPage={(p) => void load(p)} />}
    </>
  );
}

function Json({ title, value }: { title: string; value: unknown }) {
  return (
    <div>
      <p className="label-sm mb-1.5 text-texto-2">{title}</p>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words border border-linha bg-white p-3 font-mono text-[12px]">{value === null || value === undefined ? "—" : JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}
