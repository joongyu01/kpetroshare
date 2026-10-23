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
test('deletions are reported even when a new item keeps the total unchanged', () => {
  const old={id:'a',name:'드릴',branch:'제주본부',details:{fee:'무료'}};
  const b=changesBetween([old],[{...old,id:'b',name:'망치'}]).find(b=>b.branch==='제주본부');
  assert.deepEqual(b.removed,['드릴']);assert.deepEqual(b.added,['망치']);assert.equal(b.total,b.before);
  assert.equal(changesBetween([old],[{...old,image:{url:'https://www.eshare.go.kr/new.png'}}]).find(b=>b.branch==='제주본부').updated.length,1);
});
import {parseAlioList,parseAlioDetail,mergeAlio} from './sync-resources.mjs';

test('Alio parser rejects incomplete pages and reads current conditions',()=>{
  assert.throws(()=>parseAlioList('<h1>점검</h1>','product'));
  const list=parseAlioList(`<div class="totalTxt"><h3><strong>1</strong></h3></div><ul class="photo_list01"><li><h4 onclick="fnDetail('1585');">전지톱</h4></li></ul>`,'product');
  assert.equal(list.items[0].id,'product-1585');
  assert.throws(()=>parseAlioDetail('<h1>삭제됨</h1>',list.items[0]));
  const detail=parseAlioDetail(`<div class="h2_tit"><h2><strong>충북본부 전지톱</strong></h2></div><div class="cont_view_top"><ul class="info"><li><span class="info_tit">기관명</span><span class="info_txt">한국석유관리원</span></li><li><span class="info_tit">시설주소</span><span class="info_txt">충청북도 음성군 충북본부</span></li></ul></div><div class="cont_view01_list"><ul><li><div class="tit">이용안내</div><div class="txt">새 대여조건</div></li></ul></div>`,list.items[0]);
  assert.equal(detail.branch,'충북본부');assert.equal(detail.details.description,'새 대여조건');
});
test('Alio deletions remove dead links, preserve other source and stable identity',()=>{
  const url='https://www.alioplus.go.kr/product/productDetail.do?productSeq=1';
  const a={id:'product-1',name:'드릴',branch:'충북본부',url,details:{fee:'무료'},hours:''};
  const eshare={id:'e1',name:'드릴',branch:'충북본부',url:'https://www.eshare.go.kr/item',links:[{label:'공유누리',url:'https://www.eshare.go.kr/item'},{label:'알리오플러스',url}]};
  const removed=mergeAlio([eshare],[eshare],[],'now');assert.equal(removed.length,1);assert.equal(removed[0].links.length,1);
  const fallback=mergeAlio([],[eshare],[a],'now');assert.equal(fallback[0].id,'e1');assert.equal(fallback[0].url,url);assert.equal(fallback[0].links.length,1);
  assert.equal(mergeAlio([],fallback,[],'now').length,0);
  const merged=mergeAlio([eshare],[eshare],[a],'now');assert.equal(merged.length,1);assert.equal(merged[0].alio.details.fee,'무료');
  assert.deepEqual(mergeAlio(merged,merged,[a],'later'),merged);
  assert.equal(mergeAlio([{...eshare,branch:'본사',links:[]}],[],[a],'now').length,2);
});
test('distinct Alio registrations with identical names are not collapsed',()=>{
 const a={id:'product-1',name:'test',branch:'본사',url:'https://www.alioplus.go.kr/product/productDetail.do?productSeq=1',details:{fee:'무료'}};
 assert.equal(mergeAlio([],[],[a,{...a,id:'product-2',url:a.url.replace('Seq=1','Seq=2')}],'now').length,2);
});
