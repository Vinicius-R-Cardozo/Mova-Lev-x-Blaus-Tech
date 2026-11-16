"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { MODEL_LABEL, MODEL_SLUG, MODELS, type CategoryDTO } from "@movalev/shared";
import { Wordmark } from "@/components/brand/Wordmark";
import { BagIcon, ChevronDownIcon, CloseIcon, MenuIcon, SearchIcon, UserIcon } from "@/components/ui/icons";
import { useCart } from "@/lib/cart";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { cn } from "@/lib/cn";

/**
 * Header em grid de 3 colunas. Na Home fica transparente sobre o hero
 * (e ganha fundo ao rolar); nas outras páginas é sólido com borda inferior.
 */
export function Header({ categories }: { categories: CategoryDTO[] }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const cart = useCart();

  useEffect(() => {
    if (!isHome) return;
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  useEffect(() => setMenuOpen(false), [pathname]);

  const overlay = isHome && !scrolled && !menuOpen;
  const menu = categories.filter((c) => c.showInMenu);
  const activeSlug = pathname.startsWith("/colecao/") ? pathname.split("/")[2] : null;

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-header transition-colors duration-300",
          isHome && "-mb-[64px] md:-mb-header",
          overlay ? "bg-transparent text-offwhite on-dark" : "border-b border-linha bg-offwhite text-preto",
        )}
      >
        <div className="mx-auto grid h-16 max-w-site grid-cols-[1fr_auto_1fr] items-center px-2 md:h-header md:px-gutter">
          {/* Esquerda: menu (desktop) / hambúrguer (mobile) */}
          <nav aria-label="Categorias" className="hidden md:block">
            <ul className="flex gap-6">
              {menu.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/colecao/${c.slug}`}
                    aria-current={activeSlug === c.slug ? "page" : undefined}
                    className={cn(
                      "label inline-flex min-h-touch items-center decoration-1 underline-offset-[7px] hover:underline",
                      activeSlug === c.slug && "underline",
                    )}
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center md:hidden"
            aria-label="Abrir menu"
            aria-expanded={menuOpen}
            aria-controls="menu-mobile"
            onClick={() => setMenuOpen(true)}
          >
            <MenuIcon />
          </button>

          {/* Centro: wordmark */}
          <Link href="/" aria-label="MOVA LEV — página inicial" className="flex justify-center">
            <Wordmark className="h-[18px] w-auto md:h-7" title="MOVA LEV" aria-hidden />
          </Link>

          {/* Direita: Studio, busca, conta, sacola */}
          <div className="flex items-center justify-end gap-1 md:gap-5">
            <Link href="/#studio" className="label hidden min-h-touch items-center px-2 hover:underline hover:underline-offset-[7px] lg:inline-flex">
              Studio
            </Link>
            <Link href="/busca" aria-label="Buscar" className="hidden h-11 w-11 items-center justify-center md:flex">
              <SearchIcon />
            </Link>
            <Link href="/conta" aria-label="Minha conta" className="hidden h-11 w-11 items-center justify-center md:flex">
              <UserIcon />
            </Link>
            <button
              type="button"
              onClick={cart.open}
              aria-label={`Abrir sacola, ${cart.count} ${cart.count === 1 ? "peça" : "peças"}`}
              className="flex h-11 min-w-touch items-center justify-center gap-1.5 px-1"
            >
              <BagIcon />
              <span className="text-[13px] font-normal tabular-nums" aria-hidden>
                {cart.ready ? cart.count : 0}
              </span>
            </button>
          </div>
        </div>
      </header>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} categories={categories} />
    </>
  );
}

function MobileMenu({ open, onClose, categories }: { open: boolean; onClose: () => void; categories: CategoryDTO[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => onClose(), [onClose]);
  useFocusTrap(ref, open, close);
  const [expanded, setExpanded] = useState<string | null>("leggings");

  return (
    <div className={cn("fixed inset-0 z-drawer md:hidden", open ? "visible" : "invisible")} aria-hidden={!open}>
      <div className={cn("absolute inset-0 bg-preto/40 transition-opacity duration-300", open ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <div
        ref={ref}
        id="menu-mobile"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        tabIndex={-1}
        className={cn(
          "absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col bg-offwhite transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-linha px-2">
          <button type="button" onClick={onClose} aria-label="Fechar menu" className="flex h-11 w-11 items-center justify-center">
            <CloseIcon />
          </button>
          <Wordmark className="h-[18px] w-auto" aria-hidden />
          <span className="w-11" />
        </div>
        <nav aria-label="Menu principal" className="flex-1 overflow-y-auto px-5 py-2">
          <ul>
            {categories.map((c) => {
              const hasSub = c.slug === "leggings";
              const isOpen = expanded === c.slug;
              return (
                <li key={c.slug} className="border-b border-linha">
                  {hasSub ? (
                    <>
                      <button
                        type="button"
                        className="label flex h-14 w-full items-center justify-between"
                        aria-expanded={isOpen}
                        aria-controls={`sub-${c.slug}`}
                        onClick={() => setExpanded(isOpen ? null : c.slug)}
                      >
                        {c.name}
                        <ChevronDownIcon className={cn("transition-transform", isOpen && "rotate-180")} />
                      </button>
                      <ul id={`sub-${c.slug}`} hidden={!isOpen} className="pb-3">
                        <li>
                          <Link href={`/colecao/${c.slug}`} className="flex h-11 items-center pl-4 text-body-sm">
                            Todas
                          </Link>
                        </li>
                        {MODELS.map((m) => (
                          <li key={m}>
                            <Link href={`/colecao/${c.slug}?modelo=${MODEL_SLUG[m]}`} className="flex h-11 items-center pl-4 text-body-sm">
                              {MODEL_LABEL[m]}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <Link href={`/colecao/${c.slug}`} className="label flex h-14 items-center">
                      {c.name}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
          <ul className="mt-6 space-y-1">
            <li>
              <Link href="/#studio" className="flex h-11 items-center gap-3 text-body-sm">Studio MOVA</Link>
            </li>
            <li>
              <Link href="/busca" className="flex h-11 items-center gap-3 text-body-sm"><SearchIcon width={18} height={18} /> Buscar</Link>
            </li>
            <li>
              <Link href="/conta" className="flex h-11 items-center gap-3 text-body-sm"><UserIcon width={18} height={18} /> Minha conta</Link>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
