import { Body, Controller, Delete, Get, HttpCode, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Throttle } from "@nestjs/throttler";
import { IsEmail, IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { Repository } from "typeorm";
import { AuthGuard, AuthService, CurrentUserId, CurrentSession, Session } from "./auth/auth";
import { ProgressService } from "./progress/progress.service";
import { PLANS, SIGN_IDS, UNITS } from "./catalog";
import { SubscriptionEntity, WaitlistEntity } from "./entities";
import { BadRequestException } from "@nestjs/common";
import { MASTER_THRESHOLD } from "./progress/gamification";
import { ContentService } from './admin/admin';

class DemoDto { @IsEmail() @MaxLength(200) email: string; @IsOptional() @IsString() @MaxLength(80) name?: string }
class GoogleDto { @IsString() @MaxLength(4096) credential: string }
class SeenDto { @IsString() @IsIn(SIGN_IDS) signId: string }
class AttemptDto { @IsString() @IsIn(SIGN_IDS) signId: string; @IsNumber() @Min(0) @Max(100) score: number }
class PlanDto { @IsIn(PLANS.map(p => p.id)) planId: string }
class WaitlistDto { @IsEmail() @MaxLength(200) email: string; @IsOptional() @IsString() @MaxLength(40) source?: string }

@ApiTags("sistema") @Controller()
export class SystemController {
  @Get("health") health() { return { status: "ok" }; }
  @Get("catalog") catalog() { return { units: UNITS, signIds: SIGN_IDS, masterThreshold: threshold() }; }
  @Get("plans") plans() { return PLANS; }
}
export const threshold = () => Number(process.env.MASTER_THRESHOLD) || MASTER_THRESHOLD;

@ApiTags("auth") @Controller()
export class AuthController {
  constructor(private auth: AuthService) {}
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) @Post("auth/demo") demo(@Body() b: DemoDto) { return this.auth.demo(b.email, b.name); }
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) @Post("auth/google") google(@Body() b: GoogleDto) { return this.auth.googleLogin(b.credential); }
  @ApiBearerAuth() @UseGuards(AuthGuard) @Get("me") me(@CurrentUserId() id: string, @CurrentSession() session: Session) { return this.auth.me(id, session); }
}

@ApiTags("progreso") @ApiBearerAuth() @UseGuards(AuthGuard) @Controller("progress")
export class ProgressController {
  constructor(private progress: ProgressService, private content: ContentService) {}
  @Get() get(@CurrentUserId() id: string) { return this.progress.get(id); }
  @Post("seen") @HttpCode(200) async seen(@CurrentUserId() id: string, @Body() b: SeenDto) { await this.content.assertAvailable(b.signId); return this.progress.seen(id, b.signId); }
  /** Nota: el puntaje lo calcula el navegador (similitud de MediaPipe); la API lo acota a 0-100 pero no puede verificarlo. */
  @Post("attempts") @HttpCode(200) async attempt(@CurrentUserId() id: string, @Body() b: AttemptDto) { await this.content.assertAvailable(b.signId, true); return this.progress.attempt(id, b.signId, b.score, threshold()); }
  @Delete() reset(@CurrentUserId() id: string) { return this.progress.reset(id); }
}

@ApiTags("suscripción") @ApiBearerAuth() @UseGuards(AuthGuard) @Controller("subscription")
export class SubscriptionController {
  constructor(@InjectRepository(SubscriptionEntity) private subs: Repository<SubscriptionEntity>, private progress: ProgressService) {}
  /** Mock: no hay cobro real. Solo registra el plan elegido. */
  @Put() async set(@CurrentUserId() id: string, @Body() b: PlanDto) {
    const cur = await this.subs.findOne({ where: { userId: id } });
    await this.subs.save({ ...(cur ?? {}), userId: id, planId: b.planId, status: "active" });
    return this.progress.get(id);
  }
  @Delete() async cancel(@CurrentUserId() id: string) { await this.subs.delete({ userId: id }); return this.progress.get(id); }
}

@ApiTags("waitlist") @Controller("waitlist")
export class WaitlistController {
  constructor(@InjectRepository(WaitlistEntity) private repo: Repository<WaitlistEntity>) {}
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) @Post() @HttpCode(200)
  async join(@Body() b: WaitlistDto) {
    const email = b.email.trim().toLowerCase();
    if (!(await this.repo.findOne({ where: { email } }))) await this.repo.save({ email, source: b.source ?? "landing" });
    return { ok: true as const };
  }
}
