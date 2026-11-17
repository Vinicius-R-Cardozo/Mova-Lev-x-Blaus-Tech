"use client";
import { useRef, useState, type FormEvent } from "react";
import { post } from "@/lib/api";

export function NewsletterForm() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  // Mesma chave enquanto o e-mail não muda: clique duplo/reenvio não duplica.
  const keyRef = useRef<{ email: string; key: string } | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim().toLowerCase();
    // Checagem leve no navegador (sem carregar o Zod em todas as páginas); a API valida de verdade.
    const parsed = { success: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254, data: { email, source: "rodape" as const } };
    if (!parsed.success) {
      setState("error");
      setMessage("Digite um e-mail válido.");
      return;
    }
    if (keyRef.current?.email !== parsed.data.email) keyRef.current = { email: parsed.data.email, key: crypto.randomUUID() };
    setState("sending");
    try {
      const res = await post<{ message: string }>("/newsletter", parsed.data, keyRef.current.key);
      setState("done");
      setMessage(res.message);
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Não foi possível assinar agora.");
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-6">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="newsletter-email" className="sr-only">
          Seu e-mail
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="Seu e-mail"
          aria-describedby="newsletter-msg"
          aria-invalid={state === "error"}
          className="input sm:max-w-[500px] sm:flex-1"
          disabled={state === "done"}
        />
        <button type="submit" className="btn-dark h-14 px-8" disabled={state === "sending" || state === "done"}>
          {state === "sending" ? "Enviando" : "Assinar"}
        </button>
      </div>
      <p id="newsletter-msg" role="status" className={state === "error" ? "mt-3 text-body-sm text-erro" : "mt-3 text-body-sm text-oliva"}>
        {state === "done" || state === "error" ? message : ""}
      </p>
    </form>
  );
}
