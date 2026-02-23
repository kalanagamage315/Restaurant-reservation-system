import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe, Logger } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

const logger = new Logger("Bootstrap");

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Graceful shutdown — handles SIGTERM from Docker / orchestrators
  app.enableShutdownHooks();

  // Global DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle("Reservation Service API")
    .setDescription("Reservations + Availability + Staff actions (confirm/reject)")
    .setVersion("1.0")
    .addBearerAuth(
      { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      "access-token",
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = Number(process.env.PORT) || 3002;
  await app.listen(port);

  logger.log(`🚀 Reservation Service running on http://localhost:${port}`);
  logger.log(`📘 Swagger UI: http://localhost:${port}/docs`);
}
bootstrap();
