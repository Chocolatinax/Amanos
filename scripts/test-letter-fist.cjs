const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,deps={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,process,require:n=>deps[n]||{}});return exports;}
const features=load('lib/features.ts'),classifier=load('lib/classifier.ts',{'./features':features,'./reference-source':{},'./api':{}}),L=load('lib/letter-fist.ts',{'./classifier':classifier});
const sets=Object.fromEntries(['a','b','c','i','s'].map(id=>[id,JSON.parse(fs.readFileSync(`public/samples/${id}.json`))]));
const evaluators={a:L.evaluateA,s:L.evaluateS,i:L.evaluateI};
const rate=(id,from)=>{const v=sets[from].samples;return v.filter(x=>evaluators[id](x,sets[id]).accepted).length/v.length;};
test('every letter accepts its own takes, including both A clips',()=>{
 for(const id of ['a','s','i'])assert(rate(id,id)>=.95,id+' '+rate(id,id));
 assert.equal(sets.a.meta.length,2,'A mixes two takes');
});
test('fist letters never accept each other or B and C',()=>{
 for(const id of ['a','s','i'])for(const from of ['a','b','c','i','s'])if(from!==id)assert.equal(rate(id,from),0,id+' accepted '+from);
});
test('accepted poses are not capped below the goal and rejected ones explain what to fix',()=>{
 const good=L.evaluateA(sets.a.samples.at(-1),sets.a);assert(good.accepted);assert(good.similarity>=90);
 const crossed=L.evaluateA(sets.s.samples[5],sets.a);assert.equal(crossed.accepted,false);assert.match(crossed.feedback,/pulgar/);
 const a=L.evaluateS(sets.a.samples.at(-1),sets.s);assert.equal(a.accepted,false);assert.match(a.feedback,/A/);
 assert.match(L.evaluateI(sets.b.samples[3],sets.i).feedback,/Cerrá/);
});
test('the fit does not depend on where the hand is pointing',()=>{
 // Rotación rígida de 40 grados: la A tiene que seguir aprobando igual.
 const c=Math.cos(.7),s=Math.sin(.7),rotate=v=>v.flatMap((_,i)=>i%3?[]:[v[i]*c-v[i+1]*s,v[i]*s+v[i+1]*c,v[i+2]]);
 const v=sets.a.samples[10];assert.equal(L.evaluateA(rotate(v),sets.a).similarity,L.evaluateA(v,sets.a).similarity);
});
test('no pose is accepted as both A and S',()=>{
 const base=sets.a.samples[0],axis=[0,1,2].map(k=>base[15+k]-base[51+k]);
 for(let t=-1.5;t<=1.5;t+=.005){const v=[...base];for(let k=0;k<3;k++)v[12+k]=base[15+k]+t*axis[k];
  const a=L.evaluateA(v,sets.a),s=L.evaluateS(v,sets.s);assert(!(a.accepted&&s.accepted),'both at '+t);
  for(const r of [a,s])assert.equal(r.accepted,r.similarity>=90,'the number and the verdict agree at '+t);}
});
test('I needs the thumb folded over the fingers',()=>{
 const v=[...sets.i.samples[5]];for(let k=0;k<3;k++)v[12+k]+=1.2*(v[15+k]-v[51+k])/Math.hypot(v[15]-v[51],v[16]-v[52],v[17]-v[53]);
 const r=L.evaluateI(v,sets.i);assert.equal(r.accepted,false);assert.match(r.feedback,/pulgar/);
});
test('missing hand or samples never approve',()=>{
 assert.equal(L.evaluateA(null,sets.a).accepted,false);
 assert.match(L.evaluateS(sets.s.samples[0],undefined).feedback,/Cargando la referencia de S/);
 assert.equal(L.evaluateI(sets.i.samples[0],{...sets.i,samples:[]}).accepted,false);
});
