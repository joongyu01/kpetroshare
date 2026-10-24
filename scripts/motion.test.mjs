import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {countUp} from '../src/motion.js';
test('count-up runs for 500ms even with reduced motion and finishes exactly',()=>{
 const originalRAF=globalThis.requestAnimationFrame,originalMedia=globalThis.matchMedia;
 let frames=[],values=[];
 globalThis.matchMedia=()=>({matches:true});
 globalThis.requestAnimationFrame=callback=>frames.push(callback);
 try{
  countUp(174,n=>values.push(n));
  frames.shift()(0);frames.shift()(250);frames.shift()(500);
  assert.equal(values[0],0);assert(values[1]>0&&values[1]<174);
  assert.equal(values.at(-1),174);assert.equal(frames.length,0);
  values=[];countUp(0,n=>values.push(n));assert.deepEqual(values,[0]);assert.equal(frames.length,0);
 }finally{globalThis.requestAnimationFrame=originalRAF;globalThis.matchMedia=originalMedia;}
});
test('motion styles stay enabled independently of system preferences',()=>{
 for(const file of ['motion.css','resources.css','dashboard.css']){
  assert(!readFileSync(new URL('../src/'+file,import.meta.url),'utf8').includes('prefers-reduced-motion'));
 }
});
