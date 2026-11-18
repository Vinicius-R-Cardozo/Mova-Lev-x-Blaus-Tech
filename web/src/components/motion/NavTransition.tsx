"use client";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect } from "react";

const CLASS = "page-leaving";
/** Se a página nova demorar, a antiga não fica apagada para sempre. */
const FAILSAFE_MS = 5000;

/**
 * Saída suave entre páginas: ao clicar num link interno para OUTRA página, o conteúdo
 * atual esmaece e sobe um pouco enquanto a próxima carrega; quando a rota muda,
 * o template da loja faz a entrada. Links da mesma página (âncoras, filtros por
 * query), nova aba, teclas modificadoras e download ficam de fora.
 */
export function NavTransition() {
  const pathname = usePathname();

  // Antes da pintura: a página nova já nasce sem o estado de saída.
  useLayoutEffect(() => {
    document.documentElement.classList.remove(CLASS);
  }, [pathname]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer = 0;
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      document.documentElement.classList.add(CLASS);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => document.documentElement.classList.remove(CLASS), FAILSAFE_MS);
    };
    // Captura: o <Link> do Next cancela o clique (navegação interna) antes da fase de bolha.
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.clearTimeout(timer);
      document.documentElement.classList.remove(CLASS);
    };
  }, []);

  return null;
}
