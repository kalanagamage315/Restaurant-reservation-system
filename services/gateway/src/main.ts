import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { VersioningType, VERSION_NEUTRAL } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: true, credentials: true });

  // allow both: /v1/... and /...
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: ["1", VERSION_NEUTRAL],
  });

  const port = Number(process.env.PORT ?? "3000");
  await app.listen(port);

  console.log(`API Gateway running on http://localhost:${port}`);
}
bootstrap();
