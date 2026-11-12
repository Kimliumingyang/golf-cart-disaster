# Golf Cart Disaster! — playable HTML5 MVP

A complete 1500 m driving game: menu → four pickups → pipe decision → harmless goose → five-person finish, or physics loss → Retry from 0 m. Original development package read in full; its JSON is retained in `src/config/`. Figma PNG exports were used as visual references only. All runtime art is Canvas/CSS; there are no downloaded art assets, runtime CDNs, accounts, ads or network services.

## Play the ready-built version

Download [`GolfCartDisaster.html`](GolfCartDisaster.html) using GitHub’s **Download raw file** button, then open the saved file in a modern browser. It includes the whole game and needs no installation. GitHub’s normal file viewer shows source code, so download the HTML to play. For devices that block local HTML, use the local server below.

[QA report](QA_REPORT.md) · [Test evidence](docs/evidence/qa-results.json)

## Run

Node 20.19+ or Node 22.12+:

```sh
npm install
npm run dev
```

Open the printed local URL. Production:

```sh
npm run build
npm run preview
```

[`GolfCartDisaster.html`](GolfCartDisaster.html) is also a self-contained playable build: open it directly in a modern browser, no installation or server needed. `dist/` is the production web build.

## Controls and a full run

- D / Right or hold GAS: drive. A / Left or BRAKE: brake, then reverse. Release GAS to coast.
- Space / HOP: small grounded jump, 1.5 s cooldown. Hopping is optional and often a poor idea.
- P / Escape: pause, resume and volume. R: full restart. ♪: mute.
- Stop within ±3 m of each flag at 120, 400, 780 and 1190 m. Hold below 1 m/s for 0.6 s. All aboard become briefly, suspiciously respectable.
- At roughly 160 m, watch the golfer wind up and the arc warning. Brake behind the ball or drive through its fixed corridor.
- Drive up the 235–325 m hill; brake across its crest. Roll over the tiny hole at 360 m; no jump needed.
- Pipe at 520 m: FIX IT has 70% success, or NOPE lets you wait for the regular spray cycle. Failed repair creates a physical water jet; it does not cause an automatic loss.
- Brake before the small 650–680 m hill to about 3 m/s.
- Use gas on the 940–1000 m climb, ease back across the plateau, and brake before descending at 1055 m.
- After the last pickup the goose only honks. Drive to the clubhouse and stop at 1500 m, below 2 m/s for 0.5 s.
- Lose a person irrecoverably or remain overturned and immobile for 3 s: the whole run restarts, with driver only. A hat is not a person.

## Architecture / project tree

```
index.html                 accessible DOM HUD, modal and pointer controls
src/main.js                accumulator, rendering and 60 Hz fixed stepping
src/config/                original JSON, validation, explicit unit conversion, tuning.js
src/physics/world.js       Matter world, triangular axle suspension, cart, seven-part people
src/world/terrain.js       raised-cosine terrain, shallow hole, streamed overlapping collision strips
src/world/events.js        visible ball, repair RNG, physical water force field, visual-only goose
src/game/game.js           states, pickups, loss grace, restart, five-person finish, local telemetry
src/render/canvas.js       vector art separated from simulation; all parts follow physics transforms
src/ui/                    keyboard / pointer / blur handling, HUD and dialogs
src/debug/driver.js        repeatable button-only feedback test driver
src/style.css              responsive desktop / touch UI
tests/                     config, terrain and Chromium production E2E tests
QA_REPORT.md               actual results and limitations
```

Physics uses 40 px/m; velocity converts Matter px/60 Hz tick to m/s. Acceleration converts m/s² to px/ms² before applying force. The 100-unit chassis and character masses preserve designed relative loads without treating Matter mass as SI kg. Axles use two diagonal soft distance constraints each; longitudinal grounded traction and braking are explicit forces, with bounded engine assistance uphill. Wheel contact friction is zero because Matter's friction over streamed segment contacts caused excessive drivetrain drag; the grounded traction model supplies propulsion/braking. There is no per-frame velocity governor or ragdoll jitter. Jump alone applies an impulse through velocity change.

Each person has seven colliding rigid bodies, damped joints, a weak breakable pelvis/rail restraint, and a bounded torso muscle torque. They collide with the cart and each other; self-collision is disabled per person for stability. The joint limits are distance constraints plus soft torso stabilization, not anatomical elbow/knee joints. Arms and legs each use one segment as specified by the seven-body budget. A broken restraint can regrab when the pelvis returns close enough. People may leave seats, hang, collide and return before the 0.6 s irrecoverable-loss timer. Decor hats are separate physics bodies. Pickup recreation clears body momentum and constraints without resurrecting a lost run.

Terrain is streamed around the vehicle, including reverse travel, avoiding thousands of distant rigid bodies. Adjacent segments overlap to prevent exposed collision seams. Camera and accessories can be replaced independently of the physics.

## Tests / debug

```sh
npm test
npm run build
npm run preview -- --port 4173
# in another terminal; installed system Chromium by default
npm run test:e2e
# override if needed:
CHROMIUM_PATH=/path/to/chromium GAME_URL='http://localhost:4173/?debug=1' npm run test:e2e
```

Open `/?debug=1`: H collision outlines, T fixed feedback test driver, L half-speed, R whole-run reset. Debug includes coordinates, speed, angle, angular velocity, seed, live bodies, seat displacement, grip/loss timers and event state. `window.golf` exposes snapshot, fixed steps and local telemetry. No test driver or debugging UI is exposed without the URL flag. Test driver only presses GAS/BRAKE and never teleports, edits velocity, grants pickups or bypasses win conditions. Pipe choice remains an explicit dialog. The test runner sets a known seed to cover both probability outcomes. Records stay local.

For a reproducible full test: launch debug, press DRIVE, press T, choose FIX IT or NOPE when prompted. It will drive the continuous route and stop at all four flags and the finish. There is no teleport or checkpoint. Automated evidence in `docs/evidence/qa-results.json` includes three complete production runs and their event logs.

## Five priority tuning parameters

In `src/config/tuning.js`:

1. `motorAccelMps2` / `brakeMps2`: observable response and stopping distance.
2. `seatStiffness`: how readily bodies move around inside the cart.
3. `seatBreakDistancePx` / `seatBreakSeconds`: grip failure from actual stretch, never a speed threshold.
4. `uphillAssistMps2`: loaded climbing torque without changing terrain or gravity.
5. `suspensionStiffness`: axle compliance, landing bounce and contact stability.

Terrain crest curvature remains editable in `LEVEL_DATA.json`; pipe probability and event timing use the design data, with engine-native water force calibrated separately.

## GitHub build checks

Each push and pull request runs dependency installation, configuration/terrain tests, and the production build. The GitHub Actions run attaches a downloadable `golf-cart-disaster-web-build` artifact. Full Chromium gameplay tests are documented above and run separately; CI does not claim to run them.
