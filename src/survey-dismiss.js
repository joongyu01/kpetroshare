const KEY='kpetroshare-survey-hidden-until';
const HOUR=60*60*1000;

export function setupSurveyDismiss(menu,close,checkbox){
 let timer;
 function hideFor(ms){
  menu.hidden=true;
  clearTimeout(timer);
  timer=setTimeout(()=>{menu.hidden=false;checkbox.checked=false},ms);
 }
 try{
  const remaining=Number(localStorage.getItem(KEY))-Date.now();
  if(remaining>0)hideFor(Math.min(remaining,HOUR));
 }catch{/* Storage may be disabled; closing still works for this page. */}
 close.addEventListener('click',()=>{
  menu.hidden=true;
  if(checkbox.checked){
   try{localStorage.setItem(KEY,String(Date.now()+HOUR))}catch{}
   hideFor(HOUR);
  }
 });
}
