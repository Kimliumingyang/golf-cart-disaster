import {physics} from './index.js';
// V0.9: improve recoverable cargo motion, not top speed or hazard counts.
export const tuning = {
  motorAccelMps2: 5, driveLossCompensation: .35,
  brakeMps2: 5.2, coastMps2: .45,
  uphillAssistMps2: 16, downhillBrakeAssistMps2: 16,
  maxSpeedMps: 40, reverseSpeedMps: 3.5,
  suspensionStiffness: .14,
  seatStiffness: .018, settleSeconds: 1.0,
  poseGain: .03, poseDamping: .14, poseMaxAcceleration: .015,
  richSupport: .7, driverSupport: 1.0,
  shockRecoverySeconds: 1.7,
  handGripStiffness: .045, handGripDamping: .025,
  handReachPx: 28, handGripBreakStretchPx: 22,
  handGripBreakSeconds: .05, handGripKickLimit: 3.2, regrabCooldownSeconds: .55,
  recoverySeconds: 2.5, upsideDownSeconds: 5,
  airPitchAccelerationRadps2: 1.8,
  jumpMps: physics.controls.jump.targetAdditionalUpVelocityMps,
  jumpCooldownSeconds: physics.controls.jump.cooldownSec,
  waterAccelerationMps2: 13,
};
