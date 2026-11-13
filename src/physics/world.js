import {tuning} from '../config/tuning.js';
import Matter from 'matter-js';
import {characters, accelerationForce, speedMps} from '../config/index.js';
import {groundY, slope, updateGround} from '../world/terrain.js';
export const M = Matter;
const {Bodies,Body,Composite,Constraint,Vector,Events} = M;
export const local = (body,p) => Vector.add(body.position,Vector.rotate(p,body.angle));
const wrap = a => Math.atan2(Math.sin(a),Math.cos(a));
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));

export function createWorld(g) {
  g.M=M;
  g.engine=M.Engine.create({positionIterations:12,velocityIterations:10,constraintIterations:6,enableSleeping:false});
  g.engine.gravity.y=1; g.engine.gravity.scale=.0006;
  g.ground=new Map(); g.people=[]; g.hats=[]; g.balls=[]; g.pendingBallImpacts=[]; g.impacts=[];
  const parts=[Bodies.rectangle(128,-104,7,64,{angle:-.25,label:'windshield strut'}),Bodies.rectangle(0,-42,272,24,{chamfer:{radius:5}}),Bodies.rectangle(-134,-61,8,30),Bodies.rectangle(134,-61,8,30)];
  for(const x of Object.values(characters.seatLocalXOffsetsM).map(x=>x*40)) parts.push(Bodies.rectangle(x,-46,34,10),Bodies.rectangle(x-18,-62,7,37,{chamfer:{radius:2}}));
  g.car=Body.create({parts,label:'cart',friction:.06,frictionAir:.0007,restitution:.08,collisionFilter:{category:2,mask:0xffff}});
  Body.setMass(g.car,100); g.carOrigin={...g.car.position};
  g.wheels=[-106,106].map(x=>Bodies.circle(x,-16,14,{friction:0,frictionStatic:0,frictionAir:.0005,restitution:.03,label:'wheel',collisionFilter:{category:4,mask:1|16}}));
  for(const w of g.wheels) Body.setMass(w,8);
  Composite.add(g.engine.world,[g.car,...g.wheels]);
  g.suspensions=g.wheels.flatMap((w,i)=>[-25,25].map(offset=>Constraint.create({
    bodyA:g.car,pointA:{x:(i?106:-106)+offset-g.carOrigin.x,y:-35-g.carOrigin.y},
    bodyB:w,length:Math.hypot(25,19),stiffness:tuning.suspensionStiffness,damping:0,
  })));
  // A third, higher guide removes the mirror solution of the two diagonal axle links.
  // It is a soft physical constraint, not a wheel teleport or a velocity correction.
  g.suspensions.push(...g.wheels.map((w,i)=>Constraint.create({bodyA:g.car,pointA:{x:(i?106:-106)-g.carOrigin.x,y:-72-g.carOrigin.y},bodyB:w,length:56,stiffness:.12,damping:0})));
  Composite.add(g.engine.world,g.suspensions);
  g.seats={}; for(const [id,x] of Object.entries(characters.seatLocalXOffsetsM)) g.seats[id]={x:x*40-g.carOrigin.x,y:-60-g.carOrigin.y};
  Events.on(g.engine,'collisionStart',({pairs})=>{
    for(const pair of pairs) {
      const a=pair.bodyA.parent, b=pair.bodyB.parent;
      const dv=Vector.magnitude(Vector.sub(a.velocity,b.velocity));
      if(a.label==='golf ball'||b.label==='golf ball') {
        const ball=a.label==='golf ball'?a:b, other=ball===a?b:a;
        if(!ball.hitPending&&dv>.25) {
          ball.hitPending=true;
          const hit={t:g.elapsed,target:other.label,x:ball.position.x/40,relativeSpeedMps:dv*60/40,carAngleBefore:g.car.angle,carOmegaBefore:g.car.angularVelocity};
          g.pendingBallImpacts.push({ball,hit});
          g.say(other.label==='terrain'?'NICE SHOT. WRONG SPORT.':'YOU CAN STILL SAVE THIS!',1.5,true);
        }
      }
      if((a===g.car||b===g.car)&&dv>.5){const other=a===g.car?b:a;for(const p of g.people)if(p.id==='rich'&&p.parts.includes(other)&&p.hadExcursion&&g.elapsed-(p.lastCarHit??-10)>.18){p.lastCarHit=g.elapsed;g.stats.richCarContacts=(g.stats.richCarContacts??0)+1;g.log('rich-hit-cart',{relativeSpeedMps:dv*60/40});}}
      if(dv>2.4) for(const p of g.people) if(p.parts.some(part=>part===a||part===b)) p.shock=1;
    }
  });
  g.rails=Object.values(characters.seatLocalXOffsetsM).map(x=>({x:x*40+12-g.carOrigin.x,y:-76-g.carOrigin.y}));
  g.rails.push({x:-136-g.carOrigin.x,y:-55-g.carOrigin.y},{x:136-g.carOrigin.x,y:-55-g.carOrigin.y});
  updateGround(g); addPerson(g,'driver');
}

export function addPerson(g,id) {
  const spec=characters.characters.find(c=>c.id===id), seat=local(g.car,g.seats[id]);
  const group=Body.nextGroup(true), angle=g.car.angle;
  const opts={friction:id==='rich'?.16:.4,frictionStatic:id==='rich'?.25:.6,restitution:.07,frictionAir:.002,collisionFilter:{group,category:8,mask:1|2|8|16},label:id};
  const point=(x,y)=>Vector.add(seat,Vector.rotate({x,y},angle));
  const headP=point(0,-45), torsoP=point(0,-22);
  const head=Bodies.circle(headP.x,headP.y,id==='rich'?12:10,{...opts,restitution:.15});
  const torso=Bodies.rectangle(torsoP.x,torsoP.y,12,29,{...opts,angle,chamfer:{radius:3}});
  const pelvis=Bodies.circle(seat.x,seat.y,8,opts); Body.setAngle(head,angle); Body.setAngle(pelvis,angle);
  const p={id,spec,parts:[head,torso,pelvis],joints:[],head,torso,pelvis,outside:0,grip:true,gripStretch:0,shock:0,bornAt:g.elapsed,seatAttached:true,handGrip:null,hadExcursion:false,awaySeconds:0,groundContact:false,segments:[],restAngles:new Map()};
  function segment(name,from,to,width=5) {
    const a=point(...from), b=point(...to), len=Vector.magnitude(Vector.sub(b,a));
    const rest=Math.atan2(to[1]-from[1],to[0]-from[0])-Math.PI/2;
    const body=Bodies.rectangle((a.x+b.x)/2,(a.y+b.y)/2,width,len,{...opts,angle:angle+rest,chamfer:{radius:2}});
    body.segmentLength=len; body.segmentWidth=width; body.partName=name;
    p.parts.push(body); p.segments.push(body); p.restAngles.set(body,rest); return body;
  }
  const upperArms=[], forearms=[], thighs=[], calves=[];
  for(let i=0;i<2;i++) {
    const d=i*.8;
    upperArms.push(segment(i?'rightUpperArm':'leftUpperArm',[-5+d,-33],[1+d,-19]));
    forearms.push(segment(i?'rightForearm':'leftForearm',[1+d,-19],[14+d,-17],4.5));
    thighs.push(segment(i?'rightThigh':'leftThigh',[0,3+d],[18,4+d],6));
    calves.push(segment(i?'rightCalf':'leftCalf',[18,4+d],[20,21+d],5));
  }
  // Keep the original renderer API (head, torso, pelvis first) while adding real knees/elbows.
  p.upperArms=upperArms; p.forearms=forearms; p.thighs=thighs; p.calves=calves;
  const joint=(a,pa,b,pb,length=0)=>Constraint.create({bodyA:a,pointA:Vector.rotate(pa,a.angle),bodyB:b,pointB:Vector.rotate(pb,b.angle),length,stiffness:.8,damping:.06});
  p.joints.push(joint(head,{x:0,y:9},torso,{x:0,y:-14},0),joint(torso,{x:0,y:14},pelvis,{x:0,y:-8},0));
  for(let i=0;i<2;i++) {
    const d=i*.8, ua=upperArms[i], fa=forearms[i], th=thighs[i], ca=calves[i];
    p.joints.push(joint(torso,{x:-5+d,y:-11},ua,{x:0,y:-ua.segmentLength/2}),
      joint(ua,{x:0,y:ua.segmentLength/2},fa,{x:0,y:-fa.segmentLength/2}),
      joint(pelvis,{x:0,y:3+d},th,{x:0,y:-th.segmentLength/2}),
      joint(th,{x:0,y:th.segmentLength/2},ca,{x:0,y:-ca.segmentLength/2}));
  }
  const total=spec.massKgDesign/12;
  const weights=id==='rich'?[.27,.25,.12,...Array(8).fill(.045)]:[.16,.28,.2,...Array(8).fill(.045)];
  for(let i=0;i<p.parts.length;i++) Body.setMass(p.parts[i],total*weights[i]);
  p.seatConstraint=Constraint.create({bodyA:g.car,pointA:Vector.rotate({...g.seats[id]},g.car.angle),bodyB:pelvis,length:0,stiffness:tuning.seatStiffness,damping:.03});
  p.joints.push(p.seatConstraint); Composite.add(g.engine.world,[...p.parts,...p.joints]); g.people.push(p);
  if(id==='rich') {
    const pos=point(0,-61), hat=Bodies.rectangle(pos.x,pos.y,23,13,{mass:.08,angle,frictionAir:.01,collisionFilter:{category:16,mask:1|2},label:'hat'});
    const tie=Constraint.create({bodyA:head,pointA:{x:0,y:-10},bodyB:hat,length:6,stiffness:.025,damping:.03});
    g.hats.push({body:hat,tie,owner:p,attached:true}); Composite.add(g.engine.world,[hat,tie]);
  }
  return p;
}
export function reseat(g,newId) {
  const ids=[...g.people.map(p=>p.id),...(newId?[newId]:[])];
  for(const p of g.people) Composite.remove(g.engine.world,[...p.parts,...p.joints,...(p.handGrip?[p.handGrip.constraint]:[])]);
  for(const h of g.hats) Composite.remove(g.engine.world,[h.body,h.tie]);
  g.people=[]; g.hats=[];
  for(const b of [g.car,...g.wheels]) { Body.setVelocity(b,{x:0,y:0}); Body.setAngularVelocity(b,0); }
  for(const id of ids) addPerson(g,id);
}
function muscle(body,target,reference,strength) {
  const acceleration=clamp(-wrap(body.angle-target)*tuning.poseGain-(body.angularVelocity-reference.angularVelocity)*tuning.poseDamping,-tuning.poseMaxAcceleration,tuning.poseMaxAcceleration)*strength;
  const torque=body.inertia*acceleration/(1000/60)**2;
  body.torque+=torque; reference.torque-=torque;
}
export function physicsStep(g,input) {
  const c=g.car,v=speedMps(c);
  // Distance along the road normal, not vertical wheel-bottom distance: valid on 60° slopes.
  const contactWheels=g.wheels.filter(w=>Math.abs((groundY(w.position.x)-w.position.y)/Math.sqrt(1+slope(w.position.x)**2)-14)<5);
  g.grounded=contactWheels.length>0;
  const angle=contactWheels.length?Math.atan(contactWheels.reduce((sum,w)=>sum+slope(w.position.x),0)/contactWheels.length):Math.atan(slope(c.position.x));
  const totalMass=c.mass+16+g.people.reduce((a,p)=>a+p.parts.reduce((t,b)=>t+b.mass,0),0);
  if(g.grounded) {
    let a=input.gas?(tuning.motorAccelMps2*(100/totalMass)**.18+Math.max(0,v)*tuning.driveLossCompensation)*clamp((tuning.maxSpeedMps-v)/1.2,0,1)+Math.max(0,-Math.sin(angle))*tuning.uphillAssistMps2:0;
    if(input.brake) a+=v>.12?-tuning.brakeMps2-Math.max(0,Math.sin(angle))*tuning.downhillBrakeAssistMps2:v> -tuning.reverseSpeedMps?-2.8:0;
    else if(!input.gas&&Math.abs(v)>.08) a-=Math.sign(v)*tuning.coastMps2;
    if(v>tuning.maxSpeedMps) a-=(v-tuning.maxSpeedMps)*2;
    const force=accelerationForce(totalMass,a);
    Body.applyForce(c,c.position,{x:force*Math.cos(angle),y:force*Math.sin(angle)});
    if(input.jump&&g.elapsed-g.lastJump>=tuning.jumpCooldownSeconds) {
      for(const b of [c,...g.wheels]) Body.setVelocity(b,{x:b.velocity.x,y:b.velocity.y-tuning.jumpMps*40/60});
      g.lastJump=g.elapsed; g.say('THIS IS NOT A SHORTCUT.',1.3); g.sound('hop');
    }
  }
  const tilt=(input.tiltUp? -1:0)+(input.tiltDown?1:0);
  if(tilt)c.torque+=c.inertia*tuning.airPitchAccelerationRadps2*tilt/1e6*(g.grounded?.28:1);
  const groundContacts=new Set(),cartContacts=new Set();
  for(const pair of g.engine.pairs.list) if(pair.isActive) {
    const a=pair.bodyA.parent,b=pair.bodyB.parent;
    if(a.label==='terrain')groundContacts.add(b);if(b.label==='terrain')groundContacts.add(a);if(a===c)cartContacts.add(b);if(b===c)cartContacts.add(a);
  }
  for(const p of g.people) {
    const seat=local(c,g.seats[p.id]);
    const delta=Vector.rotate(Vector.sub(p.pelvis.position,seat),-c.angle);
    const distance=Vector.magnitude(delta);
    // The seat aid exists only during the boarding settle. It never pulls a launched passenger home.
    if(p.seatAttached&&g.elapsed-p.bornAt>tuning.settleSeconds){Composite.remove(g.engine.world,p.seatConstraint);p.seatAttached=false;}
    const hipLocal=Vector.rotate(Vector.sub(p.pelvis.position,c.position),-c.angle);
    const inCart=Math.abs(hipLocal.x)<130&&hipLocal.y<15&&hipLocal.y>-130;
    const landed=inCart&&(cartContacts.has(p.pelvis)||cartContacts.has(p.torso)||p.thighs.some(b=>cartContacts.has(b)));
    const nearSeat=(distance<25&&delta.y>-7&&delta.y<15)||landed;
    p.seated=nearSeat;p.seatDelta={...delta};p.maxLiftPx=Math.max(p.maxLiftPx??0,-delta.y);p.excursionLift=Math.max(p.excursionLift??0,-delta.y);p.seatDistance=distance;p.maxSeatDistance=Math.max(p.maxSeatDistance??0,distance);
    p.awaySeconds=nearSeat?0:p.awaySeconds+1/60;
    if(p.awaySeconds>.16&&!p.hadExcursion){p.hadExcursion=true;g.stats.departures++;g.log(p.id+'-left-seat');}
    if(nearSeat&&p.hadExcursion){p.hadExcursion=false;g.stats.recoveries++;p.recoveredCount=(p.recoveredCount??0)+1;g.log(p.id+'-recovered',{liftPx:p.excursionLift});p.excursionLift=0;g.say('BACK IN. STILL BILLABLE.',1.5);}
    p.shock=Math.max(0,p.shock-1/(60*tuning.shockRecoverySeconds));
    const movingSupport=p.id==='rich'?tuning.richSupport:tuning.driverSupport;
    const strength=movingSupport+(1.8-movingSupport)*clamp(1-Math.abs(v)/4,0,1);
    const support=(1-.9*p.shock)*(nearSeat?strength:.035);
    // Bounded internal effort, not a prescribed pose animation. No random per-frame forces.
    muscle(p.pelvis,nearSeat?c.angle:p.torso.angle,nearSeat?c:p.torso,1.5*support);
    muscle(p.torso,nearSeat?c.angle:p.pelvis.angle,nearSeat?c:p.pelvis,support);
    muscle(p.head,p.torso.angle,p.torso,.6*support);
    for(const b of p.segments)muscle(b,p.torso.angle+p.restAngles.get(b),p.torso,.45*support);
    if(p.handGrip){
      p.handGrip.seatedTime=nearSeat?(p.handGrip.seatedTime??0)+1/60:0;
      if(p.handGrip.seatedTime>.45){Composite.remove(g.engine.world,p.handGrip.constraint);p.handGrip=null;p.lastRegrab=g.elapsed;g.log(p.id+'-released-rail');}
    }
    if(p.handGrip){
      const grip=p.handGrip,hand=local(grip.hand,{x:0,y:grip.hand.segmentLength/2}),anchor=local(c,grip.rail);
      const stretch=Vector.magnitude(Vector.sub(hand,anchor))-grip.constraint.length;
      const armTip=Vector.sub(hand,grip.hand.position),carArm=Vector.sub(anchor,c.position);
      const handVelocity=Vector.add(grip.hand.velocity,{x:-grip.hand.angularVelocity*armTip.y,y:grip.hand.angularVelocity*armTip.x});
      const railVelocity=Vector.add(c.velocity,{x:-c.angularVelocity*carArm.y,y:c.angularVelocity*carArm.x});
      const relativeVelocity=Vector.sub(handVelocity,railVelocity);
      const kick=grip.previousVelocity?grip.hand.mass*Vector.magnitude(Vector.sub(relativeVelocity,grip.previousVelocity)):0;
      grip.previousVelocity={...relativeVelocity};g.stats.peakGripStretch=Math.max(g.stats.peakGripStretch??0,stretch);g.stats.peakGripKick=Math.max(g.stats.peakGripKick??0,kick);
      grip.overstretch=stretch>tuning.handGripBreakStretchPx?grip.overstretch+1/60:0;
      if(grip.overstretch>tuning.handGripBreakSeconds||stretch>32||kick>tuning.handGripKickLimit){Composite.remove(g.engine.world,grip.constraint);p.handGrip=null;p.lastRegrab=g.elapsed;g.stats.gripBreaks++;g.log(p.id+'-grip-broke');}
    }
    if(!p.handGrip&&!p.seatAttached&&!nearSeat&&g.elapsed-(p.lastRegrab??-10)>tuning.regrabCooldownSeconds){
      let closest=null;
      for(const handBody of p.forearms){const hand=local(handBody,{x:0,y:handBody.segmentLength/2});for(const rail of g.rails){const anchor=local(c,rail),d=Vector.magnitude(Vector.sub(hand,anchor));if(d<tuning.handReachPx&&(!closest||d<closest.distance))closest={handBody,rail,distance:d};}}
      if(closest){
        const constraint=Constraint.create({bodyA:c,pointA:Vector.rotate({...closest.rail},c.angle),bodyB:closest.handBody,pointB:Vector.rotate({x:0,y:closest.handBody.segmentLength/2},closest.handBody.angle),length:Math.max(5,closest.distance),stiffness:tuning.handGripStiffness,damping:tuning.handGripDamping});
        p.handGrip={constraint,hand:closest.handBody,rail:{...closest.rail},overstretch:0};Composite.add(g.engine.world,constraint);g.stats.grabs++;g.log(p.id+'-grabbed-rail');g.say('HOLD THAT THOUGHT!',1.2);
      }
    }
    p.grip=!!p.handGrip;
    const rh=Vector.rotate(Vector.sub(p.head.position,c.position),-c.angle),rt=Vector.rotate(Vector.sub(p.torso.position,c.position),-c.angle);
    p.groundContact=groundContacts.has(p.head)||groundContacts.has(p.torso)||groundContacts.has(p.pelvis);
    // A person overhead is recoverable. Only a grounded/low, genuinely separated person starts the loss clock.
    const separated=(Math.abs(rt.x)>225&&Math.abs(rh.x)>210)||(rt.y>105&&rh.y>90);
    const irrecoverable=(p.groundContact&&separated)||(rt.y>240&&rh.y>220)||(Math.abs(rt.x)>600&&Math.abs(rh.x)>580);
    p.outside=irrecoverable&&!p.handGrip?p.outside+1/60:Math.max(0,p.outside-2/60);
    if(p.outside>tuning.recoverySeconds)g.fail(p.id,p.groundContact?'Passenger landed outside the cart; brake or reverse sooner.':'The passenger fell beyond recovery range.');
  }
  for(const h of g.hats) if(h.attached&&Vector.magnitude(Vector.sub(h.body.position,h.owner.head.position))>25) {
    Composite.remove(g.engine.world,h.tie);h.attached=false;g.say('THE HAT HAS RESIGNED.',1.5);
  }
  M.Engine.update(g.engine,1000/60);
  // collisionStart is emitted before Matter resolves contacts: remove only AFTER this solver step.
  // This preserves the engine's full contact impulse; no scripted torque or flip is injected.
  for(const {ball,hit} of g.pendingBallImpacts) {
    hit.carAngleAfter=c.angle;hit.carOmegaAfter=c.angularVelocity;
    g.impacts.push(hit);g.log('ball-impact-'+hit.target);
    Composite.remove(g.engine.world,ball);g.balls=g.balls.filter(b=>b!==ball);g.events.ball='spent';
  }
  g.pendingBallImpacts=[];
  updateGround(g);
  g.flipped=Math.cos(c.angle)<-.5&&Math.abs(v)<.8&&Math.abs(c.angularVelocity)<.008?g.flipped+1/60:0;
  if(g.flipped>tuning.upsideDownSeconds)g.fail('cart','The cart stayed upside down and motionless for 5 seconds.');
}
