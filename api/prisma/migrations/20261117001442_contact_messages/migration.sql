-- CreateTable
CREATE TABLE "contact_messages" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "orderNumber" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_messages_createdAt_idx" ON "contact_messages"("createdAt");


-- RLS na nova tabela (o navegador nunca acessa direto) e sem privilégios para os papéis públicos.
ALTER TABLE "contact_messages" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "contact_messages" FROM anon, authenticated;
