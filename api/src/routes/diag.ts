import { connect } from "node:net";
import { timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";

/**
 * DIAGNÓSTICO TEMPORÁRIO de desempenho (rede x CPU). Protegido pelo REVALIDATE_SECRET.
 * Não expõe segredos: só tempos, porta do pooler e variáveis RENDER_* de região/plano.
 */
export async function diagRoutes(app: FastifyInstance) {
  app.get("/health/diag", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req, reply) => {
    const secret = process.env.REVALIDATE_SECRET ?? "";
    const given = String((req.headers.authorization ?? "").replace(/^Bearer /, ""));
    if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) return reply.code(404).send();

    const url = new URL(process.env.DATABASE_URL!);
    const tcp = (): Promise<number> =>
      new Promise((resolve) => {
        const s = performance.now();
        const sock = connect({ host: url.hostname, port: Number(url.port || 5432) }, () => {
          resolve(performance.now() - s);
          sock.destroy();
        });
        sock.on("error", () => resolve(-1));
      });
    const tcpMs = [await tcp(), await tcp(), await tcp()].map(Math.round);

    const q: number[] = [];
    for (let i = 0; i < 5; i++) {
      const s = performance.now();
      await prisma.$queryRaw`SELECT 1`;
      q.push(Math.round(performance.now() - s));
    }

    // Trabalho de CPU fixo: comparar com a mesma medida no computador local.
    const s = performance.now();
    let x = 0;
    for (let i = 0; i < 5_000_000; i++) x = (x + i * 7) % 1000003;
    const cpuMs = Math.round(performance.now() - s);

    return {
      dbPort: url.port,
      dbParams: [...url.searchParams.keys()],
      tcpConnectMs: tcpMs,
      selectMs: q,
      cpuLoopMs: cpuMs,
      cpuCheck: x,
      render: Object.fromEntries(Object.entries(process.env).filter(([k]) => /^RENDER_(REGION|INSTANCE_TYPE|SERVICE_TYPE|SERVICE_NAME)$/.test(k))),
    };
  });
}
