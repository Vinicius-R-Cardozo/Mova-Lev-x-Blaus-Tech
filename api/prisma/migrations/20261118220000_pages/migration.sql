-- CreateTable
CREATE TABLE "pages" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "emphasis" TEXT,
    "kicker" TEXT,
    "intro" TEXT,
    "body" TEXT NOT NULL,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "showToc" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "system" BOOLEAN NOT NULL DEFAULT false,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pages_slug_key" ON "pages"("slug");


-- RLS: só a API acessa.
ALTER TABLE "pages" ENABLE ROW LEVEL SECURITY;
