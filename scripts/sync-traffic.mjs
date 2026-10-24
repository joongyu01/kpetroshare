import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

export async function collectTraffic(previous, token, now = new Date(), fetcher = fetch) {
assert(token, 'VERCEL_ANALYTICS_TOKEN secret required for visitor chart');
const today = new Date(now.getTime() + 9 * 3600000).toISOString().slice(0,10);
async function queryVisitors(since,until){
  const query = new URLSearchParams({projectId:'prj_maRShtCLAVfbmJNvp3VdvsM0Rrvq',teamId:'team_PeUv6xiiRPaTFvWrGRq4gp03',
    since,until,by:'environment',filter:"environment eq 'production'"});
  const response = await fetcher('https://api.vercel.com/v1/query/web-analytics/visits/aggregate?'+query,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30000)});
  assert(response.ok, `Analytics API returned HTTP ${response.status}`);
  const result = await response.json();
  assert(Array.isArray(result.data), 'Invalid analytics response');
  assert(result.data.length <= 1, 'Unexpected environment groups');
  const visitors = result.data.length ? result.data[0].visitors : 0;
  assert(Number.isInteger(visitors) && visitors >= 0, 'Invalid visitor count');
  return visitors;
}
const days = [];
for (let offset = 6; offset >= 0; offset--) {
  const date = new Date(Date.parse(today) - offset * 86400000).toISOString().slice(0,10);
  if (date < previous.startedAt.slice(0,10)) {days.push({date,visitors:null});continue;}
  const visitors=await queryVisitors(date+'T00:00:00+09:00',date===today?now.toISOString():date+'T23:59:59.999+09:00');
  days.push({date,visitors});
}
const month=today.slice(0,7);
const since=[month+'-01',previous.startedAt.slice(0,10)].sort().at(-1);
const monthly={month,since,visitors:await queryVisitors(since+'T00:00:00+09:00',now.toISOString())};
return {startedAt:previous.startedAt,updatedAt:now.toISOString(),timezone:'Asia/Seoul',days,monthly};
}
if(process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href){
const previous=JSON.parse(await fs.readFile('public/data/traffic.json','utf8'));
const result=await collectTraffic(previous,process.env.VERCEL_ANALYTICS_TOKEN);
await fs.writeFile('public/data/traffic.json',JSON.stringify(result,null,2)+'\n');
console.log('Visitor chart refreshed using production data (Asia/Seoul)');
}
