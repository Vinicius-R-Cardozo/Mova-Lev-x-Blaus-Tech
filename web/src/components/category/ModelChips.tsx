import Link from "next/link";
import { MODEL_LABEL, MODEL_SLUG, MODELS } from "@movalev/shared";
import { cn } from "@/lib/cn";

/** Chips de modelo (só nas leggings). Preservam os demais filtros da URL. */
export function ModelChips({ slug, params }: { slug: string; params: URLSearchParams }) {
  const current = params.get("modelo");
  const hrefFor = (modelo: string | null) => {
    const next = new URLSearchParams(params);
    if (modelo) next.set("modelo", modelo);
    else next.delete("modelo");
    const qs = next.toString();
    return `/colecao/${slug}${qs ? `?${qs}` : ""}`;
  };
  const chips = [{ label: "Todas", value: null as string | null }, ...MODELS.map((m) => ({ label: MODEL_LABEL[m], value: MODEL_SLUG[m] }))];
  return (
    <nav aria-label="Modelos">
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
        {chips.map((c) => {
          const selected = current === c.value || (!current && c.value === null);
          return (
            <li key={c.label} className="shrink-0">
              <Link
                href={hrefFor(c.value)}
                scroll={false}
                aria-current={selected ? "true" : undefined}
                className={cn(
                  "flex h-10 items-center border px-4 text-[13px] font-normal tracking-[0.06em] transition-colors md:h-[46px] md:px-6 md:text-[14px]",
                  selected ? "border-preto bg-preto text-offwhite" : "border-linha-forte hover:border-preto",
                )}
              >
                {c.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
