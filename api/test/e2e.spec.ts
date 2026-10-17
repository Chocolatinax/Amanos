import "reflect-metadata";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { setup } from "../src/setup";

describe("API e2e", () => {
  let app: INestApplication; let http: any; let token = "";
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication(); setup(app, false); await app.init(); http = app.getHttpServer();
  });
  afterAll(() => app.close());
  const auth = () => ({ Authorization: `Bearer ${token}` });

  it("health y catálogo son públicos", async () => {
    expect((await request(http).get("/health")).body).toEqual({ status: "ok" });
    const c = (await request(http).get("/catalog")).body;
    expect(c.signIds).toHaveLength(11);
    expect((await request(http).get("/plans")).body).toHaveLength(2);
  });
  it("rutas privadas piden token", async () => {
    await request(http).get("/progress").expect(401);
    await request(http).get("/progress").set("Authorization", "Bearer x").expect(401);
  });
  it("login demo valida el correo y entrega token", async () => {
    await request(http).post("/auth/demo").send({ email: "no-es-correo" }).expect(400);
    const r = await request(http).post("/auth/demo").send({ email: "Chris@Esen.edu.sv", name: "Chris" }).expect(201);
    token = r.body.accessToken;
    expect(r.body.user).toEqual({ name: "Chris", email: "chris@esen.edu.sv" });
    expect((await request(http).get("/me").set(auth())).body.user.email).toBe("chris@esen.edu.sv");
  });
  it("google sin configurar o con token falso falla limpio", async () => {
    await request(http).post("/auth/google").send({ credential: "abc" }).expect(400);
    process.env.GOOGLE_CLIENT_ID = "x.apps.googleusercontent.com";
    await request(http).post("/auth/google").send({ credential: "abc" }).expect(401);
    delete process.env.GOOGLE_CLIENT_ID;
  });
  it("progreso inicial vacío", async () => {
    const b = (await request(http).get("/progress").set(auth())).body;
    expect(b.stats).toMatchObject({ xp: 0, streak: 0, mastered: 0, totalSigns: 11, dailyGoal: 3, todayCount: 0 });
    expect(b.stats.week).toHaveLength(7);
  });
  it("seen da 10 XP una sola vez y arranca la racha", async () => {
    await request(http).post("/progress/seen").set(auth()).send({ signId: "hola" }).expect(200);
    const b = (await request(http).post("/progress/seen").set(auth()).send({ signId: "hola" })).body;
    expect(b.stats).toMatchObject({ xp: 10, streak: 1, seen: 1, todayCount: 1 });
  });
  it("rechaza señas inexistentes y puntajes fuera de rango", async () => {
    await request(http).post("/progress/seen").set(auth()).send({ signId: "zzz" }).expect(400);
    await request(http).post("/progress/attempts").set(auth()).send({ signId: "a", score: 150 }).expect(400);
    await request(http).post("/progress/attempts").set(auth()).send({ signId: "a", score: 50, extra: 1 }).expect(400);
  });
  it("intento bajo no domina; alto domina una sola vez (+50 XP)", async () => {
    let r = (await request(http).post("/progress/attempts").set(auth()).send({ signId: "a", score: 70 }).expect(200)).body;
    expect(r.result).toEqual({ newlyMastered: false, xpGained: 10 });
    r = (await request(http).post("/progress/attempts").set(auth()).send({ signId: "a", score: 95 })).body;
    expect(r.result).toEqual({ newlyMastered: true, xpGained: 50 });
    expect(r.progress.signs.a).toMatchObject({ mastered: true, bestScore: 95, attempts: 2 });
    r = (await request(http).post("/progress/attempts").set(auth()).send({ signId: "a", score: 99 })).body;
    expect(r.result).toEqual({ newlyMastered: false, xpGained: 0 });
    expect(r.stats).toMatchObject({ xp: 70, mastered: 1, seen: 2, todayCount: 2 });
  });
  it("el progreso persiste entre peticiones y se aísla por usuario", async () => {
    expect((await request(http).get("/progress").set(auth())).body.stats.xp).toBe(70);
    const o = await request(http).post("/auth/demo").send({ email: "otro@esen.edu.sv" });
    const b = (await request(http).get("/progress").set({ Authorization: `Bearer ${o.body.accessToken}` })).body;
    expect(b.stats.xp).toBe(0);
  });
  it("suscripción mock: activar, cambiar y cancelar", async () => {
    await request(http).put("/subscription").set(auth()).send({ planId: "gratis" }).expect(400);
    let b = (await request(http).put("/subscription").set(auth()).send({ planId: "anual" }).expect(200)).body;
    expect(b.progress).toMatchObject({ plan: "pago", planId: "anual" });
    b = (await request(http).delete("/subscription").set(auth()).expect(200)).body;
    expect(b.progress.plan).toBe("gratis");
  });
  it("waitlist es idempotente y valida", async () => {
    await request(http).post("/waitlist").send({ email: "x" }).expect(400);
    await request(http).post("/waitlist").send({ email: "a@b.co" }).expect(200);
    await request(http).post("/waitlist").send({ email: "A@b.co" }).expect(200);
  });
  it("reset borra el progreso", async () => {
    const b = (await request(http).delete("/progress").set(auth()).expect(200)).body;
    expect(b.stats).toMatchObject({ xp: 0, mastered: 0, streak: 0 });
  });
});
