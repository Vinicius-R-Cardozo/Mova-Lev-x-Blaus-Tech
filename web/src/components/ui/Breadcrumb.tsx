import Link from "next/link";
import { cn } from "@/lib/cn";

export interface Crumb {
  name: string;
  href?: string;
}

/** Trilha com links reais; o último item é a página atual. */
export function Breadcrumb({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Trilha de navegação" className={cn("label", className)}>
      <ol className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {items.map((c, i) => (
          <li key={c.name} className="flex items-center gap-3">
            {c.href && i < items.length - 1 ? (
              <Link href={c.href} className="underline decoration-1 underline-offset-4 hover:text-oliva">
                {c.name}
              </Link>
            ) : (
              <span aria-current="page">{c.name}</span>
            )}
            {i < items.length - 1 && <span aria-hidden>/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
