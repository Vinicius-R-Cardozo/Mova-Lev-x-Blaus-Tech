"use client";
import { useRef, useState, type FormEvent } from "react";
import { CONTACT_SUBJECTS, CONTACT_SUBJECT_LABEL, contactInputSchema } from "@movalev/shared";
import { post } from "@/lib/api";

export function ContactForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const keyRef = useRef<{ body: string; key: string } | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const parsed = contactInputSchema.safeParse(data);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    const body = JSON.stringify(parsed.data);
    if (keyRef.current?.body !== body) keyRef.current = { body, key: crypto.randomUUID() };
    setState("sending");
    try {
      const res = await post<{ message: string }>("/contact", parsed.data, keyRef.current.key);
      setState("done");
      setMessage(res.message);
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Não foi possível enviar.");
    }
  }

  if (state === "done") {
    return (
      <p role="status" className="bg-salvia px-5 py-4 text-[16px] text-texto">
        {message}
      </p>
    );
  }

  const field = "h-[54px] w-full border bg-white px-4 text-[16px] font-light text-texto focus:border-preto focus:outline-none not-prose";
  const err = (k: string) =>
    errors[k] ? (
      <span id={`c-${k}-erro`} className="mt-1.5 block text-[13px] text-erro">
        {errors[k]}
      </span>
    ) : null;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5 text-[16px] sm:grid-cols-2">
      <label className="block">
        <span className="mb-2 block text-[13px] text-texto-2">Nome</span>
        <input name="name" autoComplete="name" aria-invalid={!!errors.name} aria-describedby={errors.name ? "c-name-erro" : undefined} className={`${field} ${errors.name ? "border-erro" : "border-linha-forte"}`} />
        {err("name")}
      </label>
      <label className="block">
        <span className="mb-2 block text-[13px] text-texto-2">E-mail</span>
        <input name="email" type="email" autoComplete="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? "c-email-erro" : undefined} className={`${field} ${errors.email ? "border-erro" : "border-linha-forte"}`} />
        {err("email")}
      </label>
      <label className="block">
        <span className="mb-2 block text-[13px] text-texto-2">Assunto</span>
        <select name="subject" defaultValue="pedido" className={`${field} border-linha-forte`}>
          {CONTACT_SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {CONTACT_SUBJECT_LABEL[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-2 block text-[13px] text-texto-2">Nº do pedido (opcional)</span>
        <input name="orderNumber" inputMode="numeric" placeholder="#1001" aria-invalid={!!errors.orderNumber} className={`${field} ${errors.orderNumber ? "border-erro" : "border-linha-forte"}`} />
        {err("orderNumber")}
      </label>
      <label className="block sm:col-span-2">
        <span className="mb-2 block text-[13px] text-texto-2">Mensagem</span>
        <textarea
          name="message"
          rows={6}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? "c-message-erro" : undefined}
          className={`w-full border bg-white px-4 py-3 text-[16px] font-light text-texto focus:border-preto focus:outline-none ${errors.message ? "border-erro" : "border-linha-forte"}`}
        />
        {err("message")}
      </label>
      {/* Campo-isca anti-spam: invisível para pessoas e leitores de tela. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Site
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="sm:col-span-2">
        <button type="submit" disabled={state === "sending"} className="btn-primary">
          {state === "sending" ? "Enviando…" : "Enviar mensagem"}
        </button>
        {state === "error" && (
          <p role="alert" className="mt-3 text-[14px] text-erro">
            {message}
          </p>
        )}
      </div>
    </form>
  );
}
