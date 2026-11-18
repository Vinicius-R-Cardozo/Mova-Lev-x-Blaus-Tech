"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useAuth } from "@/lib/auth";
import { LoginForm } from "@/components/account/LoginForm";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/conta", label: "Pedidos" },
  { href: "/conta/enderecos", label: "Endereços" },
  { href: "/conta/favoritos", label: "Favoritos" },
  { href: "/conta/dados", label: "Dados pessoais" },
];

function Gate({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const pathname = usePathname();
  const params = useSearchParams();

  if (!auth.ready) {
    return <p role="status" className="py-24 text-body">Carregando…</p>;
  }
  if (!auth.session) {
    return (
      <div className="py-16 md:py-24">
        <LoginForm next={params.get("next") ?? pathname} />
      </div>
    );
  }
  return (
    <div className="grid gap-10 py-12 md:grid-cols-[220px_1fr] md:gap-16 md:py-16">
      <aside>
        <p className="label-sm text-texto-2">Minha conta</p>
        <p className="mt-2 truncate text-body-sm" title={auth.session.user.email}>
          {auth.profile?.name ?? auth.session.user.email}
        </p>
        <nav aria-label="Minha conta" className="mt-6">
          <ul className="flex gap-x-5 overflow-x-auto md:block md:space-y-1">
            {NAV.map((n) => {
              const active = n.href === "/conta" ? pathname === "/conta" || pathname.startsWith("/conta/pedidos") : pathname.startsWith(n.href);
              return (
                <li key={n.href} className="shrink-0">
                  <Link href={n.href} aria-current={active ? "page" : undefined} className={cn("flex min-h-touch items-center text-[16px]", active ? "font-normal underline decoration-1 underline-offset-[6px]" : "font-light text-texto-3 hover:text-preto")}>
                    {n.label}
                  </Link>
                </li>
              );
            })}
            {(auth.profile?.role === "ADMIN" || auth.profile?.role === "EDITOR") && (
              <li className="shrink-0">
                <Link href="/admin" className="flex min-h-touch items-center text-[16px] font-light text-oliva hover:underline">
                  Painel admin
                </Link>
              </li>
            )}
            <li className="shrink-0">
              <button type="button" onClick={() => void auth.signOut()} className="flex min-h-touch items-center text-[16px] font-light text-texto-2 hover:text-preto">
                Sair
              </button>
            </li>
          </ul>
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function ContaShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-site">
      <Suspense fallback={<p className="py-24">Carregando…</p>}>
        <Gate>{children}</Gate>
      </Suspense>
    </div>
  );
}
