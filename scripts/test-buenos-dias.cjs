const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,deps={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:n=>deps[n]||{}});return exports;}
const human=load('lib/human-evaluator.ts'),movement=load('lib/movement-check.ts',{'./human-evaluator':human}),b=load('lib/buenos-dias.ts',{'./human-evaluator':human,'./movement-check':movement});
const raw=JSON.parse(fs.readFileSync('public/evaluation/buenos-dias.json')),ref=b.parseBuenosDias(raw);
const clone=v=>JSON.parse(JSON.stringify(v));
// Los cuadros de la referencia, con la muestra del pulgar en la fase inicial (como los vería la cámara).
// Después del pulgar, la cámara ve puños (así sale en el 100% de los cuadros del video de referencia).
function source(){let k=0;return ref.frames.map(f=>({time:f.time,wrists:[...f.wrists],thumb:f.phase==='thumb-up'?clone(ref.thumbs[k++%ref.thumbs.length]):null,shape:f.phase==='thumb-up'?null:'fist',phase:f.phase}));}
function run(points){const t=new b.BuenosDiasTracker();let out={accepted:false,similarity:0};for(const p of points){const r=t.update(p,ref);if(r.accepted)out=r;}return out;}
test('reference validates phases, order and thumb samples',()=>{
 assert(ref);
 const missing=clone(raw);missing.thumbs=[];assert.equal(b.parseBuenosDias(missing),null);
 const order=clone(raw);order.frames.find(f=>f.phase==='open').phase='thumb-up';assert.equal(b.parseBuenosDias(order),null);
 assert.equal(b.parseBuenosDias({...raw,signId:'gracias'}),null);
});
test('the source sequence completes at different tempos and mirrored',()=>{
 for(const speed of [.7,1,1.3]){const r=run(source().map(p=>({...p,time:p.time/speed})));assert(r.accepted,String(speed));assert(r.similarity>=90);}
 const mirrored=source().map(p=>({...p,wrists:[-p.wrists[2],p.wrists[3],-p.wrists[0],p.wrists[1]]}));
 assert(run(mirrored).accepted,'left-handed');
});
test('a still pose, reverse order or skipped phase cannot complete',()=>{
 for(const phase of ['thumb-up','cross','open']){const p=source().find(x=>x.phase===phase);assert.equal(run(Array.from({length:60},(_,i)=>({...clone(p),time:i/15}))).accepted,false,phase);}
 assert.equal(run(source().reverse().map((p,i)=>({...p,time:i/15}))).accepted,false,'reverse');
 assert.equal(run(source().filter(p=>p.phase!=='cross')).accepted,false,'no cross');
 assert.equal(run(source().filter(p=>p.phase!=='thumb-up')).accepted,false,'no thumb');
});
test('wrong hand shape, uncrossed arms or low open arms are rejected',()=>{
 const fist=source().map(p=>{if(p.thumb)p.thumb.thumbDirection=[0,1,0];return p;});assert.equal(run(fist).accepted,false,'thumb down');
 const flat=source().map(p=>{if(p.thumb)p.thumb.features.splice(0,4,-1,-1,-1,-1);return p;});assert.equal(run(flat).accepted,false,'open hand');
 const uncrossed=source().map(p=>{if(p.phase==='cross')p.wrists=[.4,p.wrists[1],-.4,p.wrists[3]];return p;});assert.equal(run(uncrossed).accepted,false,'not crossed');
 const low=source().map(p=>{if(p.phase==='open'){p.wrists[1]=1.4;p.wrists[3]=1.4;}return p;});assert.equal(run(low).accepted,false,'low arms');
 const openHands=source().map(p=>{if(p.shape)p.shape='open';return p;});assert.equal(run(openHands).accepted,false,'open hands instead of fists');
 const unseen=source().map(p=>({...p,shape:null}));assert.equal(run(unseen).accepted,false,'hands never seen after the thumb');
 for(const phase of ['cross','open']){const one=source().map(p=>{if(p.phase===phase)p.shape='open';return p;});assert.equal(run(one).accepted,false,'open hands only in '+phase);}
 const mixed=source().map(p=>{if(p.shape)p.shape='mixed';return p;});assert.equal(run(mixed).accepted,false,'one fist and one open hand');
});
test('a long camera gap restarts the attempt',()=>{
 const points=source(),i=points.findIndex(p=>p.phase==='cross');
 assert.equal(run(points.map((p,k)=>k>=i?{...p,time:p.time+1}:p)).accepted,false);
});
test('observation normalizes by shoulder width and picks the raised hand',()=>{
 const pose=Array.from({length:33},()=>({x:.5,y:.5,visibility:1}));pose[11]={x:.6,y:.4,visibility:1};pose[12]={x:.4,y:.4,visibility:1};pose[15]={x:.65,y:.35,visibility:1};pose[16]={x:.4,y:.8,visibility:1};
 const world=Array.from({length:21},(_,i)=>({x:i*.001,y:i*.002,z:0}));world[9]={x:0,y:.05,z:0};
 const image=y=>Array.from({length:21},()=>({x:.5,y,z:0}));
 const res={worldLandmarks:[world,world],landmarks:[image(.8),image(.3)],handedness:[[{categoryName:'Right',score:.9}],[{categoryName:'Left',score:.9}]]};
 const p=b.observeBuenosDias(res,{timestamp:100,imageSize:{width:1000,height:1000},pose:{landmarks:[pose]}},100);
 assert(p&&p.thumb);assert(Math.abs(p.wrists[0]-.75)<1e-9&&Math.abs(p.wrists[1]+.25)<1e-9);
 assert.equal(b.observeBuenosDias(res,{timestamp:100,imageSize:{width:1000,height:1000},pose:{landmarks:[pose]}},600),null);
});
