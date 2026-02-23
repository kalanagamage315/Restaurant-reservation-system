import { registerAs } from "@nestjs/config";

export const appConfig = registerAs("app", () => ({
    port: parseInt(process.env.PORT ?? "3002", 10),
    nodeEnv: process.env.NODE_ENV ?? "development",

    // JWT
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? "change_me_access",
    jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? "change_me_refresh",
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",

    // Downstream service URLs
    identityServiceUrl: process.env.IDENTITY_SERVICE_URL ?? "http://localhost:3001",
    restaurantServiceUrl: process.env.RESTAURANT_SERVICE_URL ?? "http://localhost:3003",
    tableServiceUrl: process.env.TABLE_SERVICE_URL ?? "http://localhost:3004",

    // Timezone offset for date calculations (e.g. "+05:30" for IST)
    appTzOffset: process.env.APP_TZ_OFFSET ?? "+00:00",
}));
