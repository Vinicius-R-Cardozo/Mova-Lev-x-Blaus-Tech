import { cn } from "@/lib/cn";

/** Bloco de carregamento (bege + brilho discreto; parado com prefers-reduced-motion). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton", className)} />;
}

/** Card de produto em carregamento: mesma proporção do card real, sem salto de layout. */
export function SkeletonCard() {
  return (
    <div aria-hidden>
      <Skeleton className="aspect-[3/4]" />
      <div className="mt-3 flex items-center justify-between gap-3">
        <Skeleton className="h-3.5 w-3/5" />
        <Skeleton className="h-3.5 w-12" />
      </div>
      <Skeleton className="mt-2.5 h-3 w-2/5" />
    </div>
  );
}
