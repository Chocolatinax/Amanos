const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
function load(file, deps = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { exports, require: name => deps[name], ...globals }); return exports;
}
const signs = load('lib/signs.ts');
const catalog = load('lib/catalog.tsx', { react: { createContext: () => ({}) }, './signs': signs });
test('catalog edits reach lessons, hidden signs disappear from units, and original data stays intact', () => {
  const result = catalog.mergeCatalog([{ id: 'a', revision: 1, hasReference: false, glosa: 'A nueva', ubicacion: 'Nueva ubicación' }, { id: 'b', revision: 1, hasReference: false, enabled: false }]);
  assert.equal(result.signs.find(s => s.id === 'a').glosa, 'A nueva');
  assert.equal(result.signs.find(s => s.id === 'a').descripcion.ubicacion, 'Nueva ubicación');
  assert.equal(result.signs.find(s => s.id === 'b'), undefined);
  assert.equal(result.units.find(u => u.id === '1').signIds.join(','), 'a,c');
  assert.equal(signs.SIGNS.find(s => s.id === 'a').glosa, 'A');
  const empty = catalog.mergeCatalog(signs.SIGNS.map(s => ({ id: s.id, enabled: false })));
  assert.equal(empty.signs.length, 0); assert.equal(empty.units.length, 0);
});
test('camera uses admin reference and only falls back when the server confirms no override', async () => {
  const calls = [], api = { API_URL: 'https://api.example', hasBackend: () => true };
  let status = 200;
  const source = load('lib/reference-source.ts', { './api': api }, { fetch: async url => {
    calls.push(url); return { ok: status === 200 || url.startsWith('/'), status, json: async () => ({ origin: url }) };
  }});
  assert.equal((await source.loadReference('a')).origin, 'https://api.example/content/references/a');
  assert.equal(calls.length, 1);
  status = 404; calls.length = 0;
  assert.equal((await source.loadReference('gracias')).origin, '/evaluation/gracias-movement.json');
  assert.equal(calls.length, 2);
  status = 503; calls.length = 0;
  await assert.rejects(source.loadReference('a')); assert.equal(calls.length, 1);
});
test('a network failure never silently grades with an obsolete bundled reference', async () => {
  let calls = 0;
  const source = load('lib/reference-source.ts', { './api': { API_URL: 'https://api.example', hasBackend: () => true } }, { fetch: async () => { calls++; throw new Error('offline'); } });
  await assert.rejects(source.loadReference('a')); assert.equal(calls, 1);
});
