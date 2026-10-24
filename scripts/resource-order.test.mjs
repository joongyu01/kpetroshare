import {test} from 'node:test';import assert from 'node:assert/strict';
import {sortResources,knownChangedAt} from '../src/resource-order.js';
import {stampChanges,changesBetween} from './sync-resources.mjs';
test('sorting is global, deterministic and never mutates original order',()=>{
 const rows=[{id:'b',name:'나무',branch:'제주본부',changedAt:'2026-10-20'},{id:'c',name:'가위',branch:'본사',changedAt:null},{id:'a',name:'가방',branch:'제주본부',changedAt:'2026-10-23'}];
 const ids=list=>list.map(i=>i.id);
 assert.deepEqual(ids(sortResources(rows,'name')),['a','c','b']);
 assert.deepEqual(ids(sortResources(rows,'updated')),['a','b','c']);
 assert.deepEqual(ids(sortResources(rows,'branch')),['c','a','b']);
 assert.deepEqual(ids(sortResources(rows,'default')),['b','c','a']);assert.deepEqual(ids(rows),['b','c','a']);
 assert.deepEqual(sortResources([],'updated'),[]);
});
test('real changes advance timestamps, routine verification preserves them and unknown dates stay unknown',()=>{
 const a={id:'a',name:'가위',branch:'본사',details:{fee:'무료'},changedAt:'2026-10-20'};
 const b={id:'b',name:'드릴',branch:'제주본부',details:{fee:'무료'}};
 const previous={items:[a,b]};
 const result=stampChanges(previous,[{...a,verifiedAt:'2026-10-24'},{...b},{...b,id:'c',name:'새 드릴'}],'2026-10-24');
 assert.equal(result[0].changedAt,'2026-10-20');assert.equal(result[1].changedAt,null);assert.equal(result[2].changedAt,'2026-10-24');
 assert.equal(stampChanges(previous,[{...a,details:{fee:'유료'}}],'2026-10-24')[0].changedAt,'2026-10-24');
 assert.equal(changesBetween([a],[result[0]])[0].updated.length,0);
});
test('legacy dates are recovered only from an unambiguous recorded change',()=>{
 const a={id:'a',name:'가위',branch:'본사'};
 const data={items:[a],latestChanges:{at:'2026-10-23',branches:[{branch:'본사',added:[],updated:['가위']}]}};
 assert.equal(knownChangedAt(a,data),'2026-10-23');
 assert.equal(knownChangedAt({...a,name:'미확인'},data),null);
 data.items.push({...a,id:'b'});assert.equal(knownChangedAt(a,data),null);
});
