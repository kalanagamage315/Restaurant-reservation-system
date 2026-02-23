-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedBy" TEXT;

-- CreateIndex
CREATE INDEX "Reservation_confirmedBy_idx" ON "Reservation"("confirmedBy");
