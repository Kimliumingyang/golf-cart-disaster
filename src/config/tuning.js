import {physics} from './index.js';
// Engine-native calibration. Design mass kg is deliberately not fed directly to Matter.
export const tuning={
 motorAccelMps2:physics.car.forwardAccelEmptyMps2,
 brakeMps2:5.2,
 coastMps2:.45,
 uphillAssistMps2:14,
 maxSpeedMps:physics.car.forwardMaxSpeedMps,
 suspensionStiffness:.95,
 seatStiffness:.012,
 seatBreakDistancePx:48,
 seatBreakSeconds:.12,
 seatHardBreakPx:76,
 recoverySeconds:physics.ragdoll.maxRecoverableOutsideSec,
 jumpMps:physics.controls.jump.targetAdditionalUpVelocityMps,
 jumpCooldownSeconds:physics.controls.jump.cooldownSec,
 waterAccelerationMps2:13,
};
