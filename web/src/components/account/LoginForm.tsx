"use client";
import { useEffect, useState, type FormEvent } from "react";
import { emailSchema } from "@movalev/shared";
import { useAuth } from "@/lib/auth";

const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_AUTH_GOOGLE === "true";

/** Entrar sem senha: link mágico por e-mail ou Google. */
export function LoginForm({ next = "/conta" }: { next?: string }) {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setState("error");
      setMessage("Digite um e-mail válido.");
      return;
    }
    setState("sending");
    try {
      try {
        sessionStorage.setItem("movalev:auth:next", next);
      } catch {
        /* sem storage */
      }
      await auth.signInWithEmail(parsed.data, next);
      setState("sent");
      setMessage(`Enviamos um link de acesso para ${parsed.data}. Abra o e-mail e toque em “Entrar na minha conta”.`);
      setCooldown(60);
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Não foi possível enviar agora.");
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="text-h2-sm md:text-h2">
        Entrar <em>na sua conta</em>
      </h1>
      <p className="mt-3 text-body font-light text-texto-3">Sem senha: enviamos um link de acesso para o seu e-mail.</p>
      <form onSubmit={onSubmit} noValidate className="mt-8">
        <label htmlFor="login-email" className="mb-2 block text-[13px] text-texto-2">
          E-mail
        </label>
        <input
          id="login-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-describedby="login-msg"
          aria-invalid={state === "error"}
          className="h-[54px] w-full border border-linha-forte bg-white px-4 text-[16px] font-light focus:border-preto focus:outline-none"
        />
        <button type="submit" disabled={state === "sending" || cooldown > 0} className="btn-primary mt-4 w-full">
          {state === "sending" ? "Enviando…" : cooldown > 0 ? `Reenviar em ${cooldown}s` : "Receber link de acesso"}
        </button>
      </form>
      <p id="login-msg" role="status" className={state === "error" ? "mt-3 text-body-sm text-erro" : "mt-3 text-body-sm text-oliva"}>
        {state === "sent" || state === "error" ? message : ""}
      </p>
      {GOOGLE_ENABLED && (
        <>
          <p className="my-6 flex items-center gap-4 text-[13px] text-texto-2 before:h-px before:flex-1 before:bg-linha after:h-px after:flex-1 after:bg-linha">ou</p>
          <button type="button" onClick={() => auth.signInWithGoogle(next).catch((e: Error) => { setState("error"); setMessage(e.message); })} className="btn-secondary w-full">
            Entrar com Google
          </button>
        </>
      )}
    </div>
  );
}
