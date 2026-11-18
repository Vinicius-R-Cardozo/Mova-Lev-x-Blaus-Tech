import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { ZodError } from "zod";
import { env } from "./env";
import { healthRoutes } from "./routes/health";
import { meRoutes } from "./routes/me";
import { catalogRoutes } from "./routes/catalog";
import { newsletterRoutes } from "./routes/newsletter";
import { cartRoutes } from "./routes/cart";
import { checkoutRoutes } from "./routes/checkout";
import { paymentRoutes } from "./routes/payments";
import { adminRoutes } from "./routes/admin";
import { adminAuthRoutes } from "./routes/adminAuth";
import { contactRoutes } from "./routes/contact";

const LOCALHOST = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export async function buildApp() {
  const app = Fastify({
    logger: { level: env.NODE_ENV === "production" ? "info" : "debug" },
    trustProxy: true, // Render fica atrás de proxy: IP real vem do X-Forwarded-For.
    bodyLimit: 1_000_000,
  });

  await app.register(helmet, {
    // API só devolve JSON; CSP restritiva.
    contentSecurityPolicy: { useDefaults: false, directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    frameguard: { action: "deny" },
    crossOriginResourcePolicy: { policy: "same-site" },
  });

  await app.register(cors, {
    origin: (origin, cb) => {
      // Sem Origin = chamada servidor-a-servidor (Next SSR, health check, webhooks).
      if (!origin) return cb(null, true);
      if (env.CORS_ORIGINS.includes(origin) || LOCALHOST.test(origin)) return cb(null, true);
      // Origem desconhecida: responde sem cabeçalhos CORS (o navegador bloqueia).
      cb(null, false);
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  });

  // Limite global generoso; rotas sensíveis (login, checkout, newsletter) definem o próprio.
  await app.register(rateLimit, { global: true, max: 300, timeWindow: "1 minute" });

  app.setErrorHandler((err: FastifyError | ZodError, req, reply) => {
    if (err instanceof ZodError) {
      return reply.code(400).send({ error: "dados_invalidos", message: "Confira os dados enviados.", issues: err.issues });
    }
    const status = err.statusCode ?? 500;
    if (status >= 500) {
      req.log.error(err);
      return reply.code(status).send({ error: "erro_interno", message: "Algo deu errado. Tente de novo." });
    }
    return reply.code(status).send({ error: err.code ?? "erro", message: err.message });
  });

  await app.register(healthRoutes);
  await app.register(meRoutes);
  await app.register(catalogRoutes);
  await app.register(newsletterRoutes);
  await app.register(cartRoutes);
  await app.register(checkoutRoutes);
  await app.register(paymentRoutes);
  await app.register(adminAuthRoutes);
  await app.register(adminRoutes);
  await app.register(contactRoutes);

  return app;
}
