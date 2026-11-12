import test from 'node:test';
import assert from 'node:assert/strict';
import {level,physics,characters,validate,accelerationForce} from '../src/config/index.js';
import {heightM} from '../src/world/terrain.js';
test('complete deterministic course and five distinct seats',()=>{assert.ok(validate());assert.deepEqual(level.pickups.map(p=>p.x),[120,400,780,1190]);assert.equal(new Set(Object.values(characters.seatLocalXOffsetsM)).size,5);assert.equal(physics.designUnits.fixedStepHz,60);assert.equal(level.failure.retainCheckpoints,false);});
test('terrain matches elevations and is C1 continuous at every ramp boundary',()=>{for(const b of level.terrain.bumps){assert.ok(Math.abs(heightM(b.peak)-b.heightM)<.1);for(const x of [b.start,b.peak,b.plateauEnd??b.peak,b.end]){const eps=.0001;assert.ok(Math.abs(heightM(x+eps)-heightM(x-eps))<.001);}}assert.equal(heightM(1300),0);assert.equal(heightM(1500),0);assert.ok(heightM(360)>=-.12);});
test('final goose is harmless and safe final segment has no damage events',()=>{const goose=level.events.find(e=>e.id==='goose');assert.equal(goose.appliesForces,false);assert.equal(goose.collisionMask,'NONE');assert.ok(!level.events.some(e=>e.type==='golfBall'&&e.triggerCarFrontX>=1190));});
test('explicit SI design acceleration to Matter pixel/ms² force conversion',()=>{assert.equal(accelerationForce(100,4.2),.0168);});
