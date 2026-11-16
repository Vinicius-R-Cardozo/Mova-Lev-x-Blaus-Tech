export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Evita envio duplicado no provedor (Resend aceita Idempotency-Key). */
  idempotencyKey?: string;
}

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<{ id: string }>;
}
