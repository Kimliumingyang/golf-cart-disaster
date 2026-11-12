import {level, PPM} from '../config/index.js';
export function rampWidth(b) {
  return b.maxSlopeDeg ? b.heightM * Math.PI / (2 * Math.tan(b.maxSlopeDeg * Math.PI / 180)) : null;
}
export function heightM(x) {
  let h = 0;
  for (const b of level.terrain.bumps) {
    if (x < b.start || x > b.end) continue;
    const width = rampWidth(b);
    const start = width ? b.peak - width : b.start;
    const top = b.plateauEnd ?? b.peak;
    const end = width ? top + width : b.end;
    if (x < start || x > end) continue;
    if (x < b.peak) h += b.heightM * (1 - Math.cos(Math.PI * (x-start)/(b.peak-start))) / 2;
    else if (x < top) h += b.heightM;
    else h += b.heightM * (1 + Math.cos(Math.PI * (x-top)/(end-top))) / 2;
  }
  const hole = level.events.find(e => e.id === 'fake_hole');
  const halfWidth = hole.basinWidthM / 2;
  if (Math.abs(x-hole.x) < halfWidth) h -= hole.depthM * (1+Math.cos(Math.PI*(x-hole.x)/halfWidth))/2;
  return h;
}
export const groundY = x => -heightM(x/PPM)*PPM;
export const slope = x => (groundY(x+2)-groundY(x-2))/4;
export function updateGround(game) {
  const {Bodies, Composite} = game.M;
  const min=Math.floor((game.car.position.x-800)/14), max=Math.ceil((game.car.position.x+1800)/14);
  for (const [i,b] of game.ground) if(i<min||i>max) { Composite.remove(game.engine.world,b); game.ground.delete(i); }
  for(let i=min;i<=max;i++) {
    if(game.ground.has(i)) continue;
    const x=i*14, y=groundY(x), ny=groundY(x+14), angle=Math.atan2(ny-y,14);
    // Offset along the surface normal so the top edge, including on steep slopes, follows the sampled curve.
    const b=Bodies.rectangle(x+7-Math.sin(angle)*35,(y+ny)/2+Math.cos(angle)*35,Math.hypot(14,ny-y)+12,70,{
      isStatic:true, angle, friction:.8, frictionStatic:1, restitution:0,
      label:'terrain', collisionFilter:{category:1,mask:0xffff},
    });
    game.ground.set(i,b); Composite.add(game.engine.world,b);
  }
}
