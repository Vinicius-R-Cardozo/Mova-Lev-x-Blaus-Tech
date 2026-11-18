import { formatBRL } from "@movalev/shared";
import { cn } from "@/lib/cn";

/**
 * Preço da vitrine. Em promoção, mostra o original riscado ao lado e anuncia
 * "de … por …" para leitores de tela.
 */
export function Price({ cents, compareAt, className, compareClassName }: { cents: number; compareAt?: number | null; className?: string; compareClassName?: string }) {
  const promo = compareAt && compareAt > cents ? compareAt : null;
  if (!promo) return <span className={className}>{formatBRL(cents, { compact: true })}</span>;
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2", className)}>
      <span className="sr-only">
        De {formatBRL(promo, { compact: true })} por {formatBRL(cents, { compact: true })}
      </span>
      <span aria-hidden className={cn("text-texto-2 line-through decoration-1", compareClassName)}>
        {formatBRL(promo, { compact: true })}
      </span>
      <span aria-hidden className="text-oliva-escuro">
        {formatBRL(cents, { compact: true })}
      </span>
    </span>
  );
}
