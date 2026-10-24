export function clampPanelShare(share,width){
  return Math.max(260/width*100,Math.min((width-320)/width*100,share));
}
