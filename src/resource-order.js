const compareName=(a,b)=>a.name.localeCompare(b.name,'ko',{numeric:true});
export const sortOptions={default:'기본순',name:'가나다순',updated:'최신 업데이트순',branch:'본부별'};
export function sortResources(items,order){
  const result=[...items];
  if(order==='name')result.sort(compareName);
  if(order==='branch')result.sort((a,b)=>a.branch.localeCompare(b.branch,'ko')||compareName(a,b));
  if(order==='updated')result.sort((a,b)=>(Date.parse(b.changedAt)||0)-(Date.parse(a.changedAt)||0)||compareName(a,b));
  return result;
}
export function knownChangedAt(item,data){
  if(item.changedAt)return item.changedAt;
  const b=data.latestChanges?.branches.find(b=>b.branch===item.branch);
  const named=b && [...b.added,...b.updated].includes(item.name);
  return named && data.items.filter(i=>i.branch===item.branch&&i.name===item.name).length===1 ? data.latestChanges.at : null;
}
