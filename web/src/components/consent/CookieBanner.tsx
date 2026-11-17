"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useConsent } from "@/lib/consent";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { CloseIcon } from "@/components/ui/icons";

/** Banner de cookies: aceitar e recusar com o mesmo destaque; preferências por categoria. */
export function CookieBanner() {
  const consent = useConsent();
  // Renderizado já no HTML do servidor (pinta no primeiro quadro); o script no <head>
  // esconde antes da pintura quando a visitante já decidiu.
  const show = (!consent.ready || !consent.choice) && !consent.preferencesOpen;
  return (
    <>
      {show && (
        <section
          aria-label="Aviso de cookies"
          className="cookie-banner fixed inset-x-3 bottom-3 z-toast border border-linha bg-offwhite p-5 shadow-resumo md:inset-x-auto md:bottom-6 md:left-6 md:max-w-[520px] md:p-6"
        >
          <p className="text-[15px] font-light leading-relaxed text-texto-3">
            Usamos cookies necessários para a loja funcionar (sacola e login). Com a sua permissão, também usamos cookies de análise e de anúncios para melhorar a experiência.{" "}
            <Link href="/politica-de-privacidade#cookies" className="font-normal text-texto underline underline-offset-4">
              Saiba mais
            </Link>
            .
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button type="button" onClick={consent.rejectAll} className="btn-secondary h-11 px-5">
              Recusar não essenciais
            </button>
            <button type="button" onClick={consent.acceptAll} className="btn-dark h-11 px-5">
              Aceitar todos
            </button>
            <button type="button" onClick={consent.openPreferences} className="col-span-2 min-h-touch text-[14px] underline underline-offset-4 sm:col-span-1 sm:px-2">
              Personalizar
            </button>
          </div>
        </section>
      )}
      <Preferences />
    </>
  );
}

function Preferences() {
  const consent = useConsent();
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => consent.closePreferences(), [consent]);
  useFocusTrap(ref, consent.preferencesOpen, close);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  useEffect(() => {
    if (consent.preferencesOpen) {
      setAnalytics(consent.choice?.analytics ?? false);
      setMarketing(consent.choice?.marketing ?? false);
    }
  }, [consent.preferencesOpen, consent.choice]);

  if (!consent.preferencesOpen) return null;
  return (
    <div className="fixed inset-0 z-toast flex items-end justify-center bg-preto/45 md:items-center" onClick={close}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookies-titulo"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-sheet bg-offwhite p-6 md:max-w-[560px] md:rounded-none md:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="cookies-titulo" className="text-[32px] leading-tight">
            Preferências de cookies
          </h2>
          <button type="button" onClick={close} aria-label="Fechar preferências" className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center">
            <CloseIcon />
          </button>
        </div>
        <ul className="mt-6 divide-y divide-linha border-y border-linha">
          <Toggle title="Necessários" text="Sacola, login e esta escolha. Sem eles a loja não funciona." checked disabled />
          <Toggle title="Análise" text="Google Analytics 4: entender quais páginas e peças funcionam melhor." checked={analytics} onChange={setAnalytics} />
          <Toggle title="Marketing" text="Meta Pixel: medir anúncios no Instagram e no Facebook." checked={marketing} onChange={setMarketing} />
        </ul>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button type="button" onClick={consent.rejectAll} className="btn-secondary h-11 px-4">
            Recusar não essenciais
          </button>
          <button type="button" onClick={() => consent.save({ analytics, marketing })} className="btn-primary h-11 px-4">
            Salvar escolhas
          </button>
        </div>
      </div>
    </div>
  );
}

function Toggle({ title, text, checked, disabled, onChange }: { title: string; text: string; checked: boolean; disabled?: boolean; onChange?: (v: boolean) => void }) {
  const id = `cookie-${title.toLowerCase()}`;
  return (
    <li className="flex items-start justify-between gap-6 py-4">
      <span>
        <label htmlFor={id} className="block text-[16px] font-normal">
          {title}
        </label>
        <span className="mt-1 block text-[14px] font-light text-texto-2">{text}</span>
      </span>
      <span className="relative mt-1 inline-flex shrink-0">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked)}
          className="peer h-7 w-12 cursor-pointer appearance-none rounded-full bg-taupe-claro transition-colors checked:bg-oliva focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oliva disabled:cursor-not-allowed disabled:opacity-60"
        />
        <span aria-hidden className="pointer-events-none absolute left-1 top-1 h-5 w-5 rounded-full bg-offwhite transition-transform peer-checked:translate-x-5" />
      </span>
    </li>
  );
}
