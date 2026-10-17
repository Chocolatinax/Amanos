import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException, createParamDecorator } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { OAuth2Client } from "google-auth-library";
import { Repository } from "typeorm";
import { UserEntity } from "../entities";

export const toUser = (u: UserEntity) => ({ name: u.name, email: u.email, ...(u.avatar ? { avatar: u.avatar } : {}) });
export const CurrentUserId = createParamDecorator((_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().userId as string);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const h: string = req.headers.authorization ?? "";
    if (!h.startsWith("Bearer ")) throw new UnauthorizedException("Falta el token.");
    try { req.userId = (await this.jwt.verifyAsync(h.slice(7))).sub; } catch { throw new UnauthorizedException("Sesión inválida o vencida."); }
    return true;
  }
}

@Injectable()
export class AuthService {
  private google = new OAuth2Client();
  constructor(@InjectRepository(UserEntity) private users: Repository<UserEntity>, private jwt: JwtService) {}

  private async issue(u: UserEntity) { return { accessToken: await this.jwt.signAsync({ sub: u.id }), user: toUser(u) }; }

  private async upsert(email: string, name: string, avatar?: string, googleSub?: string) {
    email = email.trim().toLowerCase();
    let u = await this.users.findOne({ where: { email } });
    if (!u) u = this.users.create({ email, name, avatar: avatar ?? null, googleSub: googleSub ?? null });
    else { if (googleSub) u.googleSub = googleSub; if (avatar) u.avatar = avatar; }
    return this.users.save(u);
  }

  /** Login de demo sin contraseña. Solo si ALLOW_DEMO_AUTH=true (por defecto, solo fuera de producción). */
  async demo(email: string, name?: string) {
    if (!(process.env.ALLOW_DEMO_AUTH === "true" || (process.env.ALLOW_DEMO_AUTH == null && process.env.NODE_ENV !== "production")))
      throw new ForbiddenException("El login de demo está deshabilitado.");
    return this.issue(await this.upsert(email, name?.trim() || email.split("@")[0]));
  }

  async googleLogin(credential: string) {
    const aud = process.env.GOOGLE_CLIENT_ID;
    if (!aud) throw new BadRequestException("Google no está configurado en el servidor (GOOGLE_CLIENT_ID).");
    let payload;
    try { payload = (await this.google.verifyIdToken({ idToken: credential, audience: aud })).getPayload(); }
    catch { throw new UnauthorizedException("Token de Google inválido."); }
    if (!payload?.email || payload.email_verified === false) throw new UnauthorizedException("Correo de Google no verificado.");
    return this.issue(await this.upsert(payload.email, payload.name ?? payload.email.split("@")[0], payload.picture, payload.sub));
  }

  async me(id: string) {
    const u = await this.users.findOne({ where: { id } });
    if (!u) throw new UnauthorizedException("Usuario no encontrado.");
    return { user: toUser(u) };
  }
}
