"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { MODEL_LABEL, MODEL_SLUG, MODELS, type CategoryDTO } from "@movalev/shared";
import { BrandMark } from "@/components/brand/BrandMark";
import { ChevronDownIcon, CloseIcon, MenuIcon, SearchIcon, UserIcon } from "@/components/ui/icons";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { cn } from "@/lib/cn";

/** Navegação principal (pílula central). `match` decide qual item fica ativo. */
const NAV = [
  { label: "Quiz do ajuste", href: "/guia-de-tamanhos", match: (p: string) => p.startsWith("/guia-de-tamanhos") },
  { label: "Clube MOVA", href: "/conta", match: (p: string) => p.startsWith("/conta") },
  { label: "Aulas abertas", href: "/#studio", match: () => false },
] as const;
const isStore = (p: string) => p === "/" || /^\/(colecao|produto|busca)(\/|$)/.test(p);

/**
 * Header: marca à esquerda, navegação em pílula no centro (Loja abre as categorias)
 * e Entrar + Sacola à direita. Abaixo de `lg`, vira hambúrguer + marca + Sacola.
 */
export function Header({ categories }: { categories: CategoryDTO[] }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // O menu mobile só entra no DOM depois da primeira abertura.
  const [menuMounted, setMenuMounted] = useState(false);
  useEffect(() => {
    if (menuOpen) setMenuMounted(true);
  }, [menuOpen]);
  const cart = useCart();
  const { session } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  const menu = categories.filter((c) => c.showInMenu);
  const count = cart.ready ? cart.count : 0;

  return (
    <>
      <header className={cn("sticky top-0 z-header border-b bg-offwhite text-preto transition-colors duration-base", scrolled ? "border-linha" : "border-transparent")}>
        <div className="mx-auto grid h-16 max-w-site grid-cols-[auto_1fr_auto] items-center gap-2 px-2 md:h-header md:px-gutter lg:grid-cols-[1fr_auto_1fr]">
          {/* Esquerda: hambúrguer (até lg) + marca */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center lg:hidden"
              aria-label="Abrir menu"
              aria-expanded={menuOpen}
              aria-controls="menu-mobile"
              onClick={() => setMenuOpen(true)}
            >
              <MenuIcon />
            </button>
            <Link href="/" aria-label="MOVA LEV — página inicial" className="flex items-center">
              <BrandMark variant="wordmark" decorative className="h-[18px] md:h-6" />
            </Link>
          </div>

          {/* Centro: pílula de navegação (desktop) */}
          <nav aria-label="Principal" className="hidden lg:block">
            <ul className="flex items-center gap-1 rounded-full bg-white p-1.5 shadow-[0_1px_2px_rgba(26,26,26,0.04),0_0_0_1px_rgba(26,26,26,0.04)]">
              <li>
                <StoreMenu categories={menu} active={isStore(pathname)} pathname={pathname} />
              </li>
              {NAV.map((item) => {
                const active = item.match(pathname);
                return (
                  <li key={item.label}>
                    <Link href={item.href} aria-current={active ? "page" : undefined} className={cn("nav-pill", active && "nav-pill-active")}>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Direita: busca, Entrar, Sacola */}
          <div className="flex items-center justify-end gap-1 md:gap-2">
            <Link href="/busca" aria-label="Buscar" className="press hidden h-11 w-11 items-center justify-center rounded-full hover:bg-bege md:flex">
              <SearchIcon />
            </Link>
            <Link href="/conta" className="press hidden h-11 items-center rounded-full px-4 text-[15px] font-normal hover:bg-bege md:inline-flex">
              {session ? "Minha conta" : "Entrar"}
            </Link>
            <button
              type="button"
              onClick={cart.open}
              aria-label={`Abrir sacola, ${count} ${count === 1 ? "peça" : "peças"}`}
              className="press inline-flex h-11 items-center gap-1.5 rounded-full bg-areia px-5 text-[15px] font-normal hover:bg-taupe-claro md:h-12 md:px-6"
            >
              <BagCount count={count} ready={cart.ready} />
            </button>
          </div>
        </div>
      </header>
      {menuMounted && <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} categories={categories} />}
    </>
  );
}

/**
 * "Loja" na pílula: abre um painel com as categorias e os modelos de legging.
 * Clique ou teclado abrem/fecham; com mouse, abre ao passar por cima.
 */
function StoreMenu({ categories, active, pathname }: { categories: CategoryDTO[]; active: boolean; pathname: string }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number>(0);
  /** Abriu pelo hover: o clique logo em seguida não deve fechar. */
  const openedByHover = useRef(false);
  const panelId = useId();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) {
      openedByHover.current = false;
      return;
    }
    const onDown = (e: PointerEvent) => !wrapRef.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const hover = (next: boolean) => (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    window.clearTimeout(closeTimer.current);
    if (next) {
      if (!open) openedByHover.current = true;
      setOpen(true);
    } else closeTimer.current = window.setTimeout(() => setOpen(false), 160);
  };

  return (
    <div ref={wrapRef} className="relative" onPointerEnter={hover(true)} onPointerLeave={hover(false)}>
      <button
        ref={btnRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          if (openedByHover.current) {
            openedByHover.current = false;
            setOpen(true);
          } else setOpen((o) => !o);
        }}
        className={cn("nav-pill gap-1.5", active && "nav-pill-active")}
      >
        Loja
        <ChevronDownIcon width={14} height={14} className={cn("transition-transform duration-base ease-out", open && "rotate-180")} />
      </button>
      <div id={panelId} className="store-panel" data-open={open}>
        <div className="grid w-[520px] grid-cols-2 gap-8 rounded-[28px] bg-white p-7 shadow-resumo">
          <div>
            <p className="label-sm text-texto-2">Categorias</p>
            <ul className="mt-3 space-y-0.5">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/colecao/${c.slug}`} tabIndex={open ? 0 : -1} className="-mx-3 flex h-10 items-center rounded-full px-3 text-[15px] hover:bg-bege">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="label-sm text-texto-2">Leggings por modelo</p>
            <ul className="mt-3 space-y-0.5">
              {MODELS.map((m) => (
                <li key={m}>
                  <Link href={`/colecao/leggings?modelo=${MODEL_SLUG[m]}`} tabIndex={open ? 0 : -1} className="-mx-3 flex h-10 items-center rounded-full px-3 text-[15px] hover:bg-bege">
                    {MODEL_LABEL[m]}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/" tabIndex={open ? 0 : -1} className="link-underline mt-5 inline-block text-[15px]">
              Ver a loja completa
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Contador da sacola ("Sacola · n"). Quando entra peça, a pílula dá um pulso
 * suave e o número novo sobe no lugar do antigo. Ao carregar a página e ao
 * remover peças, nada anima.
 */
function BagCount({ count, ready }: { count: number; ready: boolean }) {
  const prev = useRef<number | null>(null);
  const [bumpKey, setBumpKey] = useState(0);
  useEffect(() => {
    if (!ready) return;
    if (prev.current !== null && count > prev.current) setBumpKey((k) => k + 1);
    prev.current = count;
  }, [count, ready]);
  const animate = bumpKey > 0;
  return (
    <span key={`b-${bumpKey}`} className={cn("inline-flex items-center gap-1.5", animate && "bump-soft")} aria-hidden>
      Sacola ·
      <span key={`n-${bumpKey}`} className={cn("inline-block tabular-nums", animate && "swap-up")}>
        {count}
      </span>
    </span>
  );
}

function MobileMenu({ open, onClose, categories }: { open: boolean; onClose: () => void; categories: CategoryDTO[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => onClose(), [onClose]);
  useFocusTrap(ref, open, close);
  const [expanded, setExpanded] = useState<string | null>("leggings");

  return (
    <div className={cn("fixed inset-0 z-drawer lg:hidden", open ? "visible" : "invisible")} aria-hidden={!open}>
      <div className={cn("absolute inset-0 bg-preto/40 transition-opacity duration-base", open ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <div
        ref={ref}
        id="menu-mobile"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        tabIndex={-1}
        className={cn(
          "absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col bg-offwhite transition-transform duration-slow ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-linha px-2">
          <button type="button" onClick={onClose} aria-label="Fechar menu" className="flex h-11 w-11 items-center justify-center">
            <CloseIcon />
          </button>
          <BrandMark variant="wordmark" decorative className="h-[18px]" />
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
              <Link href="/guia-de-tamanhos" className="flex h-11 items-center gap-3 text-body-sm">Quiz do ajuste</Link>
            </li>
            <li>
              <Link href="/conta" className="flex h-11 items-center gap-3 text-body-sm">Clube MOVA</Link>
            </li>
            <li>
              <Link href="/#studio" className="flex h-11 items-center gap-3 text-body-sm">Aulas abertas</Link>
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
