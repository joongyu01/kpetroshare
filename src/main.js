import './panel-resize.js';
import {setupSurveyDismiss} from './survey-dismiss.js';
import {sortResources,sortOptions,knownChangedAt} from './resource-order.js';
import {renderStats,dateLabel} from './stats.js';
import './style.css';
import './dashboard.css';
import './resources.css';
import './motion.css';
import {geoMercator,geoPath,geoArea} from 'd3-geo';
import QRCode from 'qrcode';
import {createIcons, Boxes, Map, CircleHelp, ArrowUpRight, Search, Scan, ExternalLink, X, ArrowRight, Building2, Drill, HardHat, Wrench, BriefcaseMedical, Fan, Sprout, MapPin, ChevronRight, ArrowLeft, Phone, Navigation, Info, HeartPulse, Printer, Tent, ChevronDown, SearchX, PackageOpen, FlaskConical, Car, GraduationCap, Dumbbell, QrCode} from 'lucide';
import {branches,categoryOf} from './branches';
const iconSet={Boxes,Map,CircleHelp,ArrowUpRight,Search,Scan,ExternalLink,X,ArrowRight,Building2,Drill,HardHat,Wrench,BriefcaseMedical,Fan,Sprout,MapPin,ChevronRight,ArrowLeft,Phone,Navigation,Info,HeartPulse,Printer,Tent,ChevronDown,SearchX,PackageOpen,FlaskConical,Car,GraduationCap,Dumbbell,QrCode};
const $=s=>document.querySelector(s);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=name=>`<i data-lucide="${name}"></i>`;
const updateIcons=()=>createIcons({icons:iconSet});
const state={branch:null,query:'',type:'전체',free:true,all:true,sort:'default'};
let items=[],mapReady=false,updatedAt=null;
let page=1,lastFilterKey="";const pageSize=8;
const types=['전체','물품','회의실·공간','체육시설','주차장','연구·실험장비','교육·강좌'];
const typeIcons={'물품':'wrench','회의실·공간':'building-2','체육시설':'dumbbell','주차장':'car','연구·실험장비':'flask-conical','교육·강좌':'graduation-cap'};
const sourceURL='https://www.eshare.go.kr/UserPortal/adv/unifdSearch/UnifiedSearchMainView.do?searchWrd='+encodeURIComponent('한국석유관리원');
const branchLabel=b=>`${b.region}(${b.name})`;
const itemBranchLabel=item=>{const b=branches.find(b=>b.name===item.branch);return b?branchLabel(b):item.branch};
function branchItems(b){return items.filter(i=>i.branch===b.name)}
function normalize(s){return String(s).toLowerCase().replace(/\s+/g,'').replace(/사디리/g,'사다리').replace(/잔디깍기/g,'잔디깎기').replace(/런닝/g,'러닝')}
function matches(i){const text=normalize([i.name,i.branch,i.type,i.category,i.details.address,branches.find(b=>b.name===i.branch)?.region].join(' '));return(state.type==='전체'||i.type===state.type)&&(!state.free||i.details.fee==='무료')&&state.query.trim().split(/\s+/).every(t=>text.includes(normalize(t)))}
function filtered(){return items.filter(i=>(!state.branch||i.branch===state.branch.name)&&matches(i))}
function address(b){return b.address||branchItems(b)[0]?.details.address||''}
function navigateURL(b){return 'https://map.kakao.com/?q='+encodeURIComponent(address(b))}
function writeURL(){const url=new URL(location.href);for(const [k,v] of Object.entries({branch:state.branch?.id,type:state.type==='전체'?'':state.type,q:state.query,free:state.free?'':'0',sort:state.sort==='default'?'':state.sort,view:''})){if(v)url.searchParams.set(k,v);else url.searchParams.delete(k)}history.replaceState(null,'',url)}
function renderSummary(){const confirmed=branches.filter(b=>branchItems(b).length);$('#site-count').textContent=confirmed.length;$('#resource-count').textContent=items.length;$('#dashboard-summary').innerHTML=[['전체 등록 자원',items.length+'개','중복·종료 항목 정리','boxes'],['이용 가능 지역',confirmed.length+'곳','','building-2'],['자원 종류',(types.length-1)+'종','물품부터 공간·교육까지','map'],['무료 등록 자원',items.filter(i=>i.details.fee==='무료').length+'개','요금 문의·확인 필요 별도','heart-pulse']].map(([label,value,note,ico])=>`<div class="summary-card"><span class="summary-icon">${icon(ico)}</span><div><p>${label}</p><strong>${value}</strong>${note?`<small>${note}</small>`:""}</div></div>`).join('')}
function renderTypes(){$('#resource-types').innerHTML=types.map(t=>`<button class="type-chip ${state.type===t?'active':''}" data-type="${t}" aria-pressed="${state.type===t}">${t}<small>${items.filter(i=>t==='전체'||i.type===t).length}</small></button>`).join('')}
function activeFilters(){const filters=[];if(state.branch)filters.push(['branch',branchLabel(state.branch)]);if(state.query)filters.push(['query','검색: '+state.query]);if(state.type!=='전체')filters.push(['type',state.type]);if(state.free)filters.push(['free','무료만']);return '<div class="active-filters" aria-label="적용 중인 검색 조건">'+filters.map(([key,label])=>`<button data-remove-filter="${key}" aria-label="${escape(label)} 조건 해제">${escape(label)} ${icon('x')}</button>`).join('')+'</div>'}
function useLabel(item){const text=item.details.description+' '+item.details.notice;if(/현장\s*사용|현장\s*이용|외부\s*반출\s*(불가|금지)|현재 설치된/.test(text))return '현장 이용';if(['회의실·공간','체육시설','주차장'].includes(item.type))return '방문 이용';if(item.type==='물품'&&/무상대여|대여가능|대여 가능|대여 시/.test(text))return '대여 · 조건 확인';return item.type==='물품'?'반출 여부 문의':'이용방법 확인'}
function branchHeader(b){return `<button class="back-button" id="back">${icon('arrow-left')} 전체 지역 보기</button><section class="branch-detail"><div class="detail-region">${icon('map-pin')}${b.region}</div><h2>${b.name}</h2><p class="branch-address">${escape(address(b))}</p><div class="detail-actions"><a href="${navigateURL(b)}" target="_blank" rel="noopener noreferrer">${icon('navigation')} 길찾기</a><button data-branch-qr="${b.id}">${icon('qr-code')} 기관 QR</button></div></section>`}
function itemCard(item,index=0){const fee=item.details.fee||'요금 문의';const phone=item.details.phone;return `<article class="item-card" style="--card-order:${index}"><a class="item-link" href="${escape(item.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escape(item.branch+' '+item.name)} — ${item.source} 상세보기 (새 창)"><span class="item-visual ${item.image?'has-photo':''}">${icon(typeIcons[item.type])}${item.image?`<img src="${escape(item.image.url)}" alt="${escape(item.name)} 등록 사진" loading="lazy" decoding="async" referrerpolicy="no-referrer">`:""}</span><span class="item-copy"><span class="item-branch">${escape(itemBranchLabel(item))} · ${escape(item.source)}</span><h3>${escape(item.name)}</h3><span class="item-badges"><span class="${fee==='무료'?'badge-free':'badge-inquiry'}">${escape(fee)}</span><span>·</span><span>${item.type}</span><span class="badge-onsite">${useLabel(item)}</span></span></span>${icon('arrow-up-right')}</a>${item.caution?`<p class="resource-caution">${icon('info')}${escape(item.caution)}</p>`:''}<div class="item-extra"><button data-notice="${item.id}" aria-expanded="false" aria-controls="notice-${item.id}">${icon('info')} 이용조건 ${icon('chevron-down')}</button><button data-qr="${item.id}" aria-label="${escape(item.name)} 예약 페이지 QR">${icon('qr-code')} QR</button>${phone?`<a href="tel:${escape(phone)}" aria-label="${escape(item.name)} 문의 ${escape(phone)}">${icon('phone')}${escape(phone)}</a>`:''}</div><div class="item-notice" id="notice-${item.id}" hidden><p><strong>${escape(item.details.approval||'예약 전 원문 확인')}</strong></p>${item.hours?`<p><strong>운영시간</strong> ${escape(item.hours)}</p>`:''}${item.details.target?`<p>이용대상: ${escape(item.details.target)}</p>`:''}${item.details.description?`<p>${escape(item.details.description)}</p>`:''}${item.details.notice&&item.details.notice!==item.details.description?`<p>${escape(item.details.notice)}</p>`:''}${item.alio?`<p><strong>알리오플러스 등록 정보</strong></p><p>${escape(item.alio.name)} · ${escape(item.alio.details.fee)} · ${escape(item.alio.hours)}</p><p>${escape(item.alio.details.description)}</p><p>${escape(item.alio.details.notice)}</p>`:''}<div class="source-links">${item.links.map(l=>`<a href="${escape(l.url)}" target="_blank" rel="noopener noreferrer">${escape(l.label)} ↗</a>`).join('')}</div><p>${escape(item.verification)} · ${escape(dateLabel(item.verifiedAt || updatedAt))}<br>최신 이용조건과 예약 가능 여부는 원문에서 확인하세요.</p></div></article>`}
function render(){
 const initial=false;
 renderTypes();{const found=sortResources(filtered(),state.sort);const filterKey=JSON.stringify([state.branch?.id,state.query,state.type,state.free,state.sort]);if(filterKey!==lastFilterKey){page=1;lastFilterKey=filterKey}const pages=Math.max(1,Math.ceil(found.length/pageSize));page=Math.min(page,pages);$('#pagination').innerHTML=`<button data-page="${page-1}" ${page===1?'disabled':''}>이전</button><span>${page} / ${pages} 페이지 · ${found.length}개</span><button data-page="${page+1}" ${page===pages?'disabled':''}>다음</button>`;$('#list-toolbar').innerHTML=(state.branch?branchHeader(state.branch):`<div class="list-heading"><h2>${state.free?'전국 무료 자원':'전국 개방자원'}</h2><button class="clear-filters" id="clear-search">처음으로</button></div>`)+activeFilters()+`<div class="result-summary"><span>등록 자원 <strong>${found.length}개</strong></span><label class="sort-control">정렬 <select id="resource-sort" aria-label="자원 정렬">${Object.entries(sortOptions).map(([value,label])=>`<option value="${value}" ${state.sort===value?'selected':''}>${label}</option>`).join('')}</select></label></div>${state.sort==='updated'?'<p class="sort-note">이 사이트에서 실제 정보 변경을 확인한 순서입니다. 변경일 미확인 항목은 뒤에 표시합니다.</p>':''}`;$('#results').innerHTML=found.length?found.slice((page-1)*pageSize,page*pageSize).map(itemCard).join(''):`<div class="empty-state">${icon('search-x')}<h3>${state.branch?.empty?'등록 자원을 확인하지 못했어요':'조건에 맞는 자원이 없어요'}</h3><p>위의 조건을 하나씩 해제하거나 전국 무료 자원을 다시 둘러보세요.</p><button id="reset-search">검색 조건 초기화</button></div>`}
 if(mapReady){document.querySelectorAll('.map-marker').forEach(el=>{const selected=el.dataset.branch===state.branch?.id;el.classList.toggle('selected',selected);el.setAttribute('aria-pressed',String(selected));const b=branches.find(b=>b.id===el.dataset.branch);const count=branchItems(b).filter(matches).length;el.querySelector('.marker-count').textContent=b.empty?'–':count;el.setAttribute('aria-label',branchLabel(b)+' '+(b.empty?'등록 자원 미확인':count+'개 자원 보기'));el.classList.toggle('filtered-out',!count&&!b.empty)});document.querySelectorAll('.province').forEach(el=>el.classList.toggle('active',Boolean(state.branch?.area.includes(el.dataset.area))))}
 $('#free-only').checked=state.free;$('#announce').textContent=initial?'지역별 개방자원 목록':(state.branch?.name||'전국')+' '+filtered().length+'개 자원';writeURL();updateIcons();
}
function setMobileView(view){document.body.dataset.mobileView=view;document.querySelectorAll('button[data-mobile-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mobileView===view)))}
function setBranch(id,scroll=true){if(matchMedia('(max-width:760px)').matches)setMobileView('list');state.branch=branches.find(b=>b.id===id)||null;state.all=false;render();$('#results').scrollTop=0;if(scroll&&matchMedia('(max-width:760px)').matches)$('.list-panel').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'})}
function reset(){state.branch=null;state.query='';state.type='전체';state.free=true;state.all=true;state.sort='default';$('#search').value='';render()}
async function showQR(title,url,source){$('#qr-title').textContent=title;$('#qr-source').textContent=source;$('#qr-link').href=url;$('#qr-image').innerHTML=await QRCode.toString(url,{type:'svg',margin:3,width:240,color:{dark:'#253f2e',light:'#ffffff'}});$('#qr-dialog').showModal()}

function drawMap(data){
 // D3 uses clockwise outer rings; normalize the GeoJSON before projecting.
 for(const f of data.features){if(geoArea(f)>2*Math.PI){if(f.geometry.type==='Polygon')f.geometry.coordinates.forEach(r=>r.reverse());else if(f.geometry.type==='MultiPolygon')f.geometry.coordinates.forEach(p=>p.forEach(r=>r.reverse()))}}
 const projection=geoMercator().fitExtent([[202,148],[627,627]],data),path=geoPath(projection);
 const names={'Gangwon':'강원','Gyeonggi':'경기','South Chungcheong':'충남','Incheon':'인천','North Jeolla':'전북','South Jeolla':'전남','South Gyeongsang':'경남','Busan':'부산','Ulsan':'울산','North Gyeongsang':'경북','Jeju':'제주','Seoul':'서울','Daejeon':'대전','Sejong':'세종','North Chungcheong':'충북','Gwangju':'광주','Daegu':'대구'};
 const paths=data.features.map(f=>`<path class="province" d="${path(f)}" data-area="${escape(f.properties.shapeName)}" role="button" tabindex="0" aria-label="${names[f.properties.shapeName]} 지역 자원 보기"><title>${names[f.properties.shapeName]} 지역 선택</title></path>`).join('');
 const markers=branches.filter(b=>b.coord).map(b=>{
  const [x,y]=projection(b.coord),[dx,dy]=b.label;const title=b.region;
  const width=Math.max(title.length*11+44,(b.name.length+2)*9+44),height=48,lx=dx<0?x-50-width:x+dx,ly=y+dy;
  const endpoint=dx<0?lx+width:lx;const count=b.empty?'–':branchItems(b).length;
  return `<g class="map-marker ${b.empty?'empty':''}" data-branch="${b.id}" tabindex="0" role="button" aria-label="${branchLabel(b)} ${b.empty?'등록 자원 미확인':count+'개 자원 보기'}" aria-pressed="false"><path class="marker-line" d="M${x},${y} L${endpoint},${ly+height/2}"/><circle class="marker-halo" cx="${x}" cy="${y}" r="12"/><circle class="marker-dot" cx="${x}" cy="${y}" r="5.5"/><rect class="marker-label" x="${lx}" y="${ly}" width="${width}" height="${height}" rx="7"/><text class="marker-title" x="${lx+12}" y="${ly+19}">${title}</text><text class="marker-subtitle" x="${lx+12}" y="${ly+36}">(${b.name})</text><rect class="marker-count-bg" x="${lx+width-29}" y="${ly+14}" width="22" height="20" rx="5"/><text class="marker-count" x="${lx+width-18}" y="${ly+28}" text-anchor="middle">${count}</text></g>`;
 }).join('');
 $('#map-canvas').innerHTML=`<svg class="national-map" viewBox="100 160 620 540" aria-label="대한민국 지역 선택 지도"><title>한국석유관리원 개방자원 지도</title><text class="sea-label" x="162" y="399">서해</text><text class="sea-label" x="594" y="260">동해</text><text class="sea-label" x="426" y="583">남해</text><g>${paths}</g><g>${markers}</g></svg>`;
 mapReady=true;
}

document.addEventListener('error',e=>{if(e.target.matches?.('.item-visual img')){e.target.parentElement.classList.remove('has-photo');e.target.remove()}},true);
document.addEventListener('click',e=>{
 const pageButton=e.target.closest('[data-page]');if(pageButton){page=Number(pageButton.dataset.page);render();$('#results').scrollTop=0;if(matchMedia('(max-width:760px)').matches)$('.list-panel').scrollIntoView({block:'start'});return}
 const view=e.target.closest('button[data-mobile-view]');if(view){setMobileView(view.dataset.mobileView);return}
 const remove=e.target.closest('[data-remove-filter]');if(remove){const key=remove.dataset.removeFilter;if(key==='branch')state.branch=null;if(key==='query'){state.query='';$('#search').value=''}if(key==='type')state.type='전체';if(key==='free')state.free=false;render();$('#results').scrollTop=0;return}
 const branch=e.target.closest('[data-branch]');if(branch){setBranch(branch.dataset.branch);return}
 const area=e.target.closest('[data-area]');if(area){const target=area.dataset.area==='Gyeonggi'?branches[0]:branches.find(b=>b.area.includes(area.dataset.area));if(target)setBranch(target.id);return}
 const type=e.target.closest('[data-type]');if(type){state.type=type.dataset.type;state.all=true;render();$('#results').scrollTop=0;return}
 const query=e.target.closest('[data-query]');if(query){state.branch=null;state.type='전체';state.query=query.dataset.query;state.all=true;$('#search').value=state.query;render();return}
 const notice=e.target.closest('[data-notice]');if(notice){const panel=$('#notice-'+notice.dataset.notice);panel.hidden=!panel.hidden;notice.setAttribute('aria-expanded',String(!panel.hidden));return}
 const qr=e.target.closest('[data-qr]');if(qr){const item=items.find(i=>i.id===qr.dataset.qr);showQR(item.name,item.url,item.source+' 상세 페이지로 연결됩니다.');return}
 const branchQR=e.target.closest('[data-branch-qr]');if(branchQR){const b=branches.find(b=>b.id===branchQR.dataset.branchQr);showQR(b.name,'https://kpetroshare.joongyu.co.kr/?branch='+b.id,'기관별 개방자원 목록으로 연결됩니다.');return}
 if(e.target.closest('#back,#map-reset')){state.branch=null;render();return}if(e.target.closest('#nav-map,#clear-search,#reset-search'))reset();
 if(e.target.closest('#show-all')){state.branch=null;state.query='';state.type='전체';state.free=false;state.all=true;$('#search').value='';render()}
});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)&&!document.querySelector('dialog[open]')){e.preventDefault();$('#search').focus()}if((e.key==='Enter'||e.key===' ')&&e.target.matches('.map-marker,.province')){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}))}});
$('#search').addEventListener('input',e=>{state.query=e.target.value.trim();state.all=true;render();$('#results').scrollTop=0});
$('#list-toolbar').addEventListener('change',e=>{if(e.target.id==='resource-sort'){state.sort=e.target.value;render();$('#results').scrollTop=0;$('#resource-sort').focus();}});
$('#free-only').addEventListener('change',e=>{state.free=e.target.checked;state.all=true;render()});
$('#library-open').addEventListener('click',()=>$('#library-dialog').showModal());
$('#library-close').addEventListener('click',()=>$('#library-dialog').close());
$('#guide-open').addEventListener('click',()=>$('#guide').showModal());
['guide-close','guide-done'].forEach(id=>$('#'+id).addEventListener('click',()=>$('#guide').close()));
$('#qr-close').addEventListener('click',()=>$('#qr-dialog').close());
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
updateIcons();
try{
 const response=await fetch('/data/resources.json',{cache:'no-cache'});if(!response.ok)throw Error('resources');const data=await response.json();
 updatedAt=data.updatedAt;$('#map-updated').textContent='목록 확인 '+dateLabel(updatedAt);for(const b of branches){b.empty=!data.items.some(i=>i.branch===b.name)}renderStats(data);
 items=data.items.map(i=>({...i,changedAt:knownChangedAt(i,data),category:i.type==='물품'?categoryOf(i.name):i.type,onsite:i.type==='물품'||i.type==='연구·실험장비'?/외부 반출|현장 사용|현장사용|현재 설치된/.test(i.details.description+' '+i.details.notice):false}));
 const params=new URL(location.href).searchParams;state.branch=branches.find(b=>b.id===params.get('branch'))||null;state.type=types.includes(params.get('type'))?params.get('type'):'전체';state.query=params.get('q')||'';state.sort=Object.hasOwn(sortOptions,params.get('sort'))?params.get('sort'):'default';state.free=params.get('free')!=='0';state.all=params.get('view')==='all';$('#search').value=state.query;
 renderSummary();render();try{const geo=await fetch('/data/korea.geojson');if(!geo.ok)throw Error('map');drawMap(await geo.json());render()}catch{$('#map-canvas').innerHTML='<p class="map-loading">지도를 불러오지 못했어요.<br>지역 목록에서 자원을 찾아보세요.</p>'}
}catch{$('#results').innerHTML=`<div class="empty-state"><h3>목록을 불러오지 못했어요</h3><p>잠시 후 새로고침해주세요.</p><a href="${sourceURL}" target="_blank" rel="noopener noreferrer">공유누리 열기</a></div>`}

// Survey data stays in Google Forms; only its public entry point is displayed here.
fetch('/data/site-config.json').then(r=>r.ok?r.json():null).then(async config=>{
 if(!config?.satisfactionUrl)return;
 const url=new URL(config.satisfactionUrl);if(url.protocol!=='https:')return;
 const menu=document.createElement('aside');menu.className='survey-menu';menu.setAttribute('aria-label','이용 만족도 설문');
 const heading=document.createElement('strong');heading.textContent='이용 만족도 설문';
 const close=document.createElement('button');close.type='button';close.className='survey-close';close.textContent='×';close.setAttribute('aria-label','만족도 설문 메뉴 닫기');
 const header=document.createElement('div');header.className='survey-heading';header.append(heading,close);
 const qr=document.createElement('a');qr.href=url.href;qr.target='_blank';qr.rel='noopener noreferrer';qr.className='survey-qr';qr.setAttribute('aria-label','QR 또는 클릭으로 만족도 설문 열기 (새 창)');
 qr.innerHTML=await QRCode.toString(url.href,{type:'svg',margin:4,width:120,color:{dark:'#183c32',light:'#ffffff'}});
 qr.querySelector('svg').setAttribute('aria-hidden','true');
 const link=document.createElement('a');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';link.className='survey-action';link.textContent='설문 참여하기 ↗';
 const hint=document.createElement('small');hint.textContent='QR 스캔 또는 링크 클릭';
 const snooze=document.createElement('label');snooze.className='survey-snooze';
 const checkbox=document.createElement('input');checkbox.type='checkbox';snooze.append(checkbox,document.createTextNode('1시간 동안 보지 않기'));
 menu.append(header,qr,link,hint,snooze);setupSurveyDismiss(menu,close,checkbox);document.body.append(menu);
}).catch(()=>{});
