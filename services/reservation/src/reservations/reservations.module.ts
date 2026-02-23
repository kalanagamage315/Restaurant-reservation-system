import { Module } from "@nestjs/common";
import { ReservationsController } from "./reservations.controller";
import { ReservationsService } from "./reservations.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { HttpModule } from "@nestjs/axios";
import { ReservationCleanupService } from "./reservation-cleanup.service";

@Module({
  imports: [PrismaModule, AuthModule, HttpModule],
  controllers: [ReservationsController],
  providers: [ReservationsService, ReservationCleanupService],
})
export class ReservationsModule {}
