"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { formatBRL, type HomeDTO } from "@movalev/shared";
import { Media } from "@/components/ui/Media";
import { CloseIcon } from "@/components/ui/icons";
import { cardToCartLine } from "@/components/product/ProductCard";
import { useCart } from "@/lib/cart";
import { defaultSize } from "./lookToCart";

/** Posição na cascata de entrada (multiplica --motion-stagger). */
const cascade = (i: number) => ({ "--i": i }) as CSSProperties;

/** Silhueta e linhas da campanha enquanto o vídeo não chega. */
function HeroArt() {
  return (
    <div aria-hidden className="hero-settle absolute inset-0" style={{ background: "linear-gradient(180deg,#A99A8A 0%,#CDBBA6 24%,#C3AF99 50%,#8F806F 76%,#4E453C 100%)" }}>
      <div className="absolute left-[51%] top-[19%] h-[73%] w-[24%] rounded-[50%] bg-[#D2BEA9]/60 md:left-[50.5%]" />
      <div className="absolute left-[58.5%] top-[14%] aspect-square w-[8.6%] rounded-full bg-[#C4A898]/70" />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1440 920" preserveAspectRatio="none" fill="none">
        <path d="M0 850C420 720 900 560 1440 470" stroke="#F5F2EE" strokeOpacity=".55" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <path d="M0 900C480 760 960 600 1440 520" stroke="#F5F2EE" strokeOpacity=".3" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

export function Hero({ hero, campaign }: { hero: HomeDTO["hero"]; campaign: HomeDTO["campaign"] }) {
  const cart = useCart();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);

  const addLook = () => {
    const lines = campaign.items.flatMap((p) => {
      const s = defaultSize(p);
      return s ? [cardToCartLine(p, s)] : [];
    });
    if (lines.length) cart.add(lines);
  };

  return (
    <section aria-labelledby="hero-titulo" className="relative h-hero-m overflow-hidden text-offwhite on-dark md:h-hero">
      {hero.videoUrl ? (
        <video
          className="hero-settle absolute inset-0 h-full w-full object-cover"
          src={hero.videoUrl}
          poster={hero.posterUrl ?? undefined}
          autoPlay={!reduceMotion}
          muted
          loop
          playsInline
          aria-hidden
        />
      ) : (
        <HeroArt />
      )}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[78%] bg-gradient-to-t from-black/60 via-black/25 to-transparent" />
      {!hero.videoUrl && <p className="enter label-sm absolute right-gutter top-[124px] hidden text-preto/80 md:block" style={cascade(5)}>{hero.caption}</p>}

      <div className="container-site relative flex h-full flex-col justify-end pb-8 md:pb-[68px]">
        <p className="enter label text-[11px] tracking-[0.32em] md:text-label">{hero.kicker}</p>
        <h1 id="hero-titulo" className="mt-4 text-hero-m md:mt-8 md:text-hero">
          {/* Cada linha sobe na sua vez (só transform: o título é o LCP). */}
          <span className="enter-rise inline-block" style={cascade(1)}>{hero.titleLine1}</span> <br className="hidden md:block" />
          <em className="enter-rise inline-block" style={cascade(2)}>{hero.titleLine2}</em>
        </h1>
        <div className="enter mt-6 flex flex-wrap gap-3 md:mt-7" style={cascade(3)}>
          <Link href={hero.primaryCta.href} className="btn-light w-full md:w-auto md:px-10">
            {hero.primaryCta.label}
          </Link>
          <button type="button" className="btn-outline-light hidden md:inline-flex" onClick={() => dialogRef.current?.showModal()}>
            <span aria-hidden>▶</span> {hero.secondaryCta.label}
          </button>
        </div>

        {campaign.items.length > 0 && (
          <aside aria-label={campaign.title} className="enter absolute bottom-[68px] right-gutter hidden w-[356px] bg-offwhite/90 p-[18px] text-preto lg:block" style={cascade(4)}>
            <p className="label-sm text-oliva">{campaign.title}</p>
            <ul className="mt-4 space-y-3">
              {campaign.items.map((p) => (
                <li key={p.id}>
                  <Link href={`/produto/${p.slug}?cor=${p.color.slug}`} className="flex items-center gap-3 hover:underline">
                    <Media image={p.image} tone={p.color.placeholderHex} pictogram={p.pictogram} className="h-[70px] w-14 shrink-0" pictogramClassName="hidden" />
                    <span>
                      <span className="block text-[15px] font-normal">{p.name}</span>
                      <span className="block text-[14px] text-texto-2">{formatBRL(p.priceCents, { compact: true })}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <button type="button" onClick={addLook} className="btn-primary mt-4 h-12 w-full">
              {campaign.cta}
            </button>
          </aside>
        )}
      </div>

      <dialog
        ref={dialogRef}
        aria-label="Filme da campanha"
        className="w-[min(960px,92vw)] bg-preto p-0 text-offwhite backdrop:bg-preto/70"
        onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}
      >
        <div className="relative aspect-video">
          {hero.videoUrl ? (
            <video src={hero.videoUrl} controls className="h-full w-full" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              <p className="font-display text-h3-sm">Filme Respiro</p>
              <p className="text-body-sm text-offwhite/75">O filme da campanha entra aqui assim que for publicado no admin.</p>
            </div>
          )}
          <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Fechar filme" className="icon-btn-round absolute right-2 top-2 bg-preto/60">
            <CloseIcon />
          </button>
        </div>
      </dialog>
    </section>
  );
}
