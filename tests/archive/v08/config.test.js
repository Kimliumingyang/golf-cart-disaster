import test from 'node:test';
import assert from 'node:assert/strict';
import {level,physics,characters,validate,accelerationForce} from '../src/config/index.js';
import {heightM} from '../src/world/terrain.js';
test('complete deterministic course and five distinct seats',()=>{assert.ok(validate());assert.deepEqual(level.pickups.map(p=>p.x),[120,400,780,1190]);assert.equal(new Set(Object.values(characters.seatLocalXOffsetsM)).size,5);assert.equal(physics.designUnits.fixedStepHz,60);assert.equal(level.failure.retainCheckpoints,false);});
test('terrain matches elevations and is C1 continuous at every ramp boundary',()=>{for(const b of level.terrain.bumps){assert.ok(Math.abs(heightM(b.peak)-b.heightM)<.1);for(const x of [b.start,b.peak,b.plateauEnd??b.peak,b.end]){const eps=.0001;assert.ok(Math.abs(heightM(x+eps)-heightM(x-eps))<.001);}}assert.equal(heightM(1300),0);assert.equal(heightM(1500),0);assert.ok(heightM(360)>=-.18);});
test('final goose is harmless and safe final segment has no damage events',()=>{const goose=level.events.find(e=>e.id==='goose');assert.equal(goose.appliesForces,false);assert.equal(goose.collisionMask,'NONE');assert.ok(!level.events.some(e=>e.type==='golfBall'&&e.triggerCarFrontX>=1190));});
test('explicit SI design acceleration to Matter pixel/ms² force conversion',()=>{assert.equal(accelerationForce(100,4.2),.0168);});

test('V0.8 powered limits and exact steep-ramp maxima',()=>{assert.equal(physics.car.forwardMaxSpeedMps,20);assert.equal(physics.car.forwardAccelEmptyMps2,5);assert.equal(physics.ragdoll.bodiesPerCharacter,11);for(const [id,expected] of [['big_hill_1',50],['mega_hill',60]]){const b=level.terrain.bumps.find(b=>b.id===id);let max=0;for(let x=b.start+.005;x<b.end;x+=.01){const s=(heightM(x+.001)-heightM(x-.001))/.002;max=Math.max(max,Math.abs(Math.atan(s)*180/Math.PI));}assert.ok(Math.abs(max-expected)<.02,`${id}: ${max}`);}});
