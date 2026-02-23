/*
  Warnings:

  - You are about to drop the column `confirmedAt` on the `Reservation` table. All the data in the column will be lost.
  - You are about to drop the column `confirmedBy` on the `Reservation` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Reservation_reservedAt_idx";

-- AlterTable
ALTER TABLE "Reservation" DROP COLUMN "confirmedAt",
DROP COLUMN "confirmedBy";
