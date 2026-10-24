import {clampPanelShare} from './panel-size.js';
const workspace=document.querySelector('.workspace');
const divider=document.querySelector('#panel-divider');
let share=38;
let dragging=false;
function resize(next){
  const width=workspace.clientWidth-divider.offsetWidth;
  if(width<=0 || matchMedia('(max-width:760px)').matches)return;
  share=clampPanelShare(next,width);
  workspace.style.setProperty('--map-share',share+'fr');
  workspace.style.setProperty('--list-share',(100-share)+'fr');
  divider.setAttribute('aria-valuenow',Math.round(share));
  divider.setAttribute('aria-valuemin',Math.ceil(260/width*100));
  divider.setAttribute('aria-valuemax',Math.floor((width-320)/width*100));
  divider.setAttribute('aria-valuetext',`지도 ${Math.round(share)}%, 자원 목록 ${Math.round(100-share)}%`);
}
divider.addEventListener('pointerdown',event=>{
  if(event.button!==0)return;
  dragging=true;divider.setPointerCapture(event.pointerId);
  divider.focus();document.body.classList.add('resizing-panels');
  event.preventDefault();
});
divider.addEventListener('pointermove',event=>{
  if(!dragging)return;
  const rect=workspace.getBoundingClientRect();
  resize((event.clientX-rect.left-divider.offsetWidth/2)/(rect.width-divider.offsetWidth)*100);
});
const stop=()=>{dragging=false;document.body.classList.remove('resizing-panels');};
divider.addEventListener('pointerup',stop);
divider.addEventListener('pointercancel',stop);
divider.addEventListener('lostpointercapture',stop);
divider.addEventListener('dblclick',()=>resize(38));
divider.addEventListener('keydown',event=>{
  const next={ArrowLeft:share-2,ArrowRight:share+2,Home:0,End:100}[event.key];
  if(next===undefined)return;
  event.preventDefault();resize(next);
});
window.addEventListener('resize',()=>resize(share));
resize(share);
