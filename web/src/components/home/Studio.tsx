import Link from "next/link";
import type { HomeDTO } from "@movalev/shared";
import { PlayIcon } from "@/components/ui/icons";

export function Studio({ studio }: { studio: HomeDTO["studio"] }) {
  return (
    <section id="studio" aria-labelledby="studio-titulo" className="on-dark mt-20 scroll-mt-24 bg-preto py-20 text-offwhite md:mt-[110px] md:py-[120px]">
      <div className="container-site grid items-center gap-12 lg:grid-cols-[minmax(0,440px)_1fr] lg:gap-16">
        <div data-reveal>
          <p className="label text-offwhite/80">{studio.kicker}</p>
          <h2 id="studio-titulo" className="mt-7 text-h2-sm md:text-h2">
            {studio.title}
            <br />
            <em className="text-areia">{studio.titleEmphasis}</em>
          </h2>
          <p className="mt-6 text-body-lg font-light text-offwhite/75">{studio.text}</p>
          <Link href={studio.cta.href} className="btn-light mt-8">
            {studio.cta.label}
          </Link>
        </div>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:ml-auto lg:w-full lg:max-w-[770px]">
          {studio.classes.map((c) => (
            <li key={c.title} data-reveal>
              <a href={c.videoUrl ?? studio.cta.href} className="group block" aria-label={`${c.title}, ${c.meta}`}>
                <span className="flex aspect-[3/4] items-center justify-center transition-transform duration-slow ease-out group-hover:scale-102" style={{ backgroundColor: c.tone }}>
                  <PlayIcon width={28} height={28} className="text-offwhite" />
                </span>
                <span className="mt-4 block text-[16px] font-normal">{c.title}</span>
                <span className="mt-1.5 block text-[14px] font-light text-offwhite/60">{c.meta}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
