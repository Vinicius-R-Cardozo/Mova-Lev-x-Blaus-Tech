"use client";
import { useEffect } from "react";

const SELECTOR = "[data-reveal]:not([data-revealed])";
/** Até 6 itens em cascata por lote; depois disso o resto entra junto (nada passa de ~0,7 s). */
const MAX_STAGGER = 5;

/**
 * Reveal ao rolar, uma vez só, para qualquer elemento com `data-reveal`.
 *
 * - O que já está na tela quando a página carrega é marcado como visto antes de
 *   ligar o efeito: nada pisca nem some (e o LCP não espera JavaScript).
 * - Elementos que entram depois (carregar mais, troca de aba/filtro, navegação)
 *   são observados por um MutationObserver.
 * - Com `prefers-reduced-motion`, não liga nada: tudo aparece direto.
 */
export function RevealObserver() {
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const slow = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--motion-slow"), 10) || 750;
    const reveal = (el: Element, delay = 0) => {
      const h = el as HTMLElement;
      if (delay) {
        h.style.setProperty("--reveal-delay", `${delay}ms`);
        // Depois da entrada, tira o atraso para o hover do card responder na hora.
        window.setTimeout(() => h.style.removeProperty("--reveal-delay"), delay + slow);
      }
      h.setAttribute("data-revealed", "");
    };

    const step = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--motion-stagger"), 10) || 60;
    const io = new IntersectionObserver(
      (entries) => {
        let n = 0;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          io.unobserve(e.target);
          reveal(e.target, Math.min(n++, MAX_STAGGER) * step);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );

    const track = (root: ParentNode) => {
      const found = root instanceof Element && root.matches(SELECTOR) ? [root, ...root.querySelectorAll(SELECTOR)] : [...root.querySelectorAll(SELECTOR)];
      for (const el of found) io.observe(el);
    };

    // 1) Marca o que já está visível agora (sem animação), 2) liga o efeito para o resto.
    const vh = window.innerHeight;
    for (const el of document.querySelectorAll(SELECTOR)) {
      const r = el.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) el.setAttribute("data-revealed", "");
    }
    document.documentElement.classList.add("reveal-on");
    track(document);

    const mo = new MutationObserver((records) => {
      for (const r of records) for (const node of r.addedNodes) if (node.nodeType === 1) track(node as Element);
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      document.documentElement.classList.remove("reveal-on");
    };
  }, []);

  return null;
}
