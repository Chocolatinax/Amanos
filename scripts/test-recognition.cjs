const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, deps = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { exports, require: name => deps[name], process });
  return exports;
}
const features = load('lib/features.ts');
const c = load('lib/classifier.ts', { './features': features });
const signs = load('lib/signs.ts');
const vec = n => Array(63).fill(n);
const set = (signId, n) => ({ version: features.FEATURE_VERSION, signId, samples: Array.from({ length: 20 }, () => vec(n)) });
const ids = ['a', 'b', 'c'];
test('demo has the requested ten signs plus hola and only three static letters', () => {
  assert.equal(signs.SIGNS.map(s => s.id).join(','), 'a,b,c,hola,buenos-dias,buenas-tardes,adios,yo,tu,mucho-gusto,gracias');
  assert.equal(signs.STATIC_SIGN_IDS.join(','), ids.join(','));
});
test('recognizes the winning class, not the requested exercise', () => {
  assert.equal(c.classify(vec(1), [set('a', 0), set('b', 1), set('c', 2)], ids).signId, 'b');
});
test('rejects unknown, ambiguous, missing and undersampled references', () => {
  const sets = [set('a', 0), set('b', 1), set('c', 2)];
  assert.equal(c.classify(vec(10), sets, ids), null);
  assert.equal(c.classify(vec(0), [set('a', 0), set('b', 0.01), set('c', 2)], ids), null);
  assert.equal(c.classify(vec(0), sets.slice(0, 2), ids), null);
  sets[2].samples.pop();
  assert.equal(c.classify(vec(0), sets, ids), null);
});
test('rejects legacy, mislabeled and malformed vectors', () => {
  assert.equal(c.parseSamples({ signId: 'a', samples: [vec(0)] }, 'a'), null);
  assert.equal(c.parseSamples(set('b', 0), 'a'), null);
  assert.equal(c.parseSamples({ ...set('a', 0), samples: [[NaN]] }, 'a'), null);
  assert.equal(c.dist([], vec(0)), Infinity);
});
test('requires continuous one-second recognition and resets on loss or camera stall', () => {
  const h = new c.HoldTracker();
  for (let t = 0; t < 1000; t += 100) assert.equal(h.update(true, t), false);
  assert.equal(h.update(true, 1000), true);
  assert.equal(h.update(false, 1100), false);
  assert.equal(h.update(true, 1200), false);
  assert.equal(h.update(true, 3000), false);
  assert.equal(h.update(true, 3100), false);
});
test('normalization ignores image aspect ratio but retains orientation; rejects two hands', () => {
  const world = Array.from({ length: 21 }, (_, i) => ({ x: i * 0.003, y: i * 0.005, z: i * 0.001 }));
  const result = { landmarks: [world], worldLandmarks: [world], handedness: [[{ categoryName: 'Right', score: 0.99 }]] };
  const a = features.normalize(result);
  const b = features.normalize({ ...result, landmarks: [world.map(p => ({ ...p, y: p.y * 2 }))] });
  assert.deepEqual(a, b);
  assert.equal(features.normalize({ ...result, landmarks: [world, world] }), null);
  const rotated = features.normalize({ ...result, worldLandmarks: [world.map(p => ({ x: -p.y, y: p.x, z: p.z }))] });
  assert.notDeepEqual(a, rotated);
});
