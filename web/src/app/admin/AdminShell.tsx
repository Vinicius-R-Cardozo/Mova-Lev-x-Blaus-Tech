"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/brand/Wordmark";
import { LoginForm } from "@/components/account/LoginForm";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/admin", label: "Resumo" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/produtos", label: "Produtos" },
  { href: "/admin/conteudo", label: "Home e coleções" },
  { href: "/admin/cupons", label: "Cupons" },
  { href: "/admin/regras", label: "Desconto e frete" },
  { href: "/admin/newsletter", label: "Newsletter" },
];

/** Painel admin: só para usuários com papel ADMIN (a API confere de novo em toda chamada). */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const pathname = usePathname();

  let body: React.ReactNode;
  if (!auth.ready || (auth.session && !auth.profile)) body = <p role="status" className="p-10">Carregando…</p>;
  else if (!auth.session) body = <div className="p-6 md:p-12"><LoginForm next="/admin" /></div>;
  else if (auth.profile?.role !== "ADMIN")
    body = (
      <div className="p-6 md:p-12">
        <h1 className="text-h3">Acesso restrito</h1>
        <p className="mt-3 text-body font-light">Sua conta ({auth.session.user.email}) não tem permissão de administração.</p>
        <Link href="/" className="btn-secondary mt-6">Voltar à loja</Link>
      </div>
    );
  else
    body = (
      <div className="md:grid md:grid-cols-[220px_1fr]">
        <nav aria-label="Painel" className="border-b border-linha bg-bege/60 md:min-h-[calc(100vh-64px)] md:border-b-0 md:border-r">
          <ul className="flex overflow-x-auto px-3 py-2 md:block md:px-4 md:py-6">
            {NAV.map((n) => {
              const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
              return (
                <li key={n.href} className="shrink-0">
                  <Link href={n.href} aria-current={active ? "page" : undefined} className={cn("flex min-h-touch items-center px-3 text-[15px]", active ? "bg-offwhite font-normal" : "font-light text-texto-3 hover:text-preto")}>
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <main id="conteudo" className="min-w-0 p-4 md:p-10">{children}</main>
      </div>
    );

  return (
    <div className="min-h-screen">
      <header className="flex h-16 items-center justify-between border-b border-linha bg-offwhite px-4 md:px-6">
        <Link href="/admin" className="flex items-center gap-3" aria-label="Painel MOVA LEV">
          <Wordmark className="h-5 w-auto" aria-hidden />
          <span className="label-sm text-texto-2">Painel</span>
        </Link>
        <div className="flex items-center gap-5 text-[14px]">
          <Link href="/" className="hover:underline">Ver loja</Link>
          {auth.session && (
            <button type="button" onClick={() => void auth.signOut()} className="min-h-touch text-texto-2 hover:text-preto">
              Sair
            </button>
          )}
        </div>
      </header>
      {body}
    </div>
  );
}
