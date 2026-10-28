const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(f){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:()=>({})});return exports;}
const h=load('lib/human-evaluator.ts');
const refs=Object.fromEntries(['tu','gracias','hola'].map(id=>[id,h.parseHumanReference(JSON.parse(fs.readFileSync('public/evaluation/'+id+'.json')),id)]));
test('human references match their schema and require exact hand counts',()=>{
 for(const [id,r]of Object.entries(refs)){assert(r,id);assert.equal(h.parseHumanReference({...r,signId:'other'},id),null);assert.equal(h.parseHumanReference({...r,requiredHands:3},id),null);}
});
test('TÚ accepts captured pointing and rejects an open hand or upward index',()=>{
 const tracker=new h.HumanEvaluator(),r=refs.tu;
 for(const p of r.frames)assert.equal(tracker.update(p,r,p.time*1000).accepted,true);
 for(const source of [refs.hola.frames[0],refs.gracias.frames[5]])assert.equal(tracker.update({time:0,hands:[source.hands[0]],gap:0},r,0).accepted,false);
 const up=JSON.parse(JSON.stringify(r.frames[5]));up.hands[0].features.splice(4,3,0,-1,0);
 assert.equal(tracker.update(up,r,up.time*1000).accepted,false);
 assert.equal(tracker.update(null,r,10000).accepted,false);
});
test('HOLA accepts its observed sequence with timing variation',()=>{
 for(const id of ['hola'])for(const speed of [1,.6]){
  const r=refs[id],tracker=new h.HumanEvaluator();let accepted=false;
  for(const p of r.frames){const sample={...p,time:p.time/speed};accepted ||= tracker.update(sample,r,sample.time*1000).accepted;}
  assert(accepted,id+' at '+speed);
 }
});
test('dynamic signs reject still hands, missing hands and missing body observations',()=>{
 for(const id of ['hola','gracias']){
  const r=refs[id],tracker=new h.HumanEvaluator();
  for(let i=0;i<45;i++)assert.equal(tracker.update({...r.frames[8],time:i/10},r,i*100).accepted,false,id);
  assert.equal(tracker.update({...r.frames[8],hands:[]},r,5000).accepted,false);
  assert.equal(tracker.update(null,r,5100).accepted,false);
 }
});
test('HOLA rejects a wave below the face; GRACIAS never approves a fist',()=>{
 for(const id of ['hola','gracias']){
  const r=refs[id],tracker=new h.HumanEvaluator();let accepted=false;
  for(const original of r.frames){const p=JSON.parse(JSON.stringify(original));
   if(id==='hola')p.hands.forEach(hand=>{hand.anchor[3]=1;hand.anchor[1]=1;});
   else p.hands.forEach(hand=>{hand.features.splice(0,4,.7,.7,.7,.7);});
   accepted ||= tracker.update(p,r,p.time*1000).accepted;
  }
  assert.equal(accepted,false,id);
 }
});
test('body locations use consistent image-height units across aspect ratios',()=>{
 const v=JSON.parse(fs.readFileSync('public/samples/a.json')).samples[0];
 const world=Array.from({length:21},(_,i)=>({x:v[i*3]*.1,y:v[i*3+1]*.1,z:v[i*3+2]*.1}));
 function observation(aspect){
  const pose=Array.from({length:33},()=>({x:.5/aspect,y:.5,z:0,visibility:1}));pose[11].x=.3/aspect;pose[12].x=.7/aspect;
  const image=Array.from({length:21},()=>({x:.4/aspect,y:.4,z:0}));
  return h.observeHuman({landmarks:[image],worldLandmarks:[world],handedness:[[{categoryName:'Right',score:1}]]},{timestamp:100,imageSize:{width:aspect*1000,height:1000},pose:{landmarks:[pose]}},100,1);
 }
 const a=observation(.6),b=observation(1.3);assert(a&&b);
 a.hands[0].anchor.forEach((v,i)=>assert(Math.abs(v-b.hands[0].anchor[i])<1e-10));
 assert.equal(h.observeHuman({},{timestamp:0},500,1),null);
});

test('GRACIAS supplies movement guidance while never recording mastery',()=>{
 const r=refs.gracias,tracker=new h.HumanEvaluator();let pathDetected=false;
 for(const p of r.frames){const output=tracker.update(p,r,p.time*1000);assert.equal(output.accepted,false);assert.equal(output.similarity,0);pathDetected ||= /se parece/.test(output.feedback);}
 assert(pathDetected);
});
test('changing tempo cannot complete from a single isolated snapshot',()=>{
 for(const id of ['hola','gracias']){
  const r=refs[id],tracker=new h.HumanEvaluator();
  const p=r.frames[0];assert.equal(tracker.update(p,r,p.time*1000).accepted,false);
  const last=r.frames.at(-1);assert.equal(tracker.update(last,r,last.time*1000+10000).accepted,false);
 }
});


test('HOLA rejects the same correct path with a separated or unobserved thumb',()=>{
 const r=refs.hola;
 for(const mode of ['separated','missing','bent','spread']){
  const tracker=new h.HumanEvaluator();let accepted=false;
  for(const original of r.frames){const p=JSON.parse(JSON.stringify(original));
   if(mode==='separated')p.hands[0].thumb=[1.5,1.6,1.8];
   if(mode==='missing')delete p.hands[0].thumb;
   if(mode==='bent')p.hands[0].features[0]=.4;
   if(mode==='spread')p.hands[0].features[10]=3;
   accepted ||= tracker.update(p,r,p.time*1000).accepted;
  }
  assert.equal(accepted,false,mode);
 }
 const invalid=JSON.parse(JSON.stringify(r));delete invalid.frames[0].hands[0].thumb;
 assert.equal(h.parseHumanReference(invalid,'hola'),null);
});
