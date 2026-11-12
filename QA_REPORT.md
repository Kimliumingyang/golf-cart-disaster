# MVP verification — 12 November 2026

## Build and automated acceptance

`npm install`, `npm run dev`, `npm test`, `npm run build` and `npm run preview` all succeeded. Four Node tests cover the package configuration, all fixed pickup coordinates, terrain continuity/elevations, shallow fake hole, safe final segment, harmless goose and the acceleration-unit converter.

Chromium tested the actual production bundle at port 4173. The test driver presses the same GAS/BRAKE inputs as the player through every 60 Hz step; it never teleports, edits body velocities, grants pickups or bypasses victory. All four stops and every event occur in sequence from the initial driver-only start.

- **FIX success**, seed 1: full route to WIN, all five people present, four pickups recorded, goose triggered.
- **FIX flood**, seed 1234: full route to WIN, all five present; the 30% branch produces water rather than an automatic loss.
- **NOPE**, seed 1: full route to WIN, all five present; normal fixed spray cycle continues.
- Sample full-route duration before the final packaging pass: approximately **4:13** game time.
- 20 resets with the same seed and identical feedback inputs through 2000 physics steps produced exactly identical serialized coordinates, speed, event state, pickup/ball event logs and grip status.
- An upward impulse applied to a ragdoll in the QA harness demonstrated that the first short departure remains RUN; a genuinely unrecoverable departure subsequently reaches FAIL. This impulse is only a test fixture and never occurs as an artificial gameplay hazard.
- Retry clicked from FAIL resets x to 0, driver only, zero pickups and empty event state in under 1.5 seconds.
- Ten consecutive full resets preserve identical world body counts; old engines, constraints, hats, balls, timers and collision pairs are discarded.
- Keyboard input, P pause/resume, and window blur clearing held input passed.
- 844×390 mobile viewport, on-screen GAS and pointer cancellation passed. The automated pointer check uses Chromium pointer/mouse events; it is not evidence of physical touch hardware testing.
- No browser runtime errors in the passing production suite.

Evidence: `docs/evidence/qa-results.json`, `docs/evidence/qa-fixed.png`, `docs/evidence/qa-flood.png`, `docs/evidence/qa-nope.png`, and `docs/evidence/qa-mobile.png`. Regenerate with `npm run test:e2e` while production preview runs. Screenshot and telemetry files are local, not uploaded to an external service.

The single-file HTML also booted and drove in Chromium when served over HTTP, with zero runtime errors. Direct `file://` navigation could not be tested because this managed browser blocks local-file navigation by administrator policy.

## Physical calibration and limits

Measured in the production build, single driver, fixed 60 Hz:

- 0→8 m/s: **3.88 s**, a little slower than the package's 2.0–3.5 s starting target.
- Braking from **8.36 m/s**: **4.62 m**. This is stronger than the intended 7–14 m at 9 m/s. Kept as an MVP accessibility tradeoff so the four precise stops are controllable; `brakeMps2` is exposed for subsequent tuning.
- First full-route automated pickup is roughly 17 s, slightly later than the design's 15 s target. First golf warning is roughly 24 s, within the 35 s target.
- Route length, four pickup flags, seven bodies per person, graceful loss, full reset, fixed hazards, repair branches, collision-free goose, safe finish and five-person victory are implemented.
- Real collisions, loose limbs, head contact, hats and breakable restraints are simulated. Anatomical elbow/knee chains and hard joint-angle limits are not implemented: seven bodies use single-segment arms/legs, damped distance joints and soft torso stabilization. This is a coarse ragdoll MVP, not an anatomical solver.
- Wheel contacts use explicit grounded drive/brake forces and no tangential Matter contact friction. This avoids segment-contact drag; the suspension and terrain contact remain physical. Low-speed axle compliance is firm rather than a full tire model.
- The water field is bounded and applies only to rigid bodies overlapping the jet. The three-branch E2E runs validate survival/continuation, not every possible high-speed passenger pose in flood water.
- Collision-free goose is verified in configuration and implemented purely in the renderer; it has no body or force call.

## Not validated / further playtesting

- No complete **human-driven** playthrough was performed. Complete continuous automated runs establish an achievable normal-input path; human enjoyment and difficulty remain subjective and unvalidated.
- Physical phones/tablets, Safari/iOS, audio audibility/device routing, screen-reader interaction, and long-session memory profiling were not tested.
- All qualitative ragdoll poses and low-crest risks were not statistically measured at every 3/5/7/9/11 m/s speed, nor were broad human success rates measured. There is no claim of perfect nonpenetration at arbitrary extreme velocities.
- The supplied Figma PNGs informed palette, character accessories and cream/green cart design. Editable Figma layers/layout were not provided, so this is a programmer-drawn interpretation rather than an exact Figma reconstruction.

## Milestone status

M1–M5 playable behavior is implemented and exercised in the continuous full-route tests. M6 build, automated acceptance, restart/resource checks, documented controls and reproduction path are complete. The manual-play, physical-device, exhaustive pose and calibration-target qualifications above remain explicit rather than being marked as passed.
