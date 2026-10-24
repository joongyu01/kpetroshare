import assert from 'node:assert/strict';
import {setupSurveyDismiss} from '../src/survey-dismiss.js';
const key='kpetroshare-survey-hidden-until',hour=3600000;
const original={setTimeout,clearTimeout,now:Date.now};
let now=10000000,stored,callback,delay;
Date.now=()=>now;
globalThis.setTimeout=(fn,ms)=>{callback=fn;delay=ms;return 1};
globalThis.clearTimeout=()=>{};
globalThis.localStorage={getItem:()=>stored,setItem:(k,v)=>{assert.equal(k,key);stored=v}};
function mount(checked=false){
 const menu={hidden:false},checkbox={checked};let click;
 setupSurveyDismiss(menu,{addEventListener:(event,fn)=>{assert.equal(event,'click');click=fn}},checkbox);
 return {menu,checkbox,click};
}
try{
 let a=mount();a.click();assert.equal(a.menu.hidden,true);assert.equal(stored,undefined);
 assert.equal(mount().menu.hidden,false,'plain close does not persist on reload');
 a=mount(true);a.click();assert.equal(Number(stored),now+hour);assert.equal(delay,hour);
 now+=60000;a=mount();assert.equal(a.menu.hidden,true);assert.equal(delay,hour-60000);
 callback();assert.equal(a.menu.hidden,false,'open page reappears at expiry');
 now+=hour;assert.equal(mount().menu.hidden,false,'expired timestamp does not hide on reload');
 stored='invalid';assert.equal(mount().menu.hidden,false);
 globalThis.localStorage={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}};
 a=mount(true);a.click();assert.equal(a.menu.hidden,true);callback();assert.equal(a.menu.hidden,false);
 console.log('Survey close, reload persistence, expiry and blocked storage passed');
}finally{Object.assign(globalThis,{setTimeout:original.setTimeout,clearTimeout:original.clearTimeout});Date.now=original.now;delete globalThis.localStorage}
