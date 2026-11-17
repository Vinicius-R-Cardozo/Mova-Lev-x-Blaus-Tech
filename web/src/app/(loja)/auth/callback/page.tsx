"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabase, safeNext } from "@/lib/auth";

/** Retorno do login com Google (PKCE): troca o código pela sessão. */
export default function CallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const next = safeNext(params.get("next") ?? undefined);
    if (params.get("error")) return setError("O login foi cancelado.");
    void getSupabase().then(async (supabase) => {
      if (!supabase || !code) return setError("Link inválido.");
      const { error: err } = await supabase.auth.exchangeCodeForSession(code);
      if (err) return setError("Não foi possível entrar. Tente de novo.");
      router.replace(next);
    });
  }, [router]);

  return (
    <div className="container-site flex min-h-[50vh] flex-col justify-center py-20">
      {error ? (
        <>
          <h1 className="text-h3">{error}</h1>
          <Link href="/conta" className="btn-primary mt-8 self-start">
            Voltar
          </Link>
        </>
      ) : (
        <p className="text-body" role="status">
          Entrando na sua conta…
        </p>
      )}
    </div>
  );
}
