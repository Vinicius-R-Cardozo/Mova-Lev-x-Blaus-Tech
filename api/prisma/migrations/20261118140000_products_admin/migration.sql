-- AlterEnum
ALTER TYPE "ProductStatus" ADD VALUE 'HIDDEN';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "compareAtPriceCents" INTEGER,
ADD COLUMN     "seoDescription" TEXT,
ADD COLUMN     "seoTitle" TEXT;

