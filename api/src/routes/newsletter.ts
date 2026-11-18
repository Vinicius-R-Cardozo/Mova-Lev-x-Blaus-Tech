import type { FastifyInstance } from "fastify";
import { newsletterInputSchema } from "@movalev/shared";
import { prisma } from "../lib/prisma";
import { withIdempotency } from "../lib/idempotency";

export async function newsletterRoutes(app: FastifyInstance) {
  app.post(
    "/newsletter",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (req, reply) =>
      withIdempotency(req, reply, "newsletter", async () => {
        const input = newsletterInputSchema.parse(req.body);
        // Upsert pelo e-mail único: mesmo e-mail duas vezes nunca duplica.
        await prisma.newsletterSubscriber.upsert({
          where: { email: input.email },
          create: { email: input.email, source: input.source },
          update: { unsubscribedAt: null },
        });
        return {
          status: 201,
          body: { ok: true, message: "Que bom ter você por aqui. Seu cupom de 10% já está a caminho do seu e-mail." },
        };
      }),
  );
}
