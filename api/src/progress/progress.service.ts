import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DayActivityEntity, SignProgressEntity, SubscriptionEntity } from "../entities";
import { SIGN_IDS } from "../catalog";
import { applyAttempt, applySeen, computeStats, localDay } from "./gamification";
import type { AttemptResult, DayActivity, PlanId, Progress, Stats } from "./types";

export type Envelope = { progress: Progress; stats: Stats };
const parse = <T,>(s: string, fb: T): T => { try { return JSON.parse(s) as T; } catch { return fb; } };

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(SignProgressEntity) private signs: Repository<SignProgressEntity>,
    @InjectRepository(DayActivityEntity) private days: Repository<DayActivityEntity>,
    @InjectRepository(SubscriptionEntity) private subs: Repository<SubscriptionEntity>,
  ) {}

  async load(userId: string): Promise<Progress> {
    const [rows, acts, sub] = await Promise.all([
      this.signs.find({ where: { userId } }),
      this.days.find({ where: { userId } }),
      this.subs.findOne({ where: { userId } }),
    ]);
    const p: Progress = { signs: {}, streak: 0, plan: "gratis", activity: {} };
    for (const r of rows) p.signs[r.signId] = { seen: r.seen, bestScore: r.bestScore, mastered: r.mastered, masteredAt: r.masteredAt ?? undefined, attempts: r.attempts };
    let xp = 0;
    for (const a of acts) {
      p.activity![a.day] = { seen: parse(a.seen, []), mastered: parse(a.mastered, []), scores: parse(a.scores, []), xp: a.xp };
      xp += a.xp;
    }
    p.xp = xp;
    if (sub && sub.status === "active") { p.plan = "pago"; p.planId = sub.planId as PlanId; }
    return p;
  }

  envelope(p: Progress, today = localDay()): Envelope { return { progress: p, stats: computeStats(p, SIGN_IDS.length, today) }; }

  async get(userId: string) { return this.envelope(await this.load(userId)); }

  private async persist(userId: string, p: Progress, signId: string, today: string) {
    const s = p.signs[signId];
    const cur = await this.signs.findOne({ where: { userId, signId } });
    await this.signs.save({ ...(cur ?? {}), userId, signId, seen: s.seen, bestScore: s.bestScore, mastered: s.mastered, masteredAt: s.masteredAt ?? null, attempts: s.attempts ?? 0 });
    const d: DayActivity = p.activity![today];
    const curDay = await this.days.findOne({ where: { userId, day: today } });
    await this.days.save({ ...(curDay ?? {}), userId, day: today, xp: d.xp, seen: JSON.stringify(d.seen), mastered: JSON.stringify(d.mastered), scores: JSON.stringify(d.scores ?? []) });
  }

  async seen(userId: string, signId: string): Promise<Envelope> {
    const today = localDay();
    const { progress } = applySeen(await this.load(userId), signId, today);
    await this.persist(userId, progress, signId, today);
    return this.envelope(progress, today);
  }

  async attempt(userId: string, signId: string, score: number, threshold: number): Promise<Envelope & { result: AttemptResult }> {
    const today = localDay();
    const { progress, newlyMastered, xpGained } = applyAttempt(await this.load(userId), signId, score, today, threshold);
    await this.persist(userId, progress, signId, today);
    return { ...this.envelope(progress, today), result: { newlyMastered, xpGained } };
  }

  async reset(userId: string): Promise<Envelope> {
    await this.signs.delete({ userId });
    await this.days.delete({ userId });
    return this.get(userId);
  }
}
