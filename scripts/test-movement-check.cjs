const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,deps={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:n=>deps[n]||{}});return exports;}
const human=load('lib/human-evaluator.ts'),api=load('lib/movement-check.ts',{'./human-evaluator':human});
const refs=Object.fromEntries(['gracias'].map(id=>[id,api.parseMovementReference(JSON.parse(fs.readFileSync('public/evaluation/'+id+'-movement.json')),id)]));
function run(id,change=p=>p,speed=1){const r=refs[id],tracker=new api.MovementTracker();let verified=false;for(const original of r.frames){const p=change(JSON.parse(JSON.stringify({...original,time:original.time/speed})));const out=tracker.update(p,r);verified ||= out.verified;assert.equal(out.accepted,undefined,'body checks cannot approve the whole sign');}return verified;}
test('observable references validate their sign, scope and time order',()=>{
 for(const [id,r]of Object.entries(refs)){assert(r,id);assert.equal(api.parseMovementReference({...r,scope:'full-sign'},id),null);assert.equal(api.parseMovementReference({...r,signId:'a'},id),null);assert.equal(api.parseMovementReference({...r,frames:[...r.frames].reverse()},id),null);}
});
test('a verified check reports where its best stretch starts',()=>{const r=refs.gracias,t=new api.MovementTracker();let out;for(const p of r.frames)out=t.update(JSON.parse(JSON.stringify(p)),r);assert(out.verified);assert(Number.isFinite(out.windowStart)&&out.windowStart>=r.frames[0].time&&out.windowStart<r.frames.at(-1).time);});
test('only GRACIAS uses the movement check',()=>{assert.deepEqual([...api.MOVEMENT_CHECK_IDS],['gracias']);assert.equal(api.parseMovementReference({...refs.gracias,mode:'contact'},'gracias'),null);});
test('the actual source sequence verifies at different tempos',()=>{for(const id of Object.keys(refs))for(const speed of [.6,1,1.2])assert(run(id,p=>p,speed),id+' '+speed);});
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
test('hand openness tells open hands from fists and the vote needs a majority',()=>{
 // Mano sintética: dedos rectos (abierta) o doblados hacia la palma (puño).
 function hand(open){const pts=Array.from({length:21},()=>({x:0,y:0,z:0}));[[5,6,7,8],[9,10,11,12],[13,14,15,16],[17,18,19,20]].forEach((chain,f)=>{chain.forEach((j,k)=>{pts[j]=open?{x:f*.2-.3,y:-.8-k*.3,z:0}:{x:f*.2-.3,y:k===0?-.8:k===1?-1.05:-0.85,z:k===0?0:k===1?.2:.35};});});pts[9]={x:-.1,y:-1,z:0};pts[10]=open?{x:-.1,y:-1.3,z:0}:{x:-.1,y:-1.25,z:.2};pts[11]=open?{x:-.1,y:-1.6,z:0}:{x:-.1,y:-1.05,z:.35};pts[12]=open?{x:-.1,y:-1.9,z:0}:{x:-.1,y:-.9,z:.2};return pts;}
 const result=(...hands)=>({worldLandmarks:hands.map(hand),handedness:hands.map(()=>[{categoryName:'Right',score:.9}])});
 assert.equal(api.handOpenness(result(true)),'open');
 assert.equal(api.handOpenness(result(false)),'fist');
 assert.equal(api.handOpenness(result(false,true)),'mixed','a clear fist next to an open hand is not open');
 assert.equal(api.handOpenness({worldLandmarks:[],handedness:[]}),null);
 const vote=new api.ShapeVote();for(let i=0;i<3;i++)vote.update('open',i/10);assert.equal(vote.ok('open'),false,'needs enough frames');
 vote.update('open',.3);assert.equal(vote.ok('open'),true);assert.equal(vote.ok('open',.25),false,'only votes from the evaluated stretch count');
 for(let i=0;i<6;i++)vote.update('fist',.4+i/10);assert.equal(vote.ok('open'),false,'fists win the majority');assert.equal(vote.ok('fist'),true);
 vote.update(null,6);assert.equal(vote.ok('fist'),false,'old votes expire');
 const mixed=new api.ShapeVote();for(let i=0;i<4;i++)mixed.update('open',i/10);for(let i=0;i<10;i++)mixed.update('mixed',.4+i/10);assert.equal(mixed.ok('open'),false,'one fist and one open hand counts against');
});
test('pose observation preserves aspect ratio and rejects hidden wrists and stale frames',()=>{
 function body(aspect){const p=Array.from({length:33},()=>({x:.5/aspect,y:.5,visibility:1}));p[11].x=.3/aspect;p[12].x=.7/aspect;p[15]={x:.25/aspect,y:.6,visibility:1};p[16]={x:.75/aspect,y:.65,visibility:1};return {timestamp:100,pose:{landmarks:[p]},imageSize:{width:aspect*1000,height:1000}};}
 const a=api.observeMovement(body(.6),100),b=api.observeMovement(body(1.3),100);assert(a&&b);a.wrists.forEach((v,i)=>assert(Math.abs(v-b.wrists[i])<1e-10));assert.equal(api.observeMovement(body(.6),500),null);const hidden=body(.6);hidden.pose.landmarks[0][15].visibility=.2;assert.equal(api.observeMovement(hidden,100),null);
});
