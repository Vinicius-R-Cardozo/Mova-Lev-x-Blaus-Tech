import type { FastifyInstance } from "fastify";
import { storeSettings } from "../lib/settings";
import { CONTACT_SUBJECT_LABEL, contactInputSchema } from "@movalev/shared";
import { prisma } from "../lib/prisma";
import { withIdempotency } from "../lib/idempotency";
import { emailProvider } from "../providers/email";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function contactRoutes(app: FastifyInstance) {
  app.post("/contact", { config: { rateLimit: { max: 5, timeWindow: "10 minutes" } } }, async (req, reply) =>
    withIdempotency(req, reply, "contact", async () => {
      const input = contactInputSchema.parse(req.body);
      const saved = await prisma.contactMessage.create({
        data: { name: input.name, email: input.email, subject: input.subject, orderNumber: input.orderNumber?.replace("#", "") ?? null, message: input.message },
      });
      // E-mail de atendimento do painel (Configurações › Loja); senão, a variável de ambiente.
      const to = (await storeSettings()).contactEmail || process.env.STORE_EMAIL;
      if (to) {
        const subject = `[Contato] ${CONTACT_SUBJECT_LABEL[input.subject]}${input.orderNumber ? ` · pedido ${input.orderNumber}` : ""} — ${input.name}`;
        await emailProvider
          .send({
            to,
            subject,
            idempotencyKey: `contato-${saved.id}`,
            text: `${input.name} <${input.email}>\n\n${input.message}`,
            html: `<p><strong>${esc(input.name)}</strong> &lt;${esc(input.email)}&gt;</p><p>${esc(input.message).replace(/\n/g, "<br>")}</p>`,
          })
          .catch((err) => req.log.error({ err }, "falha ao encaminhar contato"));
      }
      return { status: 201, body: { ok: true, message: "Recebemos a sua mensagem, com todo o cuidado. Respondemos em até 1 dia útil." } };
    }),
  );
}
