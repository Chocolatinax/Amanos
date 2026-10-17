import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";

@Entity("users")
export class UserEntity {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Index({ unique: true }) @Column({ type: "varchar" }) email: string;
  @Column({ type: "varchar" }) name: string;
  @Column({ type: "varchar", nullable: true }) avatar: string | null;
  @Column({ type: "varchar", nullable: true }) googleSub: string | null;
  @CreateDateColumn() createdAt: Date;
}

@Entity("sign_progress")
@Unique(["userId", "signId"])
export class SignProgressEntity {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Index() @Column({ type: "varchar" }) userId: string;
  @Column({ type: "varchar" }) signId: string;
  @Column({ type: "boolean", default: false }) seen: boolean;
  @Column({ type: "integer", default: 0 }) bestScore: number;
  @Column({ type: "boolean", default: false }) mastered: boolean;
  @Column({ type: "varchar", nullable: true }) masteredAt: string | null;
  @Column({ type: "integer", default: 0 }) attempts: number;
}

@Entity("day_activity")
@Unique(["userId", "day"])
export class DayActivityEntity {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Index() @Column({ type: "varchar" }) userId: string;
  /** Día calendario en APP_TIMEZONE, YYYY-MM-DD. */
  @Column({ type: "varchar" }) day: string;
  @Column({ type: "integer", default: 0 }) xp: number;
  @Column({ type: "text", default: "[]" }) seen: string;
  @Column({ type: "text", default: "[]" }) mastered: string;
  @Column({ type: "text", default: "[]" }) scores: string;
}

@Entity("subscriptions")
export class SubscriptionEntity {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Index({ unique: true }) @Column({ type: "varchar" }) userId: string;
  @Column({ type: "varchar" }) planId: string;
  @Column({ type: "varchar", default: "active" }) status: string;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity("waitlist")
export class WaitlistEntity {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Index({ unique: true }) @Column({ type: "varchar" }) email: string;
  @Column({ type: "varchar", default: "landing" }) source: string;
  @CreateDateColumn() createdAt: Date;
}

export const ENTITIES = [UserEntity, SignProgressEntity, DayActivityEntity, SubscriptionEntity, WaitlistEntity];
