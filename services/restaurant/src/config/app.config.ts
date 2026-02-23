import { registerAs } from "@nestjs/config";

export const appConfig = registerAs("app", () => ({
    port: parseInt(process.env.PORT ?? "3003", 10),
    nodeEnv: process.env.NODE_ENV ?? "development",
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? "change_me_access",
    jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
}));
