import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Injectable, NotFoundException, Param, Put, Query, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsBoolean, IsInt, IsObject, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Repository } from 'typeorm';
import { AdminGuard, AuthGuard } from '../auth/auth';
import { SignSettingsEntity, UserEntity } from '../entities';
import { isSignId } from '../catalog';
import { validReference } from './references';

class ContentDto {
  @IsInt() @Min(0) revision: number;
  @IsBoolean() enabled: boolean;
  @IsBoolean() evaluationEnabled: boolean;
  @IsString() @MaxLength(80) glosa: string;
  @IsString() @MaxLength(200) significado: string;
  @IsString() @MaxLength(600) configuracionMano: string;
  @IsString() @MaxLength(600) ubicacion: string;
  @IsString() @MaxLength(600) orientacion: string;
}
class ReferenceDto {
  @IsInt() @Min(0) revision: number;
  @IsOptional() @IsObject() data: Record<string, unknown> | null;
}
const view = (row: SignSettingsEntity) => ({ id: row.signId, ...JSON.parse(row.content), revision: row.revision, hasReference: !!row.reference, updatedAt: row.updatedAt });

@Injectable()
export class ContentService {
  constructor(@InjectRepository(SignSettingsEntity) private settings: Repository<SignSettingsEntity>) {}
  async list() { return { signs: (await this.settings.find()).map(view) }; }
  async assertAvailable(id: string, evaluating = false) {
    const row = await this.settings.findOne({ where: { signId: id } });
    const content = row ? JSON.parse(row.content) : {};
    if (content.enabled === false || (evaluating && content.evaluationEnabled === false)) throw new ForbiddenException('La seña o su evaluación están pausadas.');
  }
  async reference(id: string) {
    const row = await this.settings.findOne({ where: { signId: id } });
    if (!row?.reference) throw new NotFoundException('Se usa la referencia original.');
    return JSON.parse(row.reference);
  }
  private async save(id: string, revision: number, change: Partial<SignSettingsEntity>) {
    if (!isSignId(id)) throw new BadRequestException('Seña desconocida.');
    const current = await this.settings.findOne({ where: { signId: id } });
    if ((current?.revision ?? 0) !== revision) throw new ConflictException('La seña cambió. Recargá antes de guardar.');
    if (!current) {
      try { await this.settings.insert({ signId: id, content: '{}', reference: null, ...change, revision: 1 }); }
      catch (e) { if (await this.settings.exist({ where: { signId: id } })) throw new ConflictException('La seña cambió. Recargá antes de guardar.'); throw e; }
    } else {
      const result = await this.settings.update({ signId: id, revision }, { ...change, revision: revision + 1 });
      if (!result.affected) throw new ConflictException('La seña cambió. Recargá antes de guardar.');
    }
    return view((await this.settings.findOneByOrFail({ signId: id })));
  }
  saveContent(id: string, dto: ContentDto) {
    const { revision, ...content } = dto;
    if (![content.glosa, content.significado, content.configuracionMano, content.ubicacion, content.orientacion].every(v => v.trim())) throw new BadRequestException('Completá todos los textos.');
    return this.save(id, revision, { content: JSON.stringify(content) });
  }
  saveReference(id: string, dto: ReferenceDto) {
    if (dto.data !== null && !validReference(dto.data, id)) throw new BadRequestException('JSON incompatible con el evaluador de esta seña.');
    return this.save(id, dto.revision, { reference: dto.data === null ? null : JSON.stringify(dto.data) });
  }
}

@Controller('content')
export class ContentController {
  constructor(private content: ContentService) {}
  @Get() list() { return this.content.list(); }
  @Get('references/:id') reference(@Param('id') id: string) { return this.content.reference(id); }
}

@UseGuards(AuthGuard, AdminGuard) @Controller('admin')
export class AdminController {
  constructor(private content: ContentService, @InjectRepository(UserEntity) private users: Repository<UserEntity>) {}
  @Get('signs') signs() { return this.content.list(); }
  @Put('signs/:id') save(@Param('id') id: string, @Body() dto: ContentDto) { return this.content.saveContent(id, dto); }
  @Put('signs/:id/reference') reference(@Param('id') id: string, @Body() dto: ReferenceDto) { return this.content.saveReference(id, dto); }
  @Get('users') async listUsers(@Query('page') raw = '1') {
    const page = Number(raw);
    if (!Number.isInteger(page) || page < 1 || page > 10000) throw new BadRequestException('Página inválida.');
    const [users, total] = await this.users.findAndCount({ select: { id: true, email: true, name: true, createdAt: true }, order: { createdAt: 'DESC', id: 'ASC' }, skip: (page - 1) * 25, take: 25 });
    return { users, total, page, pageSize: 25 };
  }
}
