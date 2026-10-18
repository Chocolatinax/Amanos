const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, vision) {
 const exports = {};
 const code = ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 vm.runInNewContext(code,{exports,require:()=>vision,fetch:async()=>({ok:false})});
 return exports;
}
const links = [{start:11,end:13},{start:13,end:15},{start:23,end:25}];
const tracking = load('lib/body-tracking.ts', {PoseLandmarker:{POSE_CONNECTIONS:links},FaceLandmarker:{FACE_LANDMARKS_CONTOURS:[{start:0,end:1}]}});
const hands = load('lib/hand.ts',{});
function canvas(){const lines=[],dots=[];return {lines,dots,beginPath(){},moveTo(x,y){lines.push([x,y]);},lineTo(){},stroke(){},arc(x,y){dots.push([x,y]);},fill(){}};}
test('body mask omits hidden arm joints and legs; face contours remain',()=>{
 const points=Array.from({length:33},()=>({x:.5,y:.5,z:0,visibility:1}));points[15].visibility=.1;
 const ctx=canvas();
 tracking.drawBody(ctx,{pose:{landmarks:[points]},face:{faceLandmarks:[points.slice(0,2)]},timestamp:1},640,480);
 assert.equal(ctx.lines.length,2); // one visible arm link and one face link
 assert.equal(ctx.dots.length,4);
});
test('no detections draw no ghost landmarks',()=>{
 const ctx=canvas();tracking.drawBody(ctx,{pose:{landmarks:[]},face:{faceLandmarks:[]},timestamp:1},640,480);
 assert.equal(ctx.lines.length,0);assert.equal(ctx.dots.length,0);
});
test('both detected hands get their own 21 points',()=>{
 const ctx=canvas();const hand=Array.from({length:21},()=>({x:.5,y:.5,z:0}));
 hands.drawLandmarks(ctx,{landmarks:[hand,hand]},640,480);
 assert.equal(ctx.dots.length,42);
});
