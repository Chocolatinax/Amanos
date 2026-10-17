import { INestApplication, ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";

export function setup(app: INestApplication, swagger = true) {
  app.use(helmet());
  const origins = (process.env.CORS_ORIGINS ?? "http://localhost:3000").split(",").map(s => s.trim()).filter(Boolean);
  app.enableCors({ origin: origins, methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  if (swagger) SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, new DocumentBuilder().setTitle("Amanos API").setVersion("0.1").addBearerAuth().build()));
}
