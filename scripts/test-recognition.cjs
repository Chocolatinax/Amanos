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

const letterA = load('lib/letter-a.ts', { './classifier': c });
const aReference = JSON.parse(fs.readFileSync('public/samples/a.json', 'utf8'));
test('A accepts captured reference poses and rejects missing or unrelated data', () => {
  assert(aReference.samples.length >= c.MIN_SAMPLES);
  for (const sample of aReference.samples) assert.equal(letterA.evaluateA(sample, aReference).accepted, true);
  assert.equal(letterA.evaluateA(null, aReference).accepted, false);
  assert.equal(letterA.evaluateA(aReference.samples[0]).accepted, false);
  assert.equal(letterA.evaluateA(vec(50), aReference).accepted, false);
});
test('A rejects extended fingers and a thumb crossed into the palm', () => {
  const open = [...aReference.samples[10]];
  for (const [base, joint, tip] of [[5,6,8],[9,10,12],[13,14,16],[17,18,20]]) {
    for (let axis=0;axis<3;axis++) open[tip*3+axis]=2*open[joint*3+axis]-open[base*3+axis];
  }
  assert.equal(letterA.evaluateA(open,aReference).accepted,false);
  assert.match(letterA.evaluateA(open,aReference).feedback,/cuatro dedos/);
  const crossed = [...aReference.samples[10]];
  for (let axis=0;axis<3;axis++) crossed[4*3+axis]=(crossed[5*3+axis]+crossed[17*3+axis])/2;
  assert.equal(letterA.evaluateA(crossed,aReference).accepted,false);
  assert.match(letterA.evaluateA(crossed,aReference).feedback,/pulgar/);
});


test('B accepts captured samples and rejects a fist, spread fingers and an outward thumb',()=>{
 const {evaluateB}=load('lib/letter-b.ts',{'./classifier':c});
 const r=JSON.parse(fs.readFileSync('public/samples/b.json'));
 for(const v of r.samples)assert.equal(evaluateB(v,r).accepted,true);
 const a=JSON.parse(fs.readFileSync('public/samples/a.json')).samples[0];
 assert.equal(evaluateB(a,r).accepted,false);
 const thumb=[...r.samples[15]];thumb[12]+=1.5;
 assert.equal(evaluateB(thumb,r).accepted,false);
 const spread=[...r.samples[15]];for(const i of [18,19,20])spread[i*3]+=1;
 assert.equal(evaluateB(spread,r).accepted,false);
 assert.equal(evaluateB(null,r).accepted,false);
 assert.equal(evaluateB(r.samples[0]).accepted,false);
});


test('corrected A rejects a moderately separated thumb even before the old broad limit',()=>{
 const {evaluateA}=load('lib/letter-a.ts',{'./classifier':c});
 const reference=JSON.parse(fs.readFileSync('public/samples/a.json'));
 const v=[...reference.samples[15]];
 for(let k=0;k<3;k++)v[12+k]+=.24*(v[15+k]-v[51+k]);
 assert.equal(evaluateA(v,reference).accepted,false);
 assert.match(evaluateA(v,reference).feedback,/pulgar/);
});
