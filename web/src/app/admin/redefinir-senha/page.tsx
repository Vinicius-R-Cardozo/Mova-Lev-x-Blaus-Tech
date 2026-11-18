"use client";
import { useEffect, useState } from "react";
import { adminPasswordSchema } from "@movalev/shared";
import { BrandMark } from "@/components/brand/BrandMark";
import { getSupabase } from "@/lib/auth";

/**
 * Chegada pelo link "Esqueci a senha": o Supabase abre uma sessão de recuperação
 * (troca o código da URL pela sessão) e aqui a pessoa define a nova senha.
 * Depois volta ao login normal — com o 2º fator.
 */
export default function RedefinirSenhaPage() {
  const [ready, setReady] = useState<"carregando" | "ok" | "invalido">("carregando");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const supabase = await getSupabase();
      if (!supabase) return setReady("invalido");
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) await supabase.auth.exchangeCodeForSession(code).catch(() => undefined);
      const { data } = await supabase.auth.getSession();
      setReady(data.session ? "ok" : "invalido");
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = adminPasswordSchema.safeParse({ password: pass });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Senha inválida.");
    if (pass !== pass2) return setError("As senhas não conferem.");
    setBusy(true);
    setError(null);
    const supabase = await getSupabase();
    const { error: err } = await supabase!.auth.updateUser({ password: pass });
    if (err) {
      setBusy(false);
      return setError(err.code === "same_password" ? "Use uma senha diferente da anterior." : "Não foi possível salvar. Peça um novo link.");
    }
    await supabase!.auth.signOut();
    window.location.assign("/admin/login?motivo=senha");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bege/50 px-4 py-12">
      <div className="w-full max-w-[420px] border border-linha bg-offwhite p-7 md:p-9">
        <BrandMark variant="wordmark" decorative className="h-6" />
        <h1 className="mt-6 font-display text-[34px] leading-none">Nova senha</h1>
        {ready === "carregando" && <p className="mt-4 text-[14px] font-light">Conferindo o link…</p>}
        {ready === "invalido" && (
          <p className="mt-4 text-[14px] font-light">
            Este link expirou ou já foi usado. <a href="/admin/login" className="link-underline">Peça um novo</a>.
          </p>
        )}
        {ready === "ok" && (
          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            {error && (
              <p role="alert" className="border-l-2 border-erro bg-white px-4 py-3 text-[14px] text-erro">
                {error}
              </p>
            )}
            <p className="text-[14px] font-light text-texto-3">10 caracteres ou mais, com letras e números.</p>
            <input aria-label="Nova senha" type="password" autoComplete="new-password" className="input h-12 bg-white" value={pass} onChange={(e) => setPass(e.target.value)} autoFocus />
            <input aria-label="Repita a nova senha" type="password" autoComplete="new-password" className="input h-12 bg-white" value={pass2} onChange={(e) => setPass2(e.target.value)} />
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? "Salvando…" : "Salvar nova senha"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
