import type { HomeDTO } from "@movalev/shared";

export function InstagramGrid({ instagram }: { instagram: HomeDTO["instagram"] }) {
  return (
    <section aria-labelledby="insta-titulo" className="container-site py-20 md:py-[120px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="insta-titulo" className="text-h2-sm md:text-h2">
          {instagram.title}
        </h2>
        <a href={instagram.url} target="_blank" rel="noopener noreferrer" className="label inline-flex min-h-touch items-center underline decoration-1 underline-offset-[7px] hover:text-oliva">
          Siga {instagram.handle}
        </a>
      </div>
      <ul className="mt-10 grid grid-cols-3 gap-2 md:grid-cols-6">
        {instagram.tiles.map((t, i) => (
          <li key={i} className="aspect-square" style={{ backgroundColor: t.tone }} role="img" aria-label={t.caption} />
        ))}
      </ul>
    </section>
  );
}
