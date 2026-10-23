import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {load} from 'cheerio';
import {branches} from '../src/branches.js';

const origin = 'https://www.eshare.go.kr';
const routes = {'001':'Gym','002':'Facl','098':'Facl','003':'Camp','004':'Eqp','005':'Gds','006':'Edu','007':'Expr','008':'Pfm','009':'Evnt'};
const norm = s => (s || '').replace(/\s+/g, ' ').trim();
const excluded = new Set(['BA10A0002007', 'HC30R1432650']); // Reviewed duplicate parking entry and expired 2026 course.
export function safeURL(value, base = origin) {
  const url = new URL(value, base);
  assert(['www.eshare.go.kr','www.alioplus.go.kr','www.zeus.go.kr'].includes(url.hostname), 'Unexpected resource host');
  assert(['http:','https:'].includes(url.protocol), 'Invalid URL protocol');
  url.protocol = 'https:';
  return url.href;
}
export function parseList(html) {
  const $ = load(html);
  const totalText = $('.num span').first().text().replace(/,/g, '');
  assert(/^\d+$/.test(totalText), 'Search total missing');
  const items = $('.srchList > li').toArray().map(el => {
    const row = $(el), a = row.find('a.sbj_txt');
    const action = a.attr('onclick') || '';
    const match = action.match(/fnNewPageResourceDetail\('([^']+)',\s*'([^']+)'/);
    const id = (row.find('.mapView').attr('onclick') || '').match(/fnRsrcMapSearch\('([^']+)'/)?.[1];
    assert(id && a.text(), 'Unrecognized search row');
    const direct = action.match(/location.href='([^']+)'/);
    const route = routes[match?.[1].slice(-3)];
    assert(direct || route, 'Unknown resource route');
    const fields = {};
    row.find('.infoList > li').each((_, e) => { fields[norm($(e).find('strong').text())] = norm($(e).find('span').text()); });
    const image = row.find('.thumbImg img').attr('src');
    return {id, name:norm(a.text()), url:safeURL(direct ? direct[1] : `/UserPortal/Upv/UprResrc${route}/index.do?rsrc_no=${id}`),
      classification:fields['자원 분류'] || '', address:fields['위치 정보'] || '', fee:fields['이용 요금'] || '', provider:norm(row.find('.ca_1').text()),
      image:image && !/no.?img|no.?image|default/i.test(image) ? safeURL(image) : null};
  });
  return {total:Number(totalText), items};
}
export function parseDetail(html) {
  const $ = load(html), fields = {};
  $('td[data-cell-header]').each((_, e) => { fields[$(e).attr('data-cell-header')] = norm($(e).text()).replace(/지도보기/g, '').trim(); });
  assert(fields['자원 명칭'] && fields['제공 기관'], 'Resource detail missing');
  return {name:fields['자원 명칭'], details:{address:fields['장소/위치'] || '', provider:fields['제공 기관'], phone:fields['예약 문의'] || '',
    target:fields['이용 대상'] || '', approval:fields['심사 여부'] || '', fee:fields['이용 요금'] || '',
    description:norm($('#rsrcIntrcnArea').text()), notice:norm($('#atpnArea').text())},
    hours:['평일','토요일','일요일/공휴일'].filter(k => fields[k]).map(k => `${k}: ${fields[k]}`).join(' · ')};
}
export function branchFor(row) {
  const text = row.provider + row.name;
  const found = branches.find(b => b.name !== '본사' && text.includes(b.name));
  if (found) return found.name;
  if (row.url.includes('www.zeus.go.kr')) return '미래기술연구소';
  assert(/한국석유관리원/.test(row.provider), 'Unrelated provider');
  assert(!/본부|연구소/.test(row.provider), 'Unknown branch: ' + row.provider);
  return '본사';
}
async function request(url, options = {}) {
  safeURL(url);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {...options, signal:AbortSignal.timeout(30000)});
      assert(response.ok, `HTTP ${response.status}`);
      safeURL(response.url);
      return await response.text();
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 1500 * (attempt + 1)));
    }
  }
}
export function validateSnapshot(rows, total, oldCount) {
  assert(total > 0 && total <= 5000, 'Unexpected search total');
  assert.equal(rows.length, total, 'Incomplete pagination');
  assert.equal(new Set(rows.map(r => r.id)).size, total, 'Repeated pagination');
  assert(total >= oldCount * 0.8, 'Large decrease requires manual review; keeping previous data');
}
export function changesBetween(previous, items) {
  const comparable = i => JSON.stringify([i.name,i.branch,i.type,i.url,i.details,i.hours,i.image?.url,i.links,i.alio]);
  return branches.map(b => {
    const before = previous.filter(i => i.branch === b.name), after = items.filter(i => i.branch === b.name);
    return {branch:b.name, before:before.length, total:after.length,
      added:after.filter(i => !previous.some(p => p.id === i.id)).map(i => i.name),
      updated:after.filter(i => {const p = previous.find(p => p.id === i.id);return p && comparable(p) !== comparable(i);}).map(i => i.name),
      removed:before.filter(i => !items.some(n => n.id === i.id)).map(i => i.name)};
  });
}

const alioOrigin = 'https://www.alioplus.go.kr';
const isAlio = url => new URL(url).hostname === 'www.alioplus.go.kr';
const alioKey = url => {const u=new URL(url);return u.searchParams.has('productSeq') ? 'product-'+u.searchParams.get('productSeq') : 'facility-'+u.searchParams.get('facltSeq');};
export function parseAlioList(html, kind) {
  const $=load(html), count=norm($('.totalTxt h3 strong').first().text()).replace(/,/g,'');
  assert(/^\d+$/.test(count), 'Alio search total missing');
  const items=$('.photo_list01 li h4').toArray().map(e=>{
    const id=($(e).attr('onclick')||'').match(/fnDetail\('([0-9]+)'\)/)?.[1];
    assert(id && norm($(e).text()), 'Alio search row missing');
    return {id:kind+'-'+id, url:alioOrigin+(kind==='product'?'/product/productDetail.do?productSeq=':'/facilities/facltDetail.do?facltSeq=')+id};
  });
  return {total:Number(count),items};
}
export function parseAlioDetail(html, row) {
  const $=load(html), fields={}, sections={};
  $('br').replaceWith(' ');
  $('.cont_view_top .info li').each((_,e)=>{fields[norm($(e).find('.info_tit').text())]=norm($(e).find('.info_txt').text());});
  $('.cont_view01_list > ul > li').each((_,e)=>{sections[norm($(e).children('.tit').text())]=norm($(e).children('.txt').text());});
  const name=norm($('.h2_tit h2 strong').text()), address=fields['시설주소'];
  assert(name && address && fields['기관명']==='한국석유관리원' && sections['이용안내'], 'Alio detail missing or unrelated');
  const text=name+' '+address+' '+(sections['문의처']||'');
  const branch=branches.find(b=>b.name!=='본사' && text.includes(b.name)) || branches.find(b=>address.includes(b.city));
  assert(branch, 'Unknown Alio branch: '+address);
  const image=$('.cont_view_top .img img').first().attr('src');
  return {...row,name,branch:branch.name,type:row.id.startsWith('product-')?'물품':/주차/.test(name)?'주차장':/테니스|체육/.test(name)?'체육시설':'회의실·공간',
    details:{address,provider:fields['기관명'],phone:fields['문의처']||'',target:fields['이용대상']||'',fee:fields['유·무료여부']||sections['이용요금']||'',approval:'원문 예약조건 확인',description:sections['이용안내'],notice:['대여안내','대여방법','이용요금'].filter(k=>sections[k]).map(k=>k+': '+sections[k]).join(' · ')},
    hours:sections['대여가능시간']||sections['이용가능시간']||'',image:image?{url:safeURL(image,alioOrigin),sourceUrl:row.url}:undefined};
}
export function mergeAlio(items, previous, alio, now) {
  const canonical = name => name.replace(/한국석유관리원|[\s()·ㆍ]/g,'').replace(/런닝/g,'러닝').replace(/인바디측정기/g,'인바디');
  const result=items.filter(i=>!isAlio(i.url) || alio.some(a=>alioKey(a.url)===alioKey(i.url))).map(i=>{
    const copy={...i,links:i.links.filter(l=>!isAlio(l.url))};delete copy.alio;return copy;
  });
  for(const a of alio) {
    const linked = i => [i.url,...(i.links||[]).map(l=>l.url)].some(url=>isAlio(url)&&alioKey(url)===alioKey(a.url));
    const old=previous.find(linked);
    let item=result.find(linked) || result.find(i=>old && i.id===old.id && i.branch===a.branch);
    if(!item){const matches=result.filter(i=>!isAlio(i.url) && !i.alio && i.branch===a.branch && canonical(i.name)===canonical(a.name));if(matches.length===1)item=matches[0];}
    if(!item){item={id:old?.id||'alio-'+a.id,links:[],caution:''};result.push(item);}
    if(!item.url || isAlio(item.url)) {
      Object.assign(item,{name:a.name,branch:a.branch,type:a.type,url:a.url,source:'알리오플러스',details:a.details,hours:a.hours,image:a.image,detail_verified:true,verification:'알리오플러스 상세 자동 확인',verifiedAt:now});
    } else {
      item.alio={name:a.name,details:a.details,hours:a.hours,image:a.image};
      item.verification='공유누리·알리오플러스 자동 확인';
    }
    item.links.push({label:'알리오플러스',url:a.url});
  }
  return result;
}
async function collectAlio(previous) {
  const rows=[];
  for(const kind of ['product','facility']) {
    let total, collected=[];
    for(let page=1;;page++) {
      assert(page<=500,'Alio pagination limit');
      const endpoint=kind==='product'?'/product/productList.do':'/facilities/facltByRegionList.do';
      const result=parseAlioList(await request(alioOrigin+endpoint+'?schApbaId=C0215&pageNo='+page),kind);
      total ??= result.total;assert.equal(result.total,total,'Alio changed during pagination');
      assert(result.items.length || total===0,'Empty Alio page');collected.push(...result.items);
      if(collected.length>=total)break;
    }
    assert.equal(collected.length,total,'Incomplete Alio pagination');rows.push(...collected);
  }
  const oldCount=previous.alioSourceCount ?? new Set(previous.items.flatMap(i=>[i.url,...i.links.map(l=>l.url)]).filter(isAlio).map(alioKey)).size;
  validateSnapshot(rows,rows.length,oldCount);
  const details=[];for(const row of rows)details.push(parseAlioDetail(await request(row.url),row));
  console.log('Collected '+details.length+' Alio records and details');return details;
}

export async function sync() {
  const file = 'public/data/resources.json';
  const previous = JSON.parse(await fs.readFile(file, 'utf8'));
  const rows = [];
  let total;
  for (let page = 1; ; page++) {
    assert(page <= 500, 'Pagination limit');
    const result = parseList(await request(origin + '/UserPortal/adv/unifdSearch/ConditionsSearch.do', {method:'POST', body:new URLSearchParams({searchWrd:'한국석유관리원',sort:'RANK',order:'DESC',pageIndex:String(page),collection:'resource_cate1',viewType:'UnitPage'})}));
    total ??= result.total;
    assert.equal(result.total, total, 'Source changed during pagination; retry later');
    assert(result.items.length > 0, 'Empty search page');
    rows.push(...result.items);
    if (rows.length >= total) break;
  }
  validateSnapshot(rows, total, previous.sourceCount ?? previous.items.filter(i => !i.id.startsWith('alio-')).length);
  console.log(`Collected ${total} source records`);
  const now = new Date().toISOString();
  let items = [];
  for (const row of rows.filter(r => !excluded.has(r.id))) {
    const old = previous.items.find(i => i.id === row.id);
    const type = row.classification.startsWith('물품') ? '물품' : row.classification.startsWith('연구') ? '연구·실험장비' : row.classification.startsWith('교육') ? '교육·강좌' : /테니스|체육/.test(row.classification + row.name) ? '체육시설' : /주차/.test(row.classification + row.name) ? '주차장' : '회의실·공간';
    const source = row.url.includes('www.zeus.go.kr') ? 'ZEUS' : row.url.includes('www.alioplus.go.kr') ? '알리오플러스' : '공유누리';
    const detail = source === '공유누리' ? parseDetail(await request(row.url)) : null;
    const item = {...old, id:row.id, name:(detail?.name || row.name).replace(/^한국석유관리원\s*/, '').replace(/^미래기술연구소\s*/, ''),
      branch:branchFor(row), type, url:row.url, source,
      links:[{label:source,url:row.url}, ...(old?.links || []).filter(l => l.url !== row.url)],
      details:detail?.details || {phone:old?.details.phone || '',target:old?.details.target || '',approval:'원문 확인',description:old?.details.description || '연계 등록된 자원입니다. 이용조건은 원문에서 확인하세요.',notice:old?.details.notice || '',address:row.address,provider:row.provider,fee:row.fee},
      hours:detail?.hours || '', caution:old?.caution || '', detail_verified:Boolean(detail),
      verification:detail ? '공유누리 상세 자동 확인' : '공유누리 연계 목록 자동 확인', verifiedAt:now};
    if (row.id === 'GG11K812441') item.details.fee = '요금 확인 필요';
    if (row.image) item.image = {url:row.image,sourceUrl:row.url}; else delete item.image;
    items.push(item);
  }
  const alio = await collectAlio(previous);
  items = mergeAlio(items, previous.items, alio, now);
  const changes = changesBetween(previous.items, items);
  const hasChanges = changes.some(b => b.added.length || b.updated.length || b.removed.length);
  const completedAt = new Date().toISOString();
  const lastSync = {at:completedAt,from:previous.updatedAt,before:previous.items.length,total:items.length,
    added:changes.reduce((n,b) => n+b.added.length,0),updated:changes.reduce((n,b) => n+b.updated.length,0),removed:changes.reduce((n,b) => n+b.removed.length,0),branches:changes};
  const document = {...previous, updatedAt:completedAt, sourceCount:total, alioSourceCount:alio.length, items, lastSync,
    latestChanges:hasChanges ? {at:completedAt,from:previous.updatedAt,branches:changes} : previous.latestChanges,
    notes:['공유누리 전체 검색과 공유누리 상세 페이지를 정기 수집합니다.','ZEUS 등 연계 자원은 공유누리 목록만 확인하며 예약 가능 여부는 원문에서 확인해야 합니다.','알리오플러스 전체 목록과 상세를 정기 수집합니다. 두 출처에서 모두 사라진 자원만 제외합니다.','검토된 중복 주차장과 종료 교육은 제외합니다.']};
  await fs.writeFile(file + '.tmp', JSON.stringify(document, null, 2) + '\n');
  await fs.rename(file + '.tmp', file);
  console.log(`Saved ${items.length} resources; all pages and details validated`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const report = ['## 자원 자동 갱신', `전체 ${previous.items.length} → ${items.length}개`, '', '| 본부 | 추가 | 정보 변경 | 제외 | 현재 |','|---|---:|---:|---:|---:|',
      ...changes.map(b => `| ${b.branch} | ${b.added.length} | ${b.updated.length} | ${b.removed.length} | ${b.total} |`)];
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, report.join('\n')+'\n');
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await sync();
