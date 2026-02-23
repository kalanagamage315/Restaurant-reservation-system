-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedBy" TEXT,
ADD COLUMN     "durationMins" INTEGER NOT NULL DEFAULT 90,
ADD COLUMN     "tableId" TEXT;

-- CreateIndex
CREATE INDEX "Reservation_tableId_idx" ON "Reservation"("tableId");

-- CreateIndex
CREATE INDEX "Reservation_reservedAt_idx" ON "Reservation"("reservedAt");
