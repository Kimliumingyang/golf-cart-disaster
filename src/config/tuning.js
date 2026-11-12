import {physics} from './index.js';
// Engine-native calibration; Matter mass is deliberately not treated as SI kg.
export const tuning = {
  motorAccelMps2: physics.car.forwardAccelEmptyMps2,
  driveLossCompensation: .35,
  brakeMps2: 5.2,
  coastMps2: .45,
  uphillAssistMps2: 16,
  downhillBrakeAssistMps2: 16,
  maxSpeedMps: physics.car.forwardMaxSpeedMps,
  suspensionStiffness: .18,
  seatStiffness: .045,
  seatBreakDistancePx: 62,
  seatBreakSeconds: .16,
  seatHardBreakPx: 100,
  recoverySeconds: physics.ragdoll.maxRecoverableOutsideSec,
  poseGain: .045,
  poseDamping: .24,
  poseMaxAcceleration: .035,
  shockRecoverySeconds: 1.5,
  jumpMps: physics.controls.jump.targetAdditionalUpVelocityMps,
  jumpCooldownSeconds: physics.controls.jump.cooldownSec,
  waterAccelerationMps2: 13,
};
