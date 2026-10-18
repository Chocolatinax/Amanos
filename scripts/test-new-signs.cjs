const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,deps={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:n=>deps[n],process});return exports;}
const features=load('lib/features.ts');const classifier=load('lib/classifier.ts',{'./features':features});
const c=load('lib/letter-c.ts',{'./classifier':classifier});const dynamic=load('lib/adios.ts',{'./classifier':classifier});
const cRef=JSON.parse(fs.readFileSync('public/samples/c.json'));
const aRef=JSON.parse(fs.readFileSync('public/samples/a.json'));
const adios=JSON.parse(fs.readFileSync('public/evaluation/adios.json'));
test('C accepts captured C and rejects A and closed C',()=>{
 for(const v of cRef.samples)assert.equal(c.evaluateC(v,cRef).accepted,true);
 for(const v of aRef.samples)assert.equal(c.evaluateC(v,cRef).accepted,false);
 const closed=[...cRef.samples[10]];for(let k=0;k<3;k++)closed[24+k]=closed[12+k];
 assert.equal(c.evaluateC(closed,cRef).accepted,false);assert.match(c.evaluateC(closed,cRef).feedback,/Separá/);
 assert.equal(c.evaluateC(null,cRef).accepted,false);
});
test('ADIOS sequence validates data and completes actual motion',()=>{
 const ref=dynamic.parseAdios(adios);assert(ref);
 const tracker=new dynamic.AdiosTracker();let accepted=false;
 for(const p of ref.frames)accepted ||= tracker.update(p.shape,p.anchor,p.time*1000,ref).accepted;
 assert.equal(accepted,true);
 assert.equal(dynamic.parseAdios({...adios,frames:[{shape:[],anchor:[0,0],time:0}]}),null);
});
test('ADIOS cannot complete from a still open hand, bad location, A, or missing body',()=>{
 const ref=dynamic.parseAdios(adios),p=ref.frames[5];
 for(const kind of ['still','low','fist','no-body']){
  const tracker=new dynamic.AdiosTracker();
  for(let i=0;i<40;i++){
   const q=ref.frames[i%ref.frames.length];
   const r=tracker.update(kind==='fist'?aRef.samples[0]:kind==='still'?p.shape:q.shape,kind==='low'?[0,1]:kind==='no-body'?null:p.anchor,i*100,ref);
   assert.equal(r.accepted,false,kind);
  }
 }
});
test('ADIOS clears progress after a camera gap and normalizes mirrored shoulder locations',()=>{
 const ref=dynamic.parseAdios(adios),tracker=new dynamic.AdiosTracker();
 for(const p of ref.frames.slice(0,7))tracker.update(p.shape,p.anchor,p.time*1000,ref);
 assert.equal(tracker.update(ref.frames.at(-1).shape,ref.frames.at(-1).anchor,10000,ref).accepted,false);
 const pose=Array.from({length:33},()=>({x:.5,y:.5,visibility:1}));pose[11].x=.3;pose[12].x=.7;
 const a=dynamic.wristAnchor({x:.2,y:.3},pose,'Right'),b=dynamic.wristAnchor({x:.8,y:.3},pose,'Left');
 assert(Math.abs(a[0]-b[0])<1e-9);assert.equal(a[1],b[1]);
});

test('ADIOS tolerates slower tempo, anatomical proportions and short blur without approving missing input',()=>{
 const ref=dynamic.parseAdios(adios);
 for(const tempo of [.35,.5,1]){
  const tracker=new dynamic.AdiosTracker();let accepted=false;
  for(const [i,p] of ref.frames.entries()){
   const shape=[...p.shape];
   for(const base of [5,9,13,17])for(let j=base+1;j<=base+3;j++)for(let k=0;k<3;k++)shape[j*3+k]=shape[base*3+k]+(shape[j*3+k]-shape[base*3+k])*.8;
   const ts=p.time*1000/tempo;
   if(i===8)assert.equal(tracker.update(null,null,ts-20,ref).accepted,false);
   const r=tracker.update(shape,p.anchor,ts,ref);accepted ||= r.accepted;
   const skipped=tracker.update(shape,p.anchor,ts+20,ref);
   assert.equal(skipped.similarity,r.similarity,'do not flash 0 between sampled frames');
  }
  assert(accepted,'tempo '+tempo);
 }
});
test('ADIOS rejects small tracking jitter and a one-way drift',()=>{
 const ref=dynamic.parseAdios(adios),p=ref.frames[5];
 for(const mode of ['jitter','drift']){
  const tracker=new dynamic.AdiosTracker();
  for(let i=0;i<30;i++){
   const shape=[...p.shape],angle=mode==='jitter'?Math.sin(i)*.02:i*.02;
   for(let j=0;j<21;j++){const x=shape[j*3],y=shape[j*3+1];shape[j*3]=x*Math.cos(angle)-y*Math.sin(angle);shape[j*3+1]=x*Math.sin(angle)+y*Math.cos(angle);}
   assert.equal(tracker.update(shape,p.anchor,i*100,ref).accepted,false,mode);
  }
 }
});

test('ADIOS rejects translating an open hand without wrist movement',()=>{
 const ref=dynamic.parseAdios(adios),p=ref.frames[5],tracker=new dynamic.AdiosTracker();
 for(let i=0;i<36;i++)assert.equal(tracker.update(p.shape,[p.anchor[0]+.3*Math.sin(i*.6),p.anchor[1]],i*100,ref).accepted,false);
});
test('ADIOS rejects a single small wrist wave and an opposite-facing palm',()=>{
 const ref=dynamic.parseAdios(adios),p=ref.frames[5];
 for(const mode of ['small-wave','back-palm']){
  const tracker=new dynamic.AdiosTracker();
  for(let i=0;i<30;i++){
   const q=ref.frames[i%ref.frames.length],shape=[...(mode==='small-wave'?p.shape:q.shape)];
   if(mode==='small-wave')for(let j=0;j<21;j++){const x=shape[j*3],y=shape[j*3+1],angle=.18*Math.sin(i*.3);shape[j*3]=x*Math.cos(angle)-y*Math.sin(angle);shape[j*3+1]=x*Math.sin(angle)+y*Math.cos(angle);}
   else for(let j=0;j<21;j++)shape[j*3]=-shape[j*3];
   assert.equal(tracker.update(shape,q.anchor,i*100,ref).accepted,false,mode);
  }
 }
});

test('ADIOS does not approve one isolated large wrist sweep',()=>{
 const ref=dynamic.parseAdios(adios),p=ref.frames[5],tracker=new dynamic.AdiosTracker();
 for(let i=0;i<30;i++){
  const shape=[...p.shape],angle=.5*Math.sin(2*Math.PI*i/29);
  for(let j=0;j<21;j++){const x=shape[j*3],y=shape[j*3+1];shape[j*3]=x*Math.cos(angle)-y*Math.sin(angle);shape[j*3+1]=x*Math.sin(angle)+y*Math.cos(angle);}
  assert.equal(tracker.update(shape,p.anchor,i*100,ref).accepted,false);
 }
});

test('ADIOS accepts head-height variation and occasional fingertip noise across a real wave',()=>{
 const ref=dynamic.parseAdios(adios),tracker=new dynamic.AdiosTracker();let accepted=false;
 for(const [i,p] of ref.frames.entries()){
  const shape=[...p.shape];
  if(i%6===0){
   const base=5,joint=6,tip=8;
   const a=[0,1,2].map(k=>shape[base*3+k]-shape[joint*3+k]);const len=Math.hypot(...a);const unit=a.map(x=>x/len);
   let perp=[-unit[1],unit[0],0],pl=Math.hypot(...perp);perp=perp.map(x=>x/pl);
   const length=Math.hypot(...[0,1,2].map(k=>shape[tip*3+k]-shape[joint*3+k]));
   for(let k=0;k<3;k++)shape[tip*3+k]=shape[joint*3+k]+length*(-.65*unit[k]+Math.sqrt(1-.65**2)*perp[k]);
  }
  accepted ||= tracker.update(shape,[p.anchor[0]+.2,p.anchor[1]-.65],p.time*1000,ref).accepted;
 }
 assert.equal(accepted,true);
});
test('ADIOS rejects waving a C shape, even with the reference wrist trajectory',()=>{
 const ref=dynamic.parseAdios(adios),tracker=new dynamic.AdiosTracker();
 for(let i=0;i<36;i++){
  const q=ref.frames[i%ref.frames.length],shape=[...cRef.samples[15]],angle=Math.atan2(q.shape[27],-q.shape[28])-.3;
  for(let j=0;j<21;j++){const x=shape[j*3],y=shape[j*3+1];shape[j*3]=x*Math.cos(angle)-y*Math.sin(angle);shape[j*3+1]=x*Math.sin(angle)+y*Math.cos(angle);}
  assert.equal(tracker.update(shape,q.anchor,i*100,ref).accepted,false);
 }
});
