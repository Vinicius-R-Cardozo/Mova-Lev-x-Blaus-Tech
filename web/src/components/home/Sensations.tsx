import Link from "next/link";
import type { HomeDTO } from "@movalev/shared";

const BG: Record<string, string> = {
  NUVEM: "linear-gradient(160deg,#EBDDCF 0%,#E0CDBA 50%,#D6BEA6 100%)",
  BRISA: "linear-gradient(160deg,#E4E6DC 0%,#D5D9C8 50%,#BFC4AC 100%)",
};

export function Sensations({ items }: { items: HomeDTO["sensations"] }) {
  return (
    <section aria-label="Sensações" className="container-site pt-20 md:pt-[110px]">
      <ul className="grid gap-4 md:grid-cols-2">
        {items.map((s) => (
          <li key={s.sensation}>
            <Link href={s.href} className="group relative flex h-[420px] flex-col justify-end overflow-hidden p-6 md:h-[560px] md:p-10" style={{ background: BG[s.sensation] }}>
              <span aria-hidden className="absolute inset-0 bg-preto/0 transition-colors duration-300 group-hover:bg-preto/[0.03]" />
              <span className="label-sm relative text-texto-3">Sensação</span>
              <span className="relative mt-3 font-display text-h2-sm md:text-h2">{s.title}</span>
              <span className="relative mt-1 text-[15px] font-light text-texto-3">{s.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
