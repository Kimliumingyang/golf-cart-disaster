export const scenarioList=[
 ['slow-tour','保守：5 m/s 巡航，坡道 3.5 m/s，刹停避球'],
 ['flow','流畅：8 m/s 巡航，坡道 6 m/s，刹停避球'],
 ['quick-cautious','快慢切换：12 m/s 巡航，坡道 7 m/s'],
 ['crest-brake','冲顶后刹车：14 m/s 接近，275 m 后降速'],
 ['crest-coast','坡顶松油：14 m/s 接近，275–295 m 滑行'],
 ['crest-hop-save','坡顶小跳后减速并压低车头'],
 ['crest-flatout','大坡全油门：不主动救回'],
 ['ball-fast-dodge','第一站后持续加速，抢在落球前通过'],
 ['ball-medium-brake','约 7 m/s 迎球，撞后刹车等待恢复'],
 ['ball-medium-gas','同样约 7 m/s 迎球，撞后继续加速'],
 ['ball-glance','约 12 m/s 通过球道，承受擦碰'],
 ['ball-8','8 m/s 迎球'],
 ['ball-9','9 m/s 迎球'],
 ['ball-10','10 m/s 迎球'],
 ['reverse-rescue','迎球后刹车、倒车、等待，再继续'],
 ['brake-pulse','间歇油门与刹车，观察独立身体惯性'],
 ['rock-and-land','18 m/s 接近坡顶，腾空后修正车体姿态'],
 ['panic-hop','接客后一直油门、小跳、压车头'],
 ['reckless-rock','冲坡并持续压车头，观察不可恢复的失败'],
 ['upside-panic','撞球后持续抬车头，不给乘客恢复空间'],
 ['rock-rescue','与卡住样本相同接近；卡住后抬头、倒车，再继续'],
 ['ball-save','8 m/s 碰球后停车等待富豪落回，再继续'],
];
export function createScenario(id){
 let jumpDone=false,rescueUntil=null;
 return {id,control(g){
  const x=g.x,v=g.speed,stop=g.pickups?400:120,d=stop-x;
  let target=8,tiltUp=false,tiltDown=false,jump=false,coast=false;
  if(id==='slow-tour')target=5;
  if(['quick-cautious','crest-brake','crest-coast','crest-hop-save','rock-and-land','rock-rescue'].includes(id))target=12;
  if(id==='panic-hop'&&g.pickups){target=20;jump=true;tiltDown=true;}
  const impact=g.impacts.find(e=>e.target!=='terrain');
  const ballCase=id.startsWith('ball-')||id==='reverse-rescue'||id==='upside-panic';
  if(x>120&&x<210&&ballCase){
    target=id==='ball-fast-dodge'?20:id==='ball-glance'?12:id==='ball-save'?8:Number(id.slice(5))||7;
    if(impact){const t=g.elapsed-impact.t;if(id==='ball-medium-brake')target=t<4?0:5;
      if(id==='ball-save')target=t<3?0:6;
      if(id==='ball-medium-gas')target=t<4?20:8;
      if(id==='upside-panic'){target=0;tiltUp=true;}
      if(id==='reverse-rescue')target=t<1.5?0:t<2.5?-1.5:t<4?0:5;
    }
  } else if(x>145&&x<190&&g.events.ball!=='spent')target=Math.min(target,g.events.ball?0:3);
  if(x>238&&x<321){
    target=id==='slow-tour'?3.5:id==='quick-cautious'?7:6;
    if(id==='crest-brake')target=x<275?14:3.5;
    if(id==='crest-coast'){target=14;coast=x>275&&x<295;}
    if(id==='crest-flatout')target=20;
    if(id==='reckless-rock'){target=20;tiltDown=true;jump=x>270;}
    if(id==='panic-hop'){target=20;jump=true;tiltDown=true;}
    if(id==='crest-hop-save'){target=x<278?11:3.5;if(x>277&&!jumpDone){jump=true;jumpDone=true;}tiltDown=!g.grounded&&g.car.angle<-.15;}
    if(id==='rock-and-land'||id==='rock-rescue'){target=x<278?18:4;tiltDown=!g.grounded&&g.car.angle<-.1;tiltUp=!g.grounded&&g.car.angle>.15;}
  }
  if(id==='rock-rescue'){if(rescueUntil===null&&x>300&&x<335&&Math.abs(v)<1)rescueUntil=g.elapsed+3;if(rescueUntil!==null&&g.elapsed<rescueUntil){target=-1.5;tiltUp=true;tiltDown=false;}}
  if(id==='brake-pulse'&&x>122&&!(x>145&&x<195)&&!(x>240&&x<322))target=g.elapsed%3<1.6?10:2;
  if(d<0)target=Math.max(-2,d*.7);else target=Math.min(target,Math.sqrt(Math.max(0,d-1)*6));
  if(d<2&&d>-.2)target=Math.min(target,.3);
  return {gas:!coast&&v<target-.15,brake:!coast&&v>target+.15,jump,tiltUp,tiltDown};
 }};
}
