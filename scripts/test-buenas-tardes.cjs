const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports});return exports;}
const h=load('lib/human-evaluator.ts'),{BuenasTardesTracker}=load('lib/buenas-tardes.ts');
const raw=JSON.parse(fs.readFileSync('public/evaluation/buenas-tardes.json')),ref=h.parseHumanReference(raw,'buenas-tardes');
const clone=p=>JSON.parse(JSON.stringify(p));
function run(points){const t=new BuenasTardesTracker();let accepted=false;for(const p of points)accepted ||= t.update(p,ref).accepted;return accepted;}
test('BUENAS TARDES requires ordered reference phases and thumb direction',()=>{
 assert(ref);const missing=clone(raw);delete missing.frames[0].hands[0].thumbDirection;assert.equal(h.parseHumanReference(missing,'buenas-tardes'),null);
 const phases=clone(raw);phases.frames.forEach(p=>p.phase='flat');assert.equal(h.parseHumanReference(phases,'buenas-tardes'),null);
 const wrong=clone(raw);wrong.frames[0].phase='flat';assert.equal(h.parseHumanReference(wrong,'buenas-tardes'),null);
});
test('approved source sequence completes at different tempos',()=>{for(const speed of [.6,1,1.2])assert(run(ref.frames.map(p=>({...p,time:p.time/speed}))),String(speed));});
test('a still thumb-up, flat hand or reverse order cannot complete',()=>{
 for(const phase of ['thumb-up','flat']){const point=ref.frames.find(p=>p.phase===phase);assert.equal(run(Array.from({length:40},(_,i)=>({...clone(point),time:i/10}))),false,phase);}
 assert.equal(run([...ref.frames].reverse().map((p,i)=>({...clone(p),time:i/15}))),false);
});
test('correct trajectory with wrong shape, thumb or palm is rejected',()=>{
 for(const mode of ['fist','no-thumb-up','wrong-palm','wrong-location','no-travel']){
  const points=ref.frames.map(original=>{const p=clone(original),hand=p.hands[0];
   if(mode==='fist')hand.features.splice(0,4,.1,.1,.1,.1);
   if(mode==='no-thumb-up')hand.thumbDirection=[0,1,0];
   if(mode==='wrong-palm'&&p.phase==='flat')hand.features.splice(7,3,0,-1,0);
   if(mode==='wrong-location')hand.anchor[1]+=2;
   if(mode==='no-travel')hand.anchor=clone(ref.frames[0].hands[0].anchor);
   return p;
  });assert.equal(run(points),false,mode);
 }
});
test('isolated snapshots, duplicated observations and a camera gap cannot finish',()=>{
 const first=ref.frames[3],last=ref.frames.at(-1);assert.equal(run([{...clone(first),time:0},{...clone(last),time:.1}]),false);
 const t=new BuenasTardesTracker();for(let i=0;i<25;i++)assert.equal(t.update(first,ref).accepted,false);
 for(const p of ref.frames.filter(p=>p.phase==='thumb-up'))t.update(p,ref);
 assert.equal(t.update(null,ref).accepted,false);
 for(const p of ref.frames.filter(p=>p.phase==='flat'))assert.equal(t.update(p,ref).accepted,false);
 const interrupted=new BuenasTardesTracker();for(const p of ref.frames.filter(p=>p.phase==='thumb-up'))interrupted.update(p,ref);
 for(const p of ref.frames.filter(p=>p.phase==='flat'))assert.equal(interrupted.update({...p,time:p.time+2},ref).accepted,false);
});
test('web publishes the approved avatar movement and no human video',()=>{
 assert(fs.readFileSync('public/avatar/landmarks/Buenas Tardes.json').equals(fs.readFileSync('../avatar-senas/landmarks/Buenas Tardes.json')));
 assert(fs.existsSync('public/movements/buenas-tardes.json'));
 assert(!fs.existsSync('public/videos/buenas-tardes.mp4'));
 assert(fs.readFileSync('public/avatar/viewer.html','utf8').includes('"buenas-tardes":"Buenas Tardes"'));
});
