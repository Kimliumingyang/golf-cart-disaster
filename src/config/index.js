import level from './LEVEL_DATA.json' with {type:'json'};
import physics from './PHYSICS_CONFIG.json' with {type:'json'};
import characters from './CHARACTERS.json' with {type:'json'};
export {level,physics,characters};
export const PPM=40, DT=1000/60;
export const toPx=m=>m*PPM;
export const toM=px=>px/PPM;
export const speedMps=body=>body.velocity.x*60/PPM;
export const accelerationForce=(mass,a)=>mass*a*PPM/1e6;
export function validate(){if(level.pickups.length!==4||characters.characters.length!==5||level.lengthM!==1500)throw Error('Invalid course configuration');for(const b of level.terrain.bumps)if(!(b.start<b.peak&&b.peak<b.end))throw Error('Invalid terrain');return true;}
validate();
