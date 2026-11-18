import type { FastifyInstance, FastifyReply } from "fastify";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { pageInputSchema, siteContentSchema, type PageDTO, type SiteContent } from "@movalev/shared";
import { prisma } from "../lib/prisma";
import { cached, clearCache } from "../lib/cache";
import { audit } from "../lib/audit";
import { revalidateStore } from "../lib/revalidate";

const cache = (reply: FastifyReply, seconds: number) => reply.header("Cache-Control", `public, max-age=30, s-maxage=${seconds}, stale-while-revalidate=300`);
const slugParam = z.string().regex(/^[a-z0-9-]+$/).max(60);
const staff = { config: { allow: "staff" as const } };

export function siteContent(): Promise<SiteContent> {
  return cached("settings:site", 60_000, async () => {
    const row = await prisma.setting.findUnique({ where: { key: "site" } });
    const parsed = siteContentSchema.safeParse(row?.value ?? {});
    return parsed.success ? parsed.data : siteContentSchema.parse({});
  });
}

const toDTO = (p: Prisma.PageGetPayload<object>): PageDTO => ({ ...p, updatedAt: p.updatedAt.toISOString() });

/** Conteúdo público: barra de aviso, menu, vantagens, rodapé e páginas de texto. */
export async function contentRoutes(app: FastifyInstance) {
  app.get("/catalog/site", async (_req, reply) => {
    cache(reply, 60);
    return siteContent();
  });

  app.get<{ Params: { slug: string } }>("/catalog/pages/:slug", async (req, reply) => {
    const p = await prisma.page.findUnique({ where: { slug: slugParam.parse(req.params.slug) } });
    if (!p || !p.published) return reply.code(404).send({ error: "nao_encontrado", message: "Página não encontrada." });
    cache(reply, 60);
    return toDTO(p);
  });
}

/** Painel: páginas e conteúdo do site (Admin e Editor). */
export async function adminContentRoutes(app: FastifyInstance) {
  app.get("/admin/settings/site", staff, async () => siteContent());

  app.put("/admin/settings/site", staff, async (req) => {
    const input = siteContentSchema.parse(req.body);
    const prev = await siteContent();
    await prisma.setting.upsert({ where: { key: "site" }, create: { key: "site", value: input }, update: { value: input } });
    clearCache();
    const parts: string[] = [];
    if (JSON.stringify(prev.announcement) !== JSON.stringify(input.announcement)) parts.push(`barra de aviso ${input.announcement.enabled ? "ligada" : "desligada"}`);
    if (JSON.stringify(prev.nav) !== JSON.stringify(input.nav)) parts.push("menu do topo");
    if (JSON.stringify(prev.benefits) !== JSON.stringify(input.benefits)) parts.push("vantagens");
    if (JSON.stringify(prev.footer) !== JSON.stringify(input.footer)) parts.push("rodapé");
    await audit(req, { action: "content.site", entity: "conteudo", entityId: "site", summary: `Editou ${parts.join(", ") || "o conteúdo do site (sem mudanças)"}`, before: prev, after: input });
    revalidateStore(["store", "home"]);
    return input;
  });

  app.get("/admin/pages", staff, async () => (await prisma.page.findMany({ orderBy: [{ system: "desc" }, { title: "asc" }] })).map(toDTO));

  app.get<{ Params: { id: string } }>("/admin/pages/:id", staff, async (req, reply) => {
    const p = await prisma.page.findUnique({ where: { id: z.string().uuid().parse(req.params.id) } });
    return p ? toDTO(p) : reply.code(404).send({ error: "nao_encontrado", message: "Página não encontrada." });
  });

  app.post("/admin/pages", staff, async (req, reply) => {
    const input = pageInputSchema.parse(req.body);
    try {
      const p = await prisma.page.create({ data: { ...input, updatedBy: req.user!.email } });
      await audit(req, { action: "page.create", entity: "pagina", entityId: p.id, summary: `Criou a página /pagina/${p.slug}` });
      revalidateStore(["pages"]);
      return reply.code(201).send(toDTO(p));
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return reply.code(409).send({ error: "duplicado", message: "Já existe uma página com esse endereço." });
      throw err;
    }
  });

  app.put<{ Params: { id: string } }>("/admin/pages/:id", staff, async (req, reply) => {
    const pageId = z.string().uuid().parse(req.params.id);
    const input = pageInputSchema.parse(req.body);
    const prev = await prisma.page.findUnique({ where: { id: pageId } });
    if (!prev) return reply.code(404).send({ error: "nao_encontrado", message: "Página não encontrada." });
    // Páginas da loja têm endereço fixo (links do site e do rodapé apontam para elas).
    const data = { ...input, slug: prev.system ? prev.slug : input.slug, published: prev.system ? true : input.published, updatedBy: req.user!.email };
    try {
      const p = await prisma.page.update({ where: { id: pageId }, data });
      await audit(req, { action: "page.update", entity: "pagina", entityId: p.id, summary: `Editou a página “${p.title}${p.emphasis ? ` ${p.emphasis}` : ""}”`, before: { title: prev.title, body: prev.body.slice(0, 2000) }, after: { title: p.title, body: p.body.slice(0, 2000) } });
      revalidateStore(["pages", "store"]);
      return toDTO(p);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return reply.code(409).send({ error: "duplicado", message: "Já existe uma página com esse endereço." });
      throw err;
    }
  });

  app.delete<{ Params: { id: string } }>("/admin/pages/:id", staff, async (req, reply) => {
    const p = await prisma.page.findUnique({ where: { id: z.string().uuid().parse(req.params.id) } });
    if (!p) return reply.code(204).send();
    if (p.system) return reply.code(409).send({ error: "pagina_da_loja", message: "Páginas da loja não podem ser excluídas; edite o texto." });
    await prisma.page.delete({ where: { id: p.id } });
    await audit(req, { action: "page.delete", entity: "pagina", entityId: p.id, summary: `Excluiu a página /pagina/${p.slug}`, before: { title: p.title, body: p.body.slice(0, 2000) } });
    revalidateStore(["pages"]);
    return reply.code(204).send();
  });
}
