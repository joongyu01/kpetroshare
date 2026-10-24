import {test} from 'node:test';
import assert from 'node:assert/strict';
import {collectTraffic} from './sync-traffic.mjs';
test('daily visitors use Korean day boundaries and do not invent history', async () => {
  const calls=[];
  const result=await collectTraffic({startedAt:'2026-10-23T10:00:00+09:00'},'test',new Date('2026-10-23T03:00:00Z'),async url=>{
    calls.push(new URL(url));return {ok:true,json:async()=>({data:[{visitors:3}]})};
  });
  assert.equal(calls.length,2);
  assert.deepEqual(result.monthly,{month:"2026-10",since:"2026-10-23",visitors:3});
  assert.equal(calls[0].searchParams.get('since'),'2026-10-23T00:00:00+09:00');
  assert.equal(calls[0].searchParams.get('filter'),"environment eq 'production'");
  assert.equal(result.days.filter(d=>d.visitors===null).length,6);
  assert.equal(result.days.at(-1).visitors,3);
});
test('analytics failures never become zero visitor counts', async () => {
  await assert.rejects(collectTraffic({startedAt:'2026-10-23'},'test',new Date('2026-10-23T03:00:00Z'),async()=>({ok:false,status:403})),/HTTP 403/);
  await assert.rejects(collectTraffic({startedAt:'2026-10-23'},'test',new Date('2026-10-23T03:00:00Z'),async()=>({ok:true,json:async()=>({data:[{visitors:'oops'}]})})),/Invalid visitor count/);
});

test('monthly aggregate uses Korean month boundary rather than summing daily counts',async()=>{
 const calls=[];
 const result=await collectTraffic({startedAt:'2026-10-23'},'test',new Date('2026-10-31T15:30:00Z'),async url=>{
  const query=new URL(url).searchParams;calls.push(query);
  return {ok:true,json:async()=>({data:[{visitors:2}]})};
 });
 assert.deepEqual(result.monthly,{month:'2026-11',since:'2026-11-01',visitors:2});
 assert.equal(calls.at(-1).get('since'),'2026-11-01T00:00:00+09:00');
 assert.equal(calls.at(-1).get('until'),'2026-10-31T15:30:00.000Z');
 assert.equal(result.days.reduce((n,d)=>n+d.visitors,0),14);
});
