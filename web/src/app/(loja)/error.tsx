"use client";
import { useEffect } from "react";

export default function LojaError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className="container-site flex min-h-[60vh] flex-col items-start justify-center py-24">
      <p className="label text-texto-2">Algo saiu do ritmo</p>
      <h1 className="mt-4 text-h2-sm md:text-h2">Não conseguimos carregar esta página.</h1>
      <p className="mt-4 max-w-md text-body font-light text-texto-3">Tente de novo em alguns segundos.</p>
      <button type="button" onClick={reset} className="btn-primary mt-8">
        Tentar de novo
      </button>
    </div>
  );
}
