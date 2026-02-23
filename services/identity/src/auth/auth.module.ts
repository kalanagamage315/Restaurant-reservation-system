import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { UsersModule } from "../users/users.module";
import { JwtModule } from "@nestjs/jwt";
import { JwtStrategy } from "./jwt.strategy";
import { ConfigModule } from "@nestjs/config";
import { RolesGuard } from "./roles.guard";

@Module({
  imports: [
    UsersModule,
    ConfigModule,
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET ?? "dev_secret",
      signOptions: {
        expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? "15m") as any,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RolesGuard],
  exports: [AuthService, JwtStrategy, RolesGuard],
})
export class AuthModule {}
