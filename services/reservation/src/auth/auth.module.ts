import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { JwtModule, JwtModuleOptions } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtStrategy } from "./jwt.strategy";
import type { StringValue } from "ms";
import { RolesGuard } from "./roles.guard";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.get<string>("JWT_ACCESS_SECRET") ?? "dev_secret",
        signOptions: {
          expiresIn: (config.get<string>("JWT_ACCESS_EXPIRES_IN") ?? "15m") as StringValue,
        },
      }),
    }),
  ],
  providers: [JwtStrategy, RolesGuard],
  exports: [JwtModule, PassportModule, RolesGuard],
})
export class AuthModule {}
