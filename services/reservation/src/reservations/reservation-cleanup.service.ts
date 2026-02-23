import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { ReservationStatus } from "@prisma/client";

@Injectable()
export class ReservationCleanupService {
  private readonly logger = new Logger(ReservationCleanupService.name);

  // You can change this later using env if you want
  private readonly ttlMinutes = Number(process.env.PENDING_TTL_MINUTES ?? 15);

  constructor(private prisma: PrismaService) {}

  // Runs every minute
  @Cron(CronExpression.EVERY_MINUTE)
  async cancelExpiredPendingReservations() {
    const cutoff = new Date(Date.now() - this.ttlMinutes * 60_000);

    const result = await this.prisma.reservation.updateMany({
      where: {
        status: ReservationStatus.PENDING,
        createdAt: { lt: cutoff },
      },
      data: {
        status: ReservationStatus.CANCELLED,
      },
    });

    if (result.count > 0) {
      this.logger.log(
        `Auto-cancelled ${result.count} pending reservations older than ${this.ttlMinutes} minutes`,
      );
    }
  }
}
