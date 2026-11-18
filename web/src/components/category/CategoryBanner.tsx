import Image from "next/image";
import type { CategoryDTO } from "@movalev/shared";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

/** Silhueta e linha da campanha (enquanto a categoria não tem foto de banner). */
function BannerArt() {
  return (
    <>
      <div aria-hidden className="hero-settle absolute right-[18%] top-0 h-[120%] w-[16%] rounded-[50%] bg-[#C9B49F]/35" />
      <svg aria-hidden className="absolute inset-0 h-full w-full" viewBox="0 0 1440 380" preserveAspectRatio="none" fill="none">
        <path d="M0 360C500 270 1000 190 1440 130" stroke="#F5F2EE" strokeOpacity=".7" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
    </>
  );
}

export function CategoryBanner({ category }: { category: CategoryDTO }) {
  return (
    <section
      aria-labelledby="categoria-titulo"
      className="relative h-[230px] overflow-hidden md:h-[380px]"
      style={{ background: `linear-gradient(160deg, ${category.tone} 0%, #DCC9B6 60%, #CDB9A5 100%)` }}
    >
      {category.bannerUrl ? (
        <>
          <Image src={category.bannerUrl} alt="" fill priority sizes="100vw" className="hero-settle object-cover object-[70%_center]" />
          {/* Véu claro à esquerda: o título continua legível sobre a foto. */}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-offwhite/90 via-offwhite/55 to-transparent md:via-offwhite/35" />
        </>
      ) : (
        <BannerArt />
      )}
      <div className="container-site relative flex h-full flex-col justify-center md:px-[60px]">
        <div className="enter">
          <Breadcrumb items={[{ name: "Início", href: "/" }, { name: category.name }]} className="text-[10px] md:text-label" />
        </div>
        <h1 id="categoria-titulo" style={{ "--i": 1 } as React.CSSProperties} className="enter-rise mt-3 text-[52px] leading-none md:mt-5 md:text-[96px]">
          {category.name}
        </h1>
        {category.description && (
          <p style={{ "--i": 2 } as React.CSSProperties} className="enter mt-3 hidden max-w-[540px] text-body-lg font-light text-texto-3 md:block">
            {category.description}
          </p>
        )}
      </div>
    </section>
  );
}
