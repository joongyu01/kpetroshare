import './stats.css';
const escape = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const dateLabel = value => new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
export function renderStats(data) {
  const latest = data.latestChanges;
  const added = latest?.branches.reduce((n,b)=>n+b.added.length,0) || 0;
  const changed = latest?.branches.filter(b=>b.added.length || b.updated.length || b.removed.length) || [];
  const featured=[...changed].sort((a,b)=>b.added.length-a.added.length).slice(0,2);
  const max = Math.max(1,...featured.map(b=>b.added.length+b.updated.length));
  const panel = document.createElement('details');
  panel.className='site-stats';panel.open=!matchMedia('(max-width:760px)').matches;
  panel.innerHTML=`<summary>업데이트 · 방문 통계 <span>${added?`+${added}개`:''}</span></summary><div class="stats-content"><h3>최근 자원 갱신</h3><p class="stats-meta">${escape(dateLabel(data.updatedAt))} 확인 · 매일 자동 갱신</p><p class="stats-total">전체 <b>${data.items.length}개</b>${latest?` · 최근 추가 <b>${added}개</b>`:''}</p><div class="branch-chart">${featured.map(b=>`<div class="stats-row"><span>${escape(b.branch)}</span><div class="stats-track"><i style="width:${b.added.length/max*100}%"></i><i class="stats-modified" style="width:${b.updated.length/max*100}%"></i></div><small>+${b.added.length} / 갱신 ${b.updated.length}${b.removed.length?` / 제외 ${b.removed.length}`:''}</small></div>`).join('') || '<p>최근 변경 내역이 없습니다.</p>'}</div><details class="stats-all"><summary>본부별 전체 내역</summary>${latest?.branches.map(b=>`<p>${escape(b.branch)} · 추가 ${b.added.length} / 갱신 ${b.updated.length} / 제외 ${b.removed.length}</p>`).join('') || ''}</details><p class="stats-meta">초록: 추가 · 회색: 저장 정보 변경${latest?`<br>${escape(dateLabel(latest.from))} → ${escape(dateLabel(latest.at))} 비교`:''}</p><h3>일별 방문자 <small>최근 7일</small></h3><div id="visitor-chart"><p class="stats-meta">방문 통계를 불러오는 중입니다.</p></div></div>`;
  document.body.append(panel);
  fetch('/data/traffic.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(traffic=>{
    const target=panel.querySelector('#visitor-chart');
    if(!traffic.updatedAt){target.innerHTML='<p class="stats-meta">방문 수집 시작 · 통계 집계 대기 중<br>수집 전 기록은 제공되지 않습니다.</p>';return;}
    const max=Math.max(1,...traffic.days.map(d=>d.visitors||0));
    target.innerHTML=`<div class="visitor-bars">${traffic.days.map(d=>`<div aria-label="${escape(d.date)} ${d.visitors===null?'수집 전':d.visitors+'명'}"><b>${d.visitors===null?'–':d.visitors}</b><span style="height:${d.visitors===null?0:d.visitors/max*48}px"></span><small>${escape(d.date.slice(5).replace('-','/'))}</small></div>`).join('')}</div><p class="stats-meta">한국시간 · ${escape(dateLabel(traffic.updatedAt))} 집계${Date.now()-Date.parse(traffic.updatedAt)>36*3600000?' · 집계 지연':''}<br>${escape(traffic.startedAt.slice(5,10).replace('-','/'))}부터 수집 · 브라우저 기준 방문자 · ‘–’는 수집 전</p>`;
  }).catch(()=>{panel.querySelector('#visitor-chart').textContent='방문 통계를 불러오지 못했습니다.';});
}
