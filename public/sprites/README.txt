This folder should contain your sprite sheets.

Recommended filename: character_sheet.png

Sprite sheet layout (rows, 0-indexed):
  Row 0: idle   — 4 frames  (64×64 px each)
  Row 1: walk   — 6 frames
  Row 2: attack — 4 frames
  Row 3: hurt   — 3 frames
  Row 4: death  — 5 frames
  Row 5: run    — 6 frames

Total sheet size: 384 × 384 px (6 columns × 6 rows × 64 px)

Free sprite sheet sources:
  - https://opengameart.org/
  - https://itch.io/game-assets/free/tag-sprites
  - https://craftpix.net/freebies/

Place the file at: public/sprites/character_sheet.png
The path is referenced in components/game/Character.tsx via DEFAULT_SPRITE.sheetPath.
