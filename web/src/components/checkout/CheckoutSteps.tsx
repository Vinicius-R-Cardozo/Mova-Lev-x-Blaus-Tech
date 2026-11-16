import { cn } from "@/lib/cn";

const STEPS = ["Identificação", "Entrega", "Pagamento"] as const;

/** Etapas 1 Identificação · 2 Entrega · 3 Pagamento. Etapas concluídas são clicáveis. */
export function CheckoutSteps({ current, onGo }: { current: 1 | 2 | 3; onGo: (step: 1 | 2 | 3) => void }) {
  return (
    <nav aria-label="Etapas do checkout">
      <ol className="grid grid-cols-3 gap-2 md:gap-2.5">
        {STEPS.map((label, i) => {
          const n = (i + 1) as 1 | 2 | 3;
          const done = n < current;
          const active = n === current;
          const content = (
            <>
              <span aria-hidden className={cn("block h-[3px]", done ? "bg-oliva" : active ? "bg-preto" : "bg-linha-forte")} />
              <span className={cn("mt-3 block text-[14px] md:text-[15px]", done ? "text-oliva" : active ? "font-medium text-preto" : "font-light text-texto-2")}>
                {done ? <span aria-hidden>✓ </span> : `${n} · `}
                {label}
                {done && <span className="sr-only"> (concluída)</span>}
              </span>
            </>
          );
          return (
            <li key={label} aria-current={active ? "step" : undefined}>
              {done ? (
                <button type="button" onClick={() => onGo(n)} className="block w-full text-left hover:opacity-80">
                  {content}
                </button>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
