"use client";
import { useEffect } from "react";

/** Vira `true` depois da 1ª montagem (hidratação): daí em diante, toda montagem é navegação. */
let hydrated = false;

/**
 * Transição entre páginas da loja. O Next remonta o template a cada troca de página
 * (filtros e ordenação só mudam a query e não remontam).
 * No 1º carregamento não anima: o conteúdo pinta direto (bom para o LCP).
 */
export default function LojaTemplate({ children }: { children: React.ReactNode }) {
  const animate = hydrated;
  useEffect(() => {
    hydrated = true;
  }, []);
  return <div className={animate ? "page-enter" : undefined}>{children}</div>;
}
