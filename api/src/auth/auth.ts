import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException, createParamDecorator } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { OAuth2Client } from "google-auth-library";
import { Repository } from "typeorm";
import { UserEntity } from "../entities";

export const toUser = (u: UserEntity) => ({ name: u.name, email: u.email, ...(u.avatar ? { avatar: u.avatar } : {}) });
export const CurrentUserId = createParamDecorator((_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().userId as string);
export const CurrentSession = createParamDecorator((_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().session as Session);
export type Session = { sub: string; provider?: string; googleSub?: string };
export const ownerEmail = () => (process.env.ADMIN_EMAIL || 'codirrl@gmail.com').trim().toLowerCase();
export const ownsAdmin = (u: UserEntity, s: Session) => s.provider === 'google' && !!s.googleSub && s.googleSub === u.googleSub && u.email.toLowerCase() === ownerEmail();

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const h: string = req.headers.authorization ?? "";
    if (!h.startsWith("Bearer ")) throw new UnauthorizedException("Falta el token.");
    try {
      req.session = await this.jwt.verifyAsync(h.slice(7));
      if (typeof req.session.sub !== 'string' || !req.session.sub) throw new Error();
      req.userId = req.session.sub;
    } catch { throw new UnauthorizedException("Sesión inválida o vencida."); }
    return true;
  }
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(@InjectRepository(UserEntity) private users: Repository<UserEntity>) {}
  async canActivate(ctx: ExecutionContext) {
    const s: Session | undefined = ctx.switchToHttp().getRequest().session;
    const u = s?.sub ? await this.users.findOne({ where: { id: s.sub } }) : null;
    if (!u || !s || !ownsAdmin(u, s)) throw new ForbiddenException('Entrá con la cuenta de Google administradora.');
    return true;
  }
}

@Injectable()
export class AuthService {
  private google = new OAuth2Client();
  constructor(@InjectRepository(UserEntity) private users: Repository<UserEntity>, private jwt: JwtService) {}

  private async issue(u: UserEntity, provider = 'demo') {
    const session: Session = { sub: u.id, provider, ...(provider === 'google' && u.googleSub ? { googleSub: u.googleSub } : {}) };
    return { accessToken: await this.jwt.signAsync(session), user: { ...toUser(u), isAdmin: ownsAdmin(u, session) } };
  }

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
    if (!payload?.email || payload.email_verified !== true || !payload.sub) throw new UnauthorizedException("Correo de Google no verificado.");
    return this.issue(await this.upsert(payload.email, payload.name ?? payload.email.split("@")[0], payload.picture, payload.sub), 'google');
  }

  async me(id: string, session: Session = { sub: id }) {
    const u = await this.users.findOne({ where: { id } });
    if (!u) throw new UnauthorizedException("Usuario no encontrado.");
    return { user: { ...toUser(u), isAdmin: ownsAdmin(u, session) } };
  }
}
