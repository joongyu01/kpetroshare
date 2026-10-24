export function countUp(value, paint) {
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  if(reduced.matches || value===0){paint(value);return;}
  let start;
  const step=time=>{
    start ??= time;
    const progress=reduced.matches?1:Math.min(1,(time-start)/300);
    paint(Math.round(value*(1-(1-progress)**3)));
    if(progress<1)requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
