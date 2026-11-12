# Goose Scare – Full Animation Pack

This is a **frame animation pack**, not an editable Spine rig.

## Assets
- `goose_full_sequence.gif`: 12 frames, one-shot story sequence
- `goose_run_in.gif`: 4-frame first run segment (loops)
- `goose_honk_chase.gif`: 5-frame aggressive HONK segment (loops)
- `goose_run_out.gif`: 3-frame exit run segment (loops)
- `goose_spritesheet_4x3.png`: transparent 4-column × 3-row sheet
- `frames/goose_00.png` to `goose_11.png`: transparent PNGs
- `animation.json`: frame timings and segment indices

## Codex instructions
1. Load the PNG frames (preferred for HTML5 Canvas/Phaser), 110 ms per frame.
2. At approximately 1,270 m and **only after picking up passenger 4**, trigger the goose from the right side of the screen, running left across the road. Mirror sprite horizontally if needed for your direction.
3. Run frames 0–3 for approach, 4–8 for aggressive HONK and wing flaps, 9–11 for leaving. If continuing the run for longer, loop the run segment while adjusting the goose's world x through code.
4. Play a comedic HONK sound at frame 5 or 6 and optional camera micro-shake **visual-only**. Do not damage, launch, or collide physically with car or passengers.
5. Animate sprite x separately from the frame animation; make the goose run visibly fast, with no forced death.
6. Adjust render size without stretching; preserve its aspect ratio.

The frames were generated from the approved cream goose with green visor reference. The original frame rendering had a pale background, removed computationally to create alpha; review compositing against saturated game colors before final shipping.
