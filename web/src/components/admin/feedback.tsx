"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { CloseIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

// ───────────────────────────── Avisos (toast) ─────────────────────────────

type Tone = "ok" | "erro" | "info";
type Toast = { id: number; tone: Tone; text: string };
type ConfirmOpts = { title: string; text?: ReactNode; confirm?: string; cancel?: string; danger?: boolean };

interface FeedbackState {
  toast: (text: string, tone?: Tone) => void;
  /** Abre a confirmação e resolve true/false. Toda exclusão passa por aqui. */
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
}

const Ctx = createContext<FeedbackState | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const [dialog, setDialog] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);

  const toast = useCallback((text: string, tone: Tone = "ok") => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-3), { id, tone, text }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "erro" ? 7000 : 4000);
  }, []);

  const confirm = useCallback((opts: ConfirmOpts) => new Promise<boolean>((resolve) => setDialog({ ...opts, resolve })), []);

  const close = (v: boolean) => {
    dialog?.resolve(v);
    setDialog(null);
  };

  return (
    <Ctx.Provider value={{ toast, confirm }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-toast flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "erro" ? "alert" : "status"}
            className={cn(
              "swap-up pointer-events-auto flex items-start gap-3 border px-4 py-3 text-[14px] shadow-resumo",
              t.tone === "erro" ? "border-erro/30 bg-white text-erro" : t.tone === "info" ? "border-linha bg-white text-texto" : "border-oliva/30 bg-white text-oliva-escuro",
            )}
          >
            <span aria-hidden className={cn("mt-1.5 h-2 w-2 shrink-0", t.tone === "erro" ? "bg-erro" : t.tone === "info" ? "bg-taupe" : "bg-oliva")} />
            <p className="flex-1">{t.text}</p>
            <button type="button" aria-label="Fechar aviso" className="-m-1 p-1 text-texto-2 hover:text-preto" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>
              <CloseIcon width={14} height={14} />
            </button>
          </div>
        ))}
      </div>
      {dialog && <ConfirmDialog {...dialog} onClose={close} />}
    </Ctx.Provider>
  );
}

export function useFeedback(): FeedbackState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useFeedback fora do FeedbackProvider");
  return v;
}

function ConfirmDialog({ title, text, confirm = "Confirmar", cancel = "Cancelar", danger, onClose }: ConfirmOpts & { onClose: (v: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-titulo"
      onCancel={(e) => {
        e.preventDefault();
        onClose(false);
      }}
      className="w-[min(440px,calc(100vw-2rem))] bg-offwhite p-0 text-texto backdrop:bg-preto/50"
    >
      <div className="p-6">
        <h2 id="confirm-titulo" className="font-display text-[28px] leading-tight">
          {title}
        </h2>
        {text && <div className="mt-3 text-[15px] font-light text-texto-3">{text}</div>}
        <div className="mt-7 flex flex-wrap justify-end gap-3">
          <button type="button" className="btn-secondary h-11 px-6" onClick={() => onClose(false)} autoFocus>
            {cancel}
          </button>
          <button type="button" className={cn("btn h-11 px-6 text-offwhite", danger ? "bg-erro hover:bg-[#7f2619]" : "bg-oliva hover:bg-oliva-escuro")} onClick={() => onClose(true)}>
            {confirm}
          </button>
        </div>
      </div>
    </dialog>
  );
}

// ───────────────────────────── Estados de lista ─────────────────────────────

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center border border-dashed border-linha-forte bg-white/60 px-6 py-14 text-center">
      <p className="font-display text-[28px] leading-tight">{title}</p>
      {text && <p className="mt-2 max-w-md text-[15px] font-light text-texto-2">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div role="status" aria-label="Carregando" className="border border-linha bg-white">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="grid gap-4 border-b border-linha px-4 py-4 last:border-b-0" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
          {Array.from({ length: cols }, (_, c) => (
            <div key={c} className="skeleton h-3.5" style={{ width: `${60 + ((r * 7 + c * 13) % 35)}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Pagination({ page, perPage, total, onPage }: { page: number; perPage: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (total === 0) return null;
  const from = (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);
  return (
    <nav aria-label="Paginação" className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[14px]">
      <p className="font-light text-texto-2">
        {from}–{to} de {total}
      </p>
      <div className="flex items-center gap-2">
        <button type="button" className="btn-secondary h-10 px-4" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Anterior
        </button>
        <span className="px-2 tabular-nums">
          {page} / {pages}
        </span>
        <button type="button" className="btn-secondary h-10 px-4" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Próxima
        </button>
      </div>
    </nav>
  );
}

/** Mensagem de erro de API amigável. */
export const errorText = (err: unknown) => (err instanceof Error && err.message ? err.message : "Não foi possível concluir. Tente de novo.");
