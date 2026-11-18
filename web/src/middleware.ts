import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Páginas do painel que não exigem sessão (o próprio login e a redefinição de senha). */
const PUBLIC_ADMIN = ["/admin/login", "/admin/redefinir-senha"];
const STAFF = new Set(["ADMIN", "EDITOR"]);
const MFA_REQUIRED = process.env.NEXT_PUBLIC_ADMIN_MFA_REQUIRED !== "false";
const SESSION_HOURS = Number(process.env.NEXT_PUBLIC_ADMIN_SESSION_HOURS ?? 12);

type Claims = {
  aal?: string;
  amr?: { method?: string; timestamp?: number }[];
  app_metadata?: { role?: string };
};

/**
 * Proteção do /admin NO SERVIDOR: antes de entregar qualquer página do painel,
 * confere a assinatura do token da sessão (getClaims valida o JWT com as chaves do
 * Supabase), o papel (app_metadata.role, que só a service role altera), o 2º fator
 * (aal2) e a idade da sessão. Quem não passa vai para o login — a página nem chega
 * ao navegador. A API confere tudo de novo, com o papel lido do banco.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_ADMIN.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();

  let res = NextResponse.next({ request: req });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const toLogin = (motivo?: string) => {
    const login = req.nextUrl.clone();
    login.pathname = "/admin/login";
    login.search = "";
    login.searchParams.set("next", pathname + req.nextUrl.search);
    if (motivo) login.searchParams.set("motivo", motivo);
    return NextResponse.redirect(login);
  };
  if (!url || !key) return toLogin();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        // Token renovado: grava os cookies novos na resposta.
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();
  const claims = (data?.claims ?? null) as Claims | null;
  if (error || !claims) return toLogin();
  if (!STAFF.has(claims.app_metadata?.role ?? "")) return toLogin("sem_acesso");
  if (MFA_REQUIRED && claims.aal !== "aal2") return toLogin("mfa");
  const authTimes = (claims.amr ?? []).filter((a) => a.method !== "totp" && typeof a.timestamp === "number").map((a) => a.timestamp!);
  const authTime = authTimes.length ? Math.max(...authTimes) : 0;
  if (!authTime || Date.now() / 1000 - authTime > SESSION_HOURS * 3600) return toLogin("expirada");

  res.headers.set("Cache-Control", "no-store");
  return res;
}

export const config = { matcher: ["/admin", "/admin/:path*"] };
