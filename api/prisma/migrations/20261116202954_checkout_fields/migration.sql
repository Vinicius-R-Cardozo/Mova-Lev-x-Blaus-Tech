-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "accessToken" TEXT NOT NULL,
ADD COLUMN     "installments" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "pixDiscountCents" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "orders_accessToken_key" ON "orders"("accessToken");

