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
  for(const x of [-100,-50,0,50,100]) parts.push(Bodies.rectangle(x,-61,34,10),Bodies.rectangle(x-18,-77,7,37,{chamfer:{radius:2}}));
  g.car=Body.create({parts,label:'cart',friction:.06,frictionAir:.0007,restitution:.08,collisionFilter:{category:2,mask:0xffff}});
  Body.setMass(g.car,100); g.carOrigin={...g.car.position};
  g.wheels=[-106,106].map(x=>Bodies.circle(x,-16,14,{friction:0,frictionStatic:0,frictionAir:.0005,restitution:.03,label:'wheel',collisionFilter:{category:4,mask:1|16}}));
  for(const w of g.wheels) Body.setMass(w,8);
  Composite.add(g.engine.world,[g.car,...g.wheels]);
  g.suspensions=g.wheels.flatMap((w,i)=>[-25,25].map(offset=>Constraint.create({
    bodyA:g.car,pointA:{x:(i?106:-106)+offset-g.carOrigin.x,y:-35-g.carOrigin.y},
    bodyB:w,length:Math.hypot(25,19),stiffness:tuning.suspensionStiffness,damping:0,
  })));
  Composite.add(g.engine.world,g.suspensions);
  g.seats={}; for(const [id,x] of Object.entries(characters.seatLocalXOffsetsM)) g.seats[id]={x:x*40-g.carOrigin.x,y:-75-g.carOrigin.y};
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
          g.say(other.label==='terrain'?'NICE SHOT. WRONG SPORT.':'THAT WAS NOT A SPEED BUMP.',1.5,true);
        }
      }
      if(dv>2.4) for(const p of g.people) if(p.parts.some(part=>part===a||part===b)) p.shock=1;
    }
  });
  updateGround(g); addPerson(g,'driver');
}

export function addPerson(g,id) {
  const spec=characters.characters.find(c=>c.id===id), seat=local(g.car,g.seats[id]);
  const group=Body.nextGroup(true), angle=g.car.angle;
  const opts={friction:.5,frictionStatic:.65,restitution:.07,frictionAir:.002,collisionFilter:{group,category:8,mask:1|2|8|16},label:id};
  const point=(x,y)=>Vector.add(seat,Vector.rotate({x,y},angle));
  const headP=point(0,-45), torsoP=point(0,-22);
  const head=Bodies.circle(headP.x,headP.y,10,{...opts,restitution:.15});
  const torso=Bodies.rectangle(torsoP.x,torsoP.y,12,29,{...opts,angle,chamfer:{radius:3}});
  const pelvis=Bodies.circle(seat.x,seat.y,8,opts); Body.setAngle(head,angle); Body.setAngle(pelvis,angle);
  const p={id,spec,parts:[head,torso,pelvis],joints:[],head,torso,pelvis,outside:0,grip:true,gripStretch:0,shock:0,segments:[],restAngles:new Map()};
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
  const weights=[.16,.28,.2,...Array(8).fill(.045)];
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
  for(const p of g.people) Composite.remove(g.engine.world,[...p.parts,...p.joints]);
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
    if(input.brake) a+=v>.12?-tuning.brakeMps2-Math.max(0,Math.sin(angle))*tuning.downhillBrakeAssistMps2:v> -2.5?-2.8:0;
    else if(!input.gas&&Math.abs(v)>.08) a-=Math.sign(v)*tuning.coastMps2;
    if(v>tuning.maxSpeedMps) a-=(v-tuning.maxSpeedMps)*2;
    const force=accelerationForce(totalMass,a);
    Body.applyForce(c,c.position,{x:force*Math.cos(angle),y:force*Math.sin(angle)});
    if(input.jump&&g.elapsed-g.lastJump>=tuning.jumpCooldownSeconds) {
      for(const b of [c,...g.wheels]) Body.setVelocity(b,{x:b.velocity.x,y:b.velocity.y-tuning.jumpMps*40/60});
      g.lastJump=g.elapsed; g.say('THIS IS NOT A SHORTCUT.',1.3); g.sound('hop');
    }
  }
  for(const p of g.people) {
    const seat=local(c,g.seats[p.id]), distance=Vector.magnitude(Vector.sub(p.pelvis.position,seat));
    if(p.grip) {
      p.gripStretch=distance>tuning.seatBreakDistancePx?p.gripStretch+1/60:0;
      if(p.gripStretch>tuning.seatBreakSeconds||distance>tuning.seatHardBreakPx) {
        Composite.remove(g.engine.world,p.seatConstraint); p.grip=false; p.lastRegrab=g.elapsed; g.say('STILL COUNTS!',1.4);
      }
    } else if(distance<20&&g.elapsed-p.lastRegrab>.5) {
      Composite.add(g.engine.world,p.seatConstraint);p.grip=true;p.lastRegrab=undefined;
    }
    p.shock=Math.max(0,p.shock-1/(60*tuning.shockRecoverySeconds));
    const support=(1-.94*p.shock)*(p.grip?1:.08);
    muscle(p.pelvis,c.angle,c,1.2*support);
    muscle(p.torso,c.angle,c,support);
    muscle(p.head,p.torso.angle,p.torso,.65*support);
    for(const b of p.segments) muscle(b,p.torso.angle+p.restAngles.get(b),p.torso,.55*support);
    const rh=Vector.rotate(Vector.sub(p.head.position,c.position),-c.angle), rt=Vector.rotate(Vector.sub(p.torso.position,c.position),-c.angle);
    const outside=Math.abs(rh.x)>185||rh.y>55||rh.y< -240;
    const torsoOutside=Math.abs(rt.x)>178||rt.y>45||rt.y< -210;
    p.outside=outside&&torsoOutside&&!p.grip?p.outside+1/60:0;
    if(p.outside>tuning.recoverySeconds) g.fail(p.id);
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
  g.flipped=Math.cos(c.angle)<-.3&&Math.abs(v)<1?g.flipped+1/60:0;
  if(g.flipped>3) g.fail('cart');
}
