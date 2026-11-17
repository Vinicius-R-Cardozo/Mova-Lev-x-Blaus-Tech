"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getSupabase, safeNext } from "@/lib/auth";

/** Destino do link mágico: valida o token_hash e entra na conta. */
export default function ConfirmPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get("token_hash");
    const type = (params.get("type") ?? "email") as EmailOtpType;
    let next = "/conta";
    try {
      next = safeNext(sessionStorage.getItem("movalev:auth:next") ?? params.get("next") ?? undefined);
      sessionStorage.removeItem("movalev:auth:next");
    } catch {
      /* sem storage */
    }
    void getSupabase().then(async (supabase) => {
      if (!supabase || !tokenHash) return setError("Link inválido.");
      const { error: err } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      if (err) return setError("Este link expirou ou já foi usado. Peça um novo.");
      router.replace(next);
    });
  }, [router]);

  return (
    <div className="container-site flex min-h-[50vh] flex-col justify-center py-20">
      {error ? (
        <>
          <h1 className="text-h3">{error}</h1>
          <Link href="/conta" className="btn-primary mt-8 self-start">
            Pedir novo link
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
