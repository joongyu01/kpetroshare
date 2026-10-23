import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseList,parseDetail,safeURL,validateSnapshot,branchFor,changesBetween} from './sync-resources.mjs';

test('parser rejects error pages and invalid links instead of erasing data', () => {
  assert.throws(() => parseList('<h1>Maintenance</h1>'));
  assert.throws(() => parseDetail('<h1>Login</h1>'));
  assert.throws(() => safeURL('javascript:alert(1)'));
  assert.throws(() => safeURL('https://example.com/'));
});
test('parses resource IDs, fee, photos and refreshed detail from source HTML', () => {
  const list=parseList(`<p class="num">총 <span>1</span>건</p><ul class="srchList"><li><a class="sbj_txt" onclick="fnNewPageResourceDetail('CPS001.005', 'ABC123')">새 드릴</a><a class="mapView" onclick="fnRsrcMapSearch('ABC123')"></a><span class="ca_1">한국석유관리원 제주본부</span><ul class="infoList"><li><strong>이용 요금</strong><span>무료</span></li></ul><p class="thumbImg"><img src="/photo.png"></p></li></ul>`);
  assert.equal(list.total,1);assert.equal(list.items[0].id,'ABC123');assert.equal(list.items[0].fee,'무료');
  assert.equal(list.items[0].url,'https://www.eshare.go.kr/UserPortal/Upv/UprResrcGds/index.do?rsrc_no=ABC123');
  const detail=parseDetail('<table><tr><td data-cell-header="자원 명칭">새 드릴</td><td data-cell-header="제공 기관">한국석유관리원 제주본부</td><td data-cell-header="이용 요금">유료</td></tr></table><div id="rsrcIntrcnArea">새 조건</div>');
  assert.equal(detail.details.fee,'유료');assert.equal(detail.details.description,'새 조건');
});
test('complete pagination required, including duplicate and large-loss protection', () => {
  validateSnapshot([{id:'a'},{id:'b'}],2,2);
  assert.throws(() => validateSnapshot([{id:'a'}],2,2));
  assert.throws(() => validateSnapshot([{id:'a'},{id:'a'}],2,2));
  assert.throws(() => validateSnapshot([{id:'a'}],1,10));
});
test('new branches are classified from source and unknown branches fail safely', () => {
  assert.equal(branchFor({provider:'한국석유관리원 제주본부',name:'그라인더',url:'https://www.eshare.go.kr/'}),'제주본부');
  assert.throws(() => branchFor({provider:'한국석유관리원 신규본부',name:'공구',url:'https://www.eshare.go.kr/'}));
});
test('reports count source changes but ignore verification timestamps', () => {
  const old={id:'a',name:'드릴',branch:'제주본부',details:{fee:'무료'},verifiedAt:'old'};
  const next=[{...old,verifiedAt:'new'},{...old,id:'b',name:'그라인더'}];
  const b=changesBetween([old],next).find(b=>b.branch==='제주본부');
  assert.deepEqual(b.added,['그라인더']);assert.equal(b.updated.length,0);assert.equal(b.total,2);
  assert.equal(changesBetween([old],[{...old,details:{fee:'유료'}}]).find(b=>b.branch==='제주본부').updated.length,1);
});
