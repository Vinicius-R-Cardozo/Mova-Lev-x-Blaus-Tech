"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { ROLE_LABEL, type AdminRole } from "@movalev/shared";
import { BrandMark } from "@/components/brand/BrandMark";
import { CloseIcon, MenuIcon } from "@/components/ui/icons";
import { FeedbackProvider } from "@/components/admin/feedback";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";

type Me = { id: string; email: string; name: string | null; role: AdminRole; mustChangePassword: boolean };

/** Módulos do painel. `admin: true` = só Administrador (a API também bloqueia). */
export const ADMIN_NAV: { href: string; label: string; admin?: boolean; group: string }[] = [
  { href: "/admin", label: "Resumo", admin: true, group: "Vendas" },
  { href: "/admin/pedidos", label: "Pedidos", admin: true, group: "Vendas" },
  { href: "/admin/cupons", label: "Cupons", admin: true, group: "Vendas" },
  { href: "/admin/produtos", label: "Produtos", group: "Catálogo" },
  { href: "/admin/estoque", label: "Estoque", group: "Catálogo" },
  { href: "/admin/conteudo", label: "Home e coleções", group: "Conteúdo" },
  { href: "/admin/regras", label: "Desconto e frete", admin: true, group: "Loja" },
  { href: "/admin/newsletter", label: "Newsletter", admin: true, group: "Loja" },
  { href: "/admin/atividades", label: "Atividades", admin: true, group: "Loja" },
];

const PUBLIC = ["/admin/login", "/admin/redefinir-senha"];
const IDLE_MINUTES = 30;

const MeCtx = createContext<Me | null>(null);
/** Usuário do painel (papel já confirmado pela API). */
export const useAdminMe = () => useContext(MeCtx);

const isActive = (href: string, pathname: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`));

/**
 * Casca do painel. A proteção de verdade está no servidor (middleware do Next confere
 * o token antes de entregar a página; a API confere papel e 2º fator em toda chamada).
 * Aqui só montamos o menu conforme o papel, a saída por inatividade e os avisos.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (PUBLIC.some((p) => pathname.startsWith(p))) return <>{children}</>;
  return (
    <FeedbackProvider>
      <Shell>{children}</Shell>
    </FeedbackProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!auth.ready || !auth.session) return;
    auth
      .apiFetch<Me>("/admin/me")
      .then((m) => {
        // Senha provisória: termina o 1º acesso antes de usar o painel.
        if (m.mustChangePassword) window.location.assign(`/admin/login?next=${encodeURIComponent(pathname)}&motivo=mfa`);
        setMe(m);
      })
      .catch(() => setLoadError(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recarrega só quando a sessão muda
  }, [auth.ready, auth.session?.access_token]);

  useEffect(() => setMenuOpen(false), [pathname]);

  const signOut = useCallback(
    async (motivo?: string) => {
      await auth.signOut();
      window.location.assign(`/admin/login${motivo ? `?motivo=${motivo}` : ""}`);
    },
    [auth],
  );
  useIdleLogout(() => void signOut("inatividade"));

  const allowed = ADMIN_NAV.filter((n) => !n.admin || me?.role === "ADMIN");
  const current = ADMIN_NAV.find((n) => isActive(n.href, pathname));
  const blocked = me && current?.admin && me.role !== "ADMIN";
  // Editor que abre /admin cai em Produtos.
  useEffect(() => {
    if (me && me.role !== "ADMIN" && pathname === "/admin") window.location.replace("/admin/produtos");
  }, [me, pathname]);

  const groups = [...new Set(allowed.map((n) => n.group))];
  const nav = (
    <nav aria-label="Módulos do painel" className="px-3 py-5">
      {groups.map((g) => (
        <div key={g} className="mb-5">
          <p className="label-sm px-3 pb-2 text-texto-2">{g}</p>
          <ul>
            {allowed
              .filter((n) => n.group === g)
              .map((n) => {
                const active = isActive(n.href, pathname);
                return (
                  <li key={n.href}>
                    <Link
                      href={n.href}
                      aria-current={active ? "page" : undefined}
                      className={cn("flex min-h-touch items-center border-l-2 px-3 text-[15px] transition-colors", active ? "border-oliva bg-offwhite font-normal" : "border-transparent font-light text-texto-3 hover:bg-offwhite/60 hover:text-preto")}
                    >
                      {n.label}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <MeCtx.Provider value={me}>
      <div className="min-h-screen bg-offwhite">
        <header className="sticky top-0 z-header flex h-16 items-center justify-between border-b border-linha bg-offwhite px-2 md:px-6">
          <div className="flex items-center gap-1">
            <button type="button" className="flex h-11 w-11 items-center justify-center lg:hidden" aria-label="Abrir menu do painel" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
              <MenuIcon />
            </button>
            <Link href="/admin" className="flex items-center gap-3" aria-label="Painel MOVA LEV">
              <BrandMark variant="wordmark" decorative className="h-5" />
              <span className="label-sm text-texto-2">Painel</span>
            </Link>
          </div>
          <div className="flex items-center gap-3 text-[14px] md:gap-5">
            {me && (
              <span className="hidden text-right leading-tight md:block">
                <span className="block font-normal">{me.name ?? me.email}</span>
                <span className="label-sm text-texto-2">{ROLE_LABEL[me.role]}</span>
              </span>
            )}
            <Link href="/" className="hidden hover:underline sm:inline">
              Ver loja
            </Link>
            <button type="button" onClick={() => void signOut()} className="min-h-touch px-2 text-texto-2 hover:text-preto">
              Sair
            </button>
          </div>
        </header>

        <div className="lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
          <aside className="hidden border-r border-linha bg-bege/50 lg:block lg:min-h-[calc(100vh-64px)]">{nav}</aside>

          {/* Menu no celular */}
          <div className={cn("fixed inset-0 z-drawer lg:hidden", menuOpen ? "visible" : "invisible")} aria-hidden={!menuOpen}>
            <div className={cn("absolute inset-0 bg-preto/40 transition-opacity duration-base", menuOpen ? "opacity-100" : "opacity-0")} onClick={() => setMenuOpen(false)} />
            <div className={cn("absolute inset-y-0 left-0 w-[82%] max-w-xs overflow-y-auto bg-bege transition-transform duration-slow ease-out", menuOpen ? "translate-x-0" : "-translate-x-full")}>
              <div className="flex h-16 items-center justify-between border-b border-linha px-3">
                <span className="label-sm px-2 text-texto-2">Painel</span>
                <button type="button" aria-label="Fechar menu" className="flex h-11 w-11 items-center justify-center" onClick={() => setMenuOpen(false)}>
                  <CloseIcon />
                </button>
              </div>
              {nav}
            </div>
          </div>

          <main id="conteudo" className="min-w-0 p-4 md:p-8 lg:p-10">
            {loadError ? (
              <p className="text-erro">Não foi possível carregar o painel. Recarregue a página.</p>
            ) : !me ? (
              <div role="status" aria-label="Carregando" className="space-y-4">
                <div className="skeleton h-10 w-64" />
                <div className="skeleton h-40" />
              </div>
            ) : blocked ? (
              <div>
                <h1 className="text-[40px] leading-none">Sem permissão</h1>
                <p className="mt-3 font-light">Esta área é só para administradores. Peça acesso a quem administra a loja.</p>
              </div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </MeCtx.Provider>
  );
}

/** Sai do painel depois de IDLE_MINUTES sem mexer em nada (vale entre abas). */
function useIdleLogout(onIdle: () => void) {
  const cb = useRef(onIdle);
  cb.current = onIdle;
  useEffect(() => {
    const KEY = "movalev:admin:atividade";
    const mark = () => {
      try {
        localStorage.setItem(KEY, String(Date.now()));
      } catch {
        /* sem storage: conta só esta aba */
      }
      last = Date.now();
    };
    let last = Date.now();
    mark();
    const events = ["pointerdown", "keydown", "scroll", "visibilitychange"] as const;
    let throttle = 0;
    const onAct = () => {
      if (Date.now() - throttle > 15_000) {
        throttle = Date.now();
        mark();
      }
    };
    events.forEach((e) => window.addEventListener(e, onAct, { passive: true }));
    const timer = window.setInterval(() => {
      let shared = last;
      try {
        shared = Math.max(last, Number(localStorage.getItem(KEY) ?? 0));
      } catch {
        /* ignore */
      }
      if (Date.now() - shared > IDLE_MINUTES * 60_000) cb.current();
    }, 30_000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, onAct));
      window.clearInterval(timer);
    };
  }, []);
}
