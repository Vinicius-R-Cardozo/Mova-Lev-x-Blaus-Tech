import { revalidateTag } from "next/cache";
import { timingSafeEqual } from "node:crypto";

const ALLOWED = new Set(["home", "catalog", "categories", "store", "pages"]);

/** Chamado pela API após mudanças no admin: recarrega o cache das páginas da loja. */
export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET ?? "";
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return Response.json({ error: "nao_autorizado" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { tags?: unknown };
  const tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === "string" && ALLOWED.has(t)) : [];
  for (const t of tags) revalidateTag(t);
  return Response.json({ revalidated: tags });
}
