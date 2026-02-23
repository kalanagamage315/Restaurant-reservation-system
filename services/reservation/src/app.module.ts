import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { HttpModule } from "@nestjs/axios";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { ReservationsModule } from "./reservations/reservations.module";
import { HealthController } from "./health.controller";
import { CorrelationIdMiddleware } from "./common/correlation-id.middleware";
import { appConfig } from "./config/app.config";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    HttpModule,
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    ReservationsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes("*");
  }
}
