/*
  Warnings:

  - You are about to drop the column `durationMins` on the `Reservation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Reservation" DROP COLUMN "durationMins",
ADD COLUMN     "checkedOutAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Reservation_checkedOutAt_idx" ON "Reservation"("checkedOutAt");
