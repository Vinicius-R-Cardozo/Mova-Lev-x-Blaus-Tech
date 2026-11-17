import { env } from "../env";

/**
 * Avisa a loja (Next.js) para recarregar o cache das páginas após uma mudança no admin.
 * Sem configuração, o cache expira sozinho em até 60 s.
 */
export function revalidateStore(tags: string[]) {
  if (!env.WEB_REVALIDATE_URL || !env.REVALIDATE_SECRET) return;
  void fetch(env.WEB_REVALIDATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.REVALIDATE_SECRET}` },
    body: JSON.stringify({ tags }),
    signal: AbortSignal.timeout(5000),
  }).catch(() => undefined);
}
