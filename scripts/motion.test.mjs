import {test} from 'node:test';
import assert from 'node:assert/strict';
import {countUp} from '../src/motion.js';
test('count-up finishes exactly and respects reduced motion including mid-animation changes',()=>{
 const originalRAF=globalThis.requestAnimationFrame,originalMedia=globalThis.matchMedia;
 const preference={matches:false};let frames=[],values=[];
 globalThis.matchMedia=()=>preference;globalThis.requestAnimationFrame=callback=>frames.push(callback);
 try{
  countUp(174,n=>values.push(n));frames.shift()(0);frames.shift()(150);frames.shift()(300);
  assert.equal(values[0],0);assert(values[1]>0&&values[1]<174);assert.equal(values.at(-1),174);assert.equal(frames.length,0);
  preference.matches=true;values=[];countUp(174,n=>values.push(n));assert.deepEqual(values,[174]);assert.equal(frames.length,0);
  preference.matches=false;values=[];countUp(2,n=>values.push(n));frames.shift()(0);preference.matches=true;frames.shift()(50);assert.equal(values.at(-1),2);assert.equal(frames.length,0);
  preference.matches=false;values=[];countUp(0,n=>values.push(n));assert.deepEqual(values,[0]);assert.equal(frames.length,0);
 }finally{globalThis.requestAnimationFrame=originalRAF;globalThis.matchMedia=originalMedia;}
});
