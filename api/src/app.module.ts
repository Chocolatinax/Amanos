import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthGuard, AuthService } from "./auth/auth";
import { AuthController, ProgressController, SubscriptionController, SystemController, WaitlistController } from "./app.controllers";
import { ENTITIES } from "./entities";
import { ProgressService } from "./progress/progress.service";

export function dbOptions() {
  const url = process.env.DATABASE_URL;
  if (url) return { type: "postgres" as const, url, entities: ENTITIES, synchronize: process.env.DB_SYNC === "true", ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false } };
  return { type: "sqljs" as const, location: process.env.SQLITE_PATH ?? "amanos.sqlite", autoSave: Boolean(process.env.SQLITE_PATH ?? "amanos.sqlite") && process.env.SQLITE_PATH !== ":memory:", entities: ENTITIES, synchronize: true };
}

@Module({
  imports: [
    TypeOrmModule.forRoot(dbOptions() as never),
    TypeOrmModule.forFeature(ENTITIES),
    JwtModule.register({ global: true, secret: process.env.JWT_SECRET || "dev-secret-cambiame", signOptions: { expiresIn: "7d" } }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
  ],
  controllers: [SystemController, AuthController, ProgressController, SubscriptionController, WaitlistController],
  providers: [AuthService, AuthGuard, ProgressService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
