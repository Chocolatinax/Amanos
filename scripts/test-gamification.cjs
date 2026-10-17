const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync('lib/gamification.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const g = {}; vm.runInNewContext(code, { exports: g, require: () => ({}) });
const empty = () => ({ signs: {}, streak: 0, plan: 'gratis', activity: {} });
test('seen da 10 XP solo la primera vez', () => {
  let r = g.applySeen(empty(), 'a', '2026-10-19'); assert.equal(r.xpGained, 10);
  r = g.applySeen(r.progress, 'a', '2026-10-19'); assert.equal(r.xpGained, 0); assert.equal(r.progress.xp, 10);
});
test('dominar suma 50 XP una vez y exige el umbral', () => {
  let r = g.applyAttempt(empty(), 'a', 89, '2026-10-19', 90); assert.equal(r.newlyMastered, false);
  r = g.applyAttempt(r.progress, 'a', 90, '2026-10-19', 90); assert.equal(r.newlyMastered, true); assert.equal(r.xpGained, 50);
  r = g.applyAttempt(r.progress, 'a', 99, '2026-10-19', 90); assert.equal(r.xpGained, 0);
});
test('racha: consecutiva, viva si fue ayer, se rompe con hueco', () => {
  let p = empty();
  for (const d of ['2026-10-15', '2026-10-16', '2026-10-17']) p = g.applySeen(p, 'a', d).progress;
  assert.equal(g.computeStats(p, 11, '2026-10-18').streak, 3);
  assert.equal(g.computeStats(p, 11, '2026-10-20').streak, 0);
  assert.equal(g.computeStats(p, 11, '2026-10-20').bestStreak, 3);
});
test('semana empieza en lunes y niveles suben con XP', () => {
  const s = g.computeStats(empty(), 11, '2026-10-19'); // lunes
  assert.equal(s.week[0].state, 'today'); assert.equal(s.week[0].date, '2026-10-19');
  assert.equal(g.levelFor(250).name, 'Aliado');
});
