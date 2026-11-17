"use client";
import { forwardRef, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Peças de formulário do admin — mesmo visual da loja, mais denso. */
export function Card({ title, actions, children, className }: { title?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("border border-linha bg-white p-5 md:p-6", className)}>
      {(title || actions) && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          {title && <h2 className="font-display text-[26px] leading-tight">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageTitle({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <h1 className="text-[40px] leading-none md:text-[48px]">{children}</h1>
      {actions}
    </div>
  );
}

type Base = { label: string; error?: string; hint?: string; wrapClassName?: string };

const fieldCls = (error?: string) =>
  cn("w-full border bg-white px-3 text-[15px] font-light focus:border-preto focus:outline-none disabled:bg-bege/50", error ? "border-erro" : "border-linha-forte");

function Wrap({ id, label, error, hint, className, children }: { id: string; label: string; error?: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] text-texto-2">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-[12px] text-texto-2">{hint}</p>}
      {error && (
        <p id={`${id}-erro`} className="mt-1 text-[12px] text-erro">
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & Base>(function Input({ label, error, hint, wrapClassName, id, ...rest }, ref) {
  const fid = id ?? `a-${rest.name ?? label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <Wrap id={fid} label={label} error={error} hint={hint} className={wrapClassName}>
      <input ref={ref} id={fid} aria-invalid={!!error} aria-describedby={error ? `${fid}-erro` : undefined} className={cn(fieldCls(error), "h-11")} {...rest} />
    </Wrap>
  );
});

export function Textarea({ label, error, hint, wrapClassName, id, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & Base) {
  const fid = id ?? `a-${rest.name ?? label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <Wrap id={fid} label={label} error={error} hint={hint} className={wrapClassName}>
      <textarea id={fid} aria-invalid={!!error} className={cn(fieldCls(error), "min-h-[96px] py-2.5")} {...rest} />
    </Wrap>
  );
}

export function Select({ label, error, hint, wrapClassName, id, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & Base) {
  const fid = id ?? `a-${rest.name ?? label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <Wrap id={fid} label={label} error={error} hint={hint} className={wrapClassName}>
      <select id={fid} aria-invalid={!!error} className={cn(fieldCls(error), "h-11")} {...rest}>
        {children}
      </select>
    </Wrap>
  );
}

export function Check({ label, checked, onChange, className }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void; className?: string }) {
  return (
    <label className={cn("flex min-h-[36px] cursor-pointer items-center gap-2.5 text-[14px]", className)}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-oliva" />
      {label}
    </label>
  );
}

/** Valor em reais digitado como texto, guardado em centavos. */
export function MoneyInput({ label, cents, onChange, error, nullable, wrapClassName }: { label: string; cents: number | null; onChange: (c: number | null) => void; error?: string; nullable?: boolean; wrapClassName?: string }) {
  const [text, setText] = useState(cents == null ? "" : (cents / 100).toFixed(2).replace(".", ","));
  return (
    <Input
      label={label}
      inputMode="decimal"
      value={text}
      error={error}
      wrapClassName={wrapClassName}
      placeholder={nullable ? "—" : "0,00"}
      onChange={(e) => {
        setText(e.target.value);
        const raw = e.target.value.replace(/\./g, "").replace(",", ".").trim();
        if (!raw && nullable) return onChange(null);
        const v = Math.round(Number(raw) * 100);
        if (Number.isFinite(v)) onChange(v);
      }}
    />
  );
}

export function Notice({ kind = "ok", children }: { kind?: "ok" | "erro"; children: ReactNode }) {
  if (!children) return null;
  return (
    <p role={kind === "erro" ? "alert" : "status"} className={cn("px-4 py-3 text-[14px]", kind === "erro" ? "bg-erro/10 text-erro" : "bg-salvia text-texto")}>
      {children}
    </p>
  );
}

export function issuesToErrors(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) out[i.path.map(String).join(".")] ??= i.message;
  return out;
}

/** Baixa um CSV autenticado (o token vai no header, não na URL). */
export async function downloadCsv(apiFetchRaw: (path: string) => Promise<string>, path: string, fileName: string) {
  const text = await apiFetchRaw(path);
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
