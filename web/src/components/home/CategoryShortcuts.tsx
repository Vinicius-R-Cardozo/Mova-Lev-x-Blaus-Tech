import Link from "next/link";
import type { CategoryDTO } from "@movalev/shared";
import { Pictogram } from "@/components/ui/Pictogram";
import { ArrowRightIcon } from "@/components/ui/icons";

export function CategoryShortcuts({ categories }: { categories: CategoryDTO[] }) {
  return (
    <section aria-label="Categorias" className="container-site pt-10 md:pt-16">
      <ul data-reveal className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-6">
        {categories.map((c) => (
          <li key={c.slug} className="w-[42%] shrink-0 snap-start sm:w-[30%] md:w-auto">
            <Link href={`/colecao/${c.slug}`} className="group flex aspect-[3/4] flex-col">
              <span className="flex flex-1 items-center justify-center overflow-hidden" style={{ backgroundColor: c.tone }}>
                <Pictogram kind={c.pictogram} className="h-[48%] w-auto transition-transform duration-slow ease-out group-hover:scale-102" />
              </span>
              <span className="label flex h-12 items-center justify-between border-x border-b border-linha bg-[#F2EEE8] px-4">
                {c.name}
                <ArrowRightIcon className="transition-transform duration-base ease-out group-hover:translate-x-1" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
