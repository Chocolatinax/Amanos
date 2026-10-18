const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/movement-check.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:api});
const refs=Object.fromEntries(['gracias','mucho-gusto'].map(id=>[id,api.parseMovementReference(JSON.parse(fs.readFileSync('public/evaluation/'+id+'-movement.json')),id)]));
function run(id,change=p=>p,speed=1){const r=refs[id],tracker=new api.MovementTracker();let verified=false;for(const original of r.frames){const p=change(JSON.parse(JSON.stringify({...original,time:original.time/speed})));const out=tracker.update(p,r);verified ||= out.verified;assert.equal(out.accepted,undefined,'body checks cannot approve the whole sign');}return verified;}
test('observable references validate their sign, scope and time order',()=>{
 for(const [id,r]of Object.entries(refs)){assert(r,id);assert.equal(api.parseMovementReference({...r,scope:'full-sign'},id),null);assert.equal(api.parseMovementReference({...r,signId:'a'},id),null);assert.equal(api.parseMovementReference({...r,frames:[...r.frames].reverse()},id),null);}
});
test('both actual source sequences verify at different tempos',()=>{for(const id of Object.keys(refs))for(const speed of [.6,1,1.2])assert(run(id,p=>p,speed),id+' '+speed);});
test('GRACIAS rejects still hands, one moving hand, small jitter and a one-way sweep',()=>{
 const r=refs.gracias,base=r.frames[10].wrists;
 for(const mode of ['still','one','jitter','sweep']){const tracker=new api.MovementTracker();let verified=false;
  for(let i=0;i<40;i++){const wrists=[...base];if(mode==='one'){wrists[1]+=.15*Math.sin(i/3);}if(mode==='jitter'){wrists[1]+=.01*Math.sin(i);wrists[3]+=.01*Math.sin(i);}if(mode==='sweep'){wrists[1]+=.2*i/40;wrists[3]+=.2*i/40;}verified ||= tracker.update({time:i/10,wrists},r).verified;}
  assert.equal(verified,false,mode);
 }
});
test('wrong height, hands apart and sideways translation do not verify',()=>{
 for(const id of Object.keys(refs))for(const mode of ['low','apart','sideways'])assert.equal(run(id,p=>{if(mode==='low'){p.wrists[1]+=1;p.wrists[3]+=1;}if(mode==='apart'){p.wrists[0]-=1;p.wrists[2]+=1;}if(mode==='sideways'){p.wrists[0]+=1;p.wrists[2]+=1;}return p;}),false,id+' '+mode);
});
test('contact needs a continuous second and never completes from duplicate cached poses',()=>{
 const r=refs['mucho-gusto'],p=r.frames[10],tracker=new api.MovementTracker();
 for(let i=0;i<30;i++)assert.equal(tracker.update(p,r).verified,false);
 assert.equal(tracker.update({...p,time:p.time+.9},r).verified,false,'a long camera gap resets contact');
 tracker.update(null,r);assert.equal(tracker.update({...p,time:p.time+1},r).verified,false);
 for(let i=1;i<=12;i++)tracker.update({...p,time:p.time+1+i/10},r);
 assert.equal(tracker.update({...p,time:p.time+2.3},r).verified,true);
 assert.equal(tracker.update(null,r).verified,false);
});
test('pose observation preserves aspect ratio and rejects hidden wrists and stale frames',()=>{
 function body(aspect){const p=Array.from({length:33},()=>({x:.5/aspect,y:.5,visibility:1}));p[11].x=.3/aspect;p[12].x=.7/aspect;p[15]={x:.25/aspect,y:.6,visibility:1};p[16]={x:.75/aspect,y:.65,visibility:1};return {timestamp:100,pose:{landmarks:[p]},imageSize:{width:aspect*1000,height:1000}};}
 const a=api.observeMovement(body(.6),100),b=api.observeMovement(body(1.3),100);assert(a&&b);a.wrists.forEach((v,i)=>assert(Math.abs(v-b.wrists[i])<1e-10));assert.equal(api.observeMovement(body(.6),500),null);const hidden=body(.6);hidden.pose.landmarks[0][15].visibility=.2;assert.equal(api.observeMovement(hidden,100),null);
});
