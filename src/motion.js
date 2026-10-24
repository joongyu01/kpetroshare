export function countUp(value, paint) {
  if(value===0){paint(value);return;}
  let start;
  const step=time=>{
    start ??= time;
    const progress=Math.min(1,(time-start)/500);
    paint(Math.round(value*(1-(1-progress)**3)));
    if(progress<1)requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
