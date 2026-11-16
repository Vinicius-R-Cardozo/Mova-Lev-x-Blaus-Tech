import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { EmailMessage, EmailProvider } from "./EmailProvider";

/** Desenvolvimento: grava o e-mail em api/.data/emails para conferência. */
class FileEmailProvider implements EmailProvider {
  readonly name = "arquivo";
  async send(m: EmailMessage) {
    const dir = path.resolve(process.cwd(), ".data/emails");
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, "-")}-${m.subject.replace(/[^\w]+/g, "-").slice(0, 40)}.html`);
    await writeFile(file, `<!-- Para: ${m.to} | Assunto: ${m.subject} -->\n${m.html}`, "utf8");
    console.log(`[email] (arquivo) para ${m.to}: ${m.subject} → ${file}`);
    return { id: file };
  }
}

/** Produção: Resend (https://resend.com) via API HTTP. */
class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}
  async send(m: EmailMessage) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...(m.idempotencyKey ? { "Idempotency-Key": m.idempotencyKey } : {}),
      },
      body: JSON.stringify({ from: this.from, to: [m.to], subject: m.subject, html: m.html, text: m.text }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
    return (await res.json()) as { id: string };
  }
}

// ⇢ Ponto de troca: outro provedor (SES, Postmark…) implementa EmailProvider.
export const emailProvider: EmailProvider = process.env.RESEND_API_KEY
  ? new ResendEmailProvider(process.env.RESEND_API_KEY, process.env.EMAIL_FROM ?? "MOVA LEV <pedidos@movalev.com.br>")
  : new FileEmailProvider();
