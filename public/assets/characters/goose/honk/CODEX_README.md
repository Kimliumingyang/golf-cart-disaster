# Goose honk animation — drop-in asset pack

For Golf Cart Disaster! (harmless goose scare).

Files:
- `goose_honk.gif`: animated transparent GIF (8 frames, 110ms each, loops).
- `frames/goose_00.png` ... `goose_07.png`: transparent RGBA frames, 443×443; prefer these for Canvas/Phaser.
- `goose_spritesheet.png`: 4 columns × 2 rows; each cell 443×443.
- `animation.json`: metadata.

## Codex instruction
Copy the pack into `public/assets/characters/goose/`. Use a spritesheet or PNG frame animation in the game engine (not `<img>` GIF if you need reliable frame synchronization). At the goose event after passenger 4, play the honk animation once, emit a HONK sound, and move the goose across the front of the scene. **Disable collisions / damage; goose is purely a scare gag.**

Note: This pack is raster animation, **not** a Spine `.spine`, `.json` rig or `.atlas`; it cannot provide editable bone transforms.
