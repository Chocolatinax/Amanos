const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,deps={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,process,require:n=>deps[n]||{}});return exports;}
const features=load('lib/features.ts'),classifier=load('lib/classifier.ts',{'./features':features,'./reference-source':{},'./api':{}}),letters=load('lib/letter-is.ts',{'./classifier':classifier});
const samples=id=>JSON.parse(fs.readFileSync(`public/samples/${id}.json`));
// Sin muestras reales de I y S todavía: se usan las de B como "otra letra" para probar la lógica.
const as=(set,signId)=>({...set,signId});
test('S approves its own samples and rejects a pose that is closer to A',()=>{
 const a=samples('a'),s=as(samples('b'),'s');
 assert.equal(letters.evaluateLetter(s.samples[3],'s',[s,a]).accepted,true);
 const r=letters.evaluateLetter(a.samples[3],'s',[s,a]);assert.equal(r.accepted,false);assert.match(r.feedback,/Se parece más a A/);
 // Similitud saturada en 100 para ambas: igual tiene que ganar la distancia más corta (A).
 const near=as({...a,samples:a.samples.map(v=>v.map(x=>x+.01))},'s');assert.equal(letters.evaluateLetter(a.samples[3],'s',[near,a]).accepted,false,'ties at 100 must not approve S');
});
test('I requires the little finger to be the extended one',()=>{
 const b=samples('b');const r=letters.evaluateLetter(b.samples[3],'i',[as(b,'i')]);
 assert.equal(r.accepted,false,'four extended fingers are not an I');assert.match(r.feedback,/meñique/);
});
test('missing samples or hand never approve',()=>{
 assert.equal(letters.evaluateLetter(null,'s',[]).accepted,false);
 assert.match(letters.evaluateLetter(samples('a').samples[0],'i',[]).feedback,/Cargando la referencia de I/);
});
