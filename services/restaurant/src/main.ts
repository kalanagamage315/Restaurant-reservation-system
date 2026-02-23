import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe, Logger } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";

const logger = new Logger("Bootstrap");

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Graceful shutdown
  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  const config = new DocumentBuilder()
    .setTitle("Restaurant Service")
    .setDescription("Restaurant CRUD + Admin/Staff controls")
    .setVersion("1.0.0")
    .addBearerAuth(
      { type: "http", scheme: "bearer", bearerFormat: "JWT", name: "Authorization", in: "header" },
      "access-token",
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  const port = Number(process.env.PORT) || 3003;
  await app.listen(port);

  logger.log(`🚀 Restaurant Service running on http://localhost:${port}`);
  logger.log(`📘 Swagger Docs: http://localhost:${port}/docs`);
}

bootstrap();
