// El TZ debe fijarse antes de cualquier uso de Date: gamification.ts calcula "el día de hoy" con la hora local.
process.env.TZ = process.env.APP_TIMEZONE || "America/El_Salvador";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from "./app.module";
import { setup } from "./setup";

async function bootstrap() {
  if (process.env.NODE_ENV === "production" && (!process.env.JWT_SECRET || process.env.JWT_SECRET.startsWith("dev-")))
    throw new Error("Definí JWT_SECRET en producción.");
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useBodyParser('json', { limit: '1mb' });
  setup(app);
  const port = Number(process.env.PORT) || 4000;
  await app.listen(port);
  console.log(`Amanos API en http://localhost:${port}  (docs: /docs)`);
}
bootstrap();
