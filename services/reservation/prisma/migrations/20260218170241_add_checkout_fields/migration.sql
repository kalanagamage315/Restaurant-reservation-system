-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "checkedOutBy" TEXT,
ADD COLUMN     "durationMins" INTEGER NOT NULL DEFAULT 90;

-- CreateIndex
CREATE INDEX "Reservation_checkedOutBy_idx" ON "Reservation"("checkedOutBy");
