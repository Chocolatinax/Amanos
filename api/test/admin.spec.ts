import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppModule } from '../src/app.module';
import { setup } from '../src/setup';
import { validReference } from '../src/admin/references';

describe('Owner administration', () => {
  let app: INestApplication, http: any, owner: string, other: string, demo: string;
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const content = { revision: 0, enabled: false, evaluationEnabled: false, glosa: 'A revisada', significado: 'Letra A', configuracionMano: 'Puño cerrado', ubicacion: 'Frente al pecho', orientacion: 'Palma al frente' };
  beforeAll(async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client'; process.env.ADMIN_EMAIL = 'codirrl@gmail.com';
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication(); setup(app, false); await app.init(); http = app.getHttpServer();
    const google = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken');
    google.mockResolvedValue({ getPayload: () => ({ email: 'CODIRRL@GMAIL.COM', email_verified: true, sub: 'google-owner', name: 'Owner' }) } as any);
    owner = (await request(http).post('/auth/google').send({ credential: 'verified-owner' }).expect(201)).body.accessToken;
    google.mockResolvedValue({ getPayload: () => ({ email: 'other@example.com', email_verified: true, sub: 'google-other' }) } as any);
    other = (await request(http).post('/auth/google').send({ credential: 'verified-other' }).expect(201)).body.accessToken;
    demo = (await request(http).post('/auth/demo').send({ email: 'codirrl@gmail.com' }).expect(201)).body.accessToken;
    google.mockRestore();
  });
  afterAll(async () => { await app?.close(); delete process.env.GOOGLE_CLIENT_ID; delete process.env.ADMIN_EMAIL; });
  it('requires Google owner authorization on every admin endpoint', async () => {
    await request(http).get('/admin/signs').expect(401);
    for (const t of [other, demo]) {
      await request(http).get('/admin/signs').set(auth(t)).expect(403);
      await request(http).get('/admin/users').set(auth(t)).expect(403);
      await request(http).put('/admin/signs/a').set(auth(t)).send(content).expect(403);
      await request(http).put('/admin/signs/a/reference').set(auth(t)).send({ revision: 0, data: null }).expect(403);
    }
    expect((await request(http).get('/me').set(auth(owner))).body.user.isAdmin).toBe(true);
    expect((await request(http).get('/me').set(auth(demo))).body.user.isAdmin).toBe(false);
    await request(http).get('/admin/users').set(auth(owner + 'tampered')).expect(401);
  });
  it('rejects Google email unless verification is explicitly true', async () => {
    const mock = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({ getPayload: () => ({ email: 'codirrl@gmail.com', sub: 'bad' }) } as any);
    await request(http).post('/auth/google').send({ credential: 'unverified' }).expect(401); mock.mockRestore();
  });
  it('persists content, detects stale saves, and blocks grading a paused sign', async () => {
    const saved = (await request(http).put('/admin/signs/a').set(auth(owner)).send(content).expect(200)).body;
    expect(saved).toMatchObject({ id: 'a', revision: 1, enabled: false });
    expect((await request(http).get('/content')).body.signs[0]).toMatchObject({ glosa: 'A revisada' });
    await request(http).put('/admin/signs/a').set(auth(owner)).send(content).expect(409);
    await request(http).post('/progress/attempts').set(auth(other)).send({ signId: 'a', score: 100 }).expect(403);
    await request(http).put('/admin/signs/unknown').set(auth(owner)).send(content).expect(400);
    await request(http).put('/admin/signs/a').set(auth(owner)).send({ ...content, revision: 1, enabled: true }).expect(200);
    await request(http).post('/progress/attempts').set(auth(other)).send({ signId: 'a', score: 100 }).expect(403);
  });
  it('validates, serves, and restores evaluation references without losing edited content', async () => {
    const data = JSON.parse(readFileSync(resolve(__dirname, '../../public/samples/a.json'), 'utf8'));
    await request(http).put('/admin/signs/a/reference').set(auth(owner)).send({ revision: 2, data: { ...data, signId: 'b' } }).expect(400);
    await request(http).put('/admin/signs/a/reference').set(auth(owner)).send({ revision: 2, data }).expect(200);
    expect((await request(http).get('/content/references/a')).body).toEqual(JSON.parse(JSON.stringify(data)));
    expect((await request(http).get('/content')).body.signs[0]).toMatchObject({ glosa: 'A revisada', hasReference: true, revision: 3 });
    await request(http).put('/admin/signs/a/reference').set(auth(owner)).send({ revision: 3, data: null }).expect(200);
    await request(http).get('/content/references/a').expect(404);
  });
  it('lists users with pagination and never exposes Google identifiers or tokens', async () => {
    const r = (await request(http).get('/admin/users?page=1').set(auth(owner)).expect(200)).body;
    expect(r.total).toBe(2); expect(r.users[0]).toHaveProperty('email');
    expect(r.users[0]).not.toHaveProperty('googleSub');
    await request(http).get('/admin/users?page=-1').set(auth(owner)).expect(400);
  });
});

it('all shipped camera references validate and malformed values are rejected', () => {
  for (const id of ['a','b','c','adios','tu','hola','buenas-tardes','buenos-dias','gracias']) {
    const file = ['a','b','c'].includes(id) ? `samples/${id}.json` : `evaluation/${id}${id === 'gracias' ? '-movement' : ''}.json`;
    const r = JSON.parse(readFileSync(resolve(__dirname, '../../public', file), 'utf8'));
    expect(validReference(r, id)).toBe(true);
    expect(validReference({ ...r, signId: 'unknown' }, id)).toBe(false);
    if (r.frames) expect(validReference({ ...r, frames: [null, ...r.frames] }, id)).toBe(false);
  }
  expect(validReference({ version: 'hand-world-v2', signId: 'a', samples: [Array(63).fill(0)] }, 'a')).toBe(false);
});
