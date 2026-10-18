import type { HumanHand, HumanPoint, HumanReference } from "./human-evaluator";
const dot = (a: number[], b: number[]) => a.reduce((sum, v, i) => sum + v * b[i], 0);
const rms = (a: number[]) => Math.hypot(...a) / Math.sqrt(a.length);
const difference = (a: number[], b: number[]) => a.map((v, i) => v - b[i]);
const finite = (v: unknown, n: number): v is number[] => Array.isArray(v) && v.length === n && v.every(Number.isFinite);
function error(a: HumanHand, b: HumanHand) {
  return .5 * rms(difference(a.features.slice(0, 4), b.features.slice(0, 4)))
    + .12 * rms(difference(a.features.slice(7, 10), b.features.slice(7, 10)))
    + .08 * rms(difference(a.features.slice(4, 7), b.features.slice(4, 7)))
    + .12 * rms(difference(a.thumbDirection!, b.thumbDirection!))
    + .3 * rms(a.anchor.map((v, i) => Math.max(0, Math.abs(v - b.anchor[i]) - .12)));
}
const reply = (feedback: string, similarity = 0, accepted = false) => ({ feedback, similarity, accepted });
export class BuenasTardesTracker {
  private points: HumanPoint[] = [];
  private initialAt: number | null = null;
  private initialReady = false;
  private flatAt: number | null = null;
  private last = reply("Empezá con el pulgar arriba, como en el avatar.");
  reset() { this.points = []; this.initialAt = null; this.flatAt = null; this.initialReady = false; this.last = reply("Empezá con el pulgar arriba, como en el avatar."); }
  update(point: HumanPoint | null, reference: HumanReference | null) {
    if (!reference || reference.signId !== "buenas-tardes") return reply("Cargando la referencia de BUENAS TARDES…");
    const hand = point?.hands[0];
    if (!point || point.hands.length !== 1 || !Number.isFinite(point.time) || !hand || !finite(hand.features, 12) || !finite(hand.anchor, 4) || !finite(hand.thumbDirection, 3)) {
      this.reset(); return reply("Mostrá una mano, el rostro y ambos hombros completos.");
    }
    const previous = this.points.at(-1);
    if (previous && (point.time < previous.time || point.time - previous.time > .35 || point.time - this.points[0].time > 5)) this.reset();
    else if (previous && point.time - previous.time < .06) return this.last;
    const initial = reference.frames.filter(p => p.phase === "thumb-up"), flat = reference.frames.filter(p => p.phase === "flat");
    const nearby = reference.frames.some(p => Math.hypot(...difference(hand.anchor.slice(0, 2), p.hands[0].anchor.slice(0, 2))) < .35);
    if (!nearby) { this.reset(); return reply("Ajustá la ubicación de la mano frente al cuerpo según el avatar."); }
    const thumbUp = hand.features.slice(0, 4).every(v => v > -.45) && hand.thumbDirection[1] < -.25
      && initial.some(p => dot(hand.thumbDirection!, p.hands[0].thumbDirection!) > .75 && error(hand, p.hands[0]) < .2);
    const extended = hand.features.slice(0, 4).every(v => v < -.55)
      && flat.some(p => dot(hand.features.slice(7, 10), p.hands[0].features.slice(7, 10)) > .65 && error(hand, p.hands[0]) < .2);
    if (!this.initialReady) {
      if (!thumbUp) { this.reset(); return this.last; }
      if (this.initialAt === null) this.initialAt = point.time;
      this.points.push(point);
      this.initialReady = point.time - this.initialAt >= .25;
      return this.last = reply(this.initialReady ? "Ahora extendé la mano y completá el movimiento hacia adelante." : "Mantené brevemente el pulgar arriba y los otros dedos cerrados.", this.initialReady ? 50 : 25);
    }
    this.points.push(point);
    if (!extended) { this.flatAt = null; return this.last = reply("Pasá del pulgar arriba a la mano extendida, como en el avatar.", 50); }
    if (this.flatAt === null) this.flatAt = point.time;
    if (point.time - this.flatAt < .25 || point.time - this.points[0].time < .9) return this.last = reply("Completá la posición final con los dedos extendidos.", 75);
    const travel = Math.max(...this.points.map(p => Math.hypot(...difference(p.hands[0].anchor.slice(0, 2), this.points[0].hands[0].anchor.slice(0, 2)))));
    if (travel < .12) return this.last = reply("Completá también el cambio de posición de la mano, no solo los dedos.", 75);
    const n = this.points.length, m = reference.frames.length, costs = Array.from({ length: n + 1 }, () => Array(m + 1).fill(Infinity)); costs[0][0] = 0;
    for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) costs[i][j] = error(this.points[i - 1].hands[0], reference.frames[j - 1].hands[0]) + Math.min(costs[i - 1][j], costs[i][j - 1], costs[i - 1][j - 1]);
    const similarity = Math.round(100 * Math.max(0, 1 - costs[n][m] / Math.max(n, m) / .7));
    return this.last = similarity >= 90 ? reply("La secuencia de BUENAS TARDES coincide con la referencia.", similarity, true) : reply("Revisá la orientación y el recorrido entre las dos posiciones.", similarity);
  }
}
