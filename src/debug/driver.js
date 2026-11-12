// A conservative STAGE 1 route. Only ordinary buttons; no state edits, teleports or recovery assists.
export function testDriver(g) {
  let target=7;
  const x=g.x,v=g.speed,stop=g.pickups?400:120;
  const d=stop-x;
  if(d<0)target=Math.max(-2,d*.7);else target=Math.min(target,Math.sqrt(Math.max(0,d-1)*6));
  if(d<2&&d>-.2)target=Math.min(target,.3);
  if(x>145&&x<190&&g.events.ball!=='spent')target=Math.min(target,g.events.ball?0:3);
  if(x>240&&x<320)target=Math.min(target,4);
  return {gas:v<target-.15,brake:v>target+.15,jump:false,tiltUp:false,tiltDown:false};
}
