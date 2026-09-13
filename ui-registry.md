# KN1GHTS UI Registry

## Baseline

Established 2026-09-13 from the initial cinematic build.

| Property | Pattern |
| --- | --- |
| Page background | `--ink: #050706` with `--deep: #07120e` atmospheric layers |
| Primary text | `--paper: #ecede7` |
| Secondary text | `--soft: #8a918c` |
| Accent | `--acid: #b7ff3c`, amber reserved for exploit state |
| Borders | 1px `--hairline`, sharp corners only |
| Display type | Barlow Condensed, uppercase, weight 500 to 700, negative tracking |
| Technical type | IBM Plex Mono, 8px to 13px, restrained letter spacing |
| Spacing | Fluid page inset from 20px to 76px, large vertical negative space |
| Interactive state | Acid fill with near-black text, 4px offset focus outline |
| Shadows | None; depth comes from blur, fog, contrast, and WebGL |

### Cinematic chapter

File: `components/sections/Story.tsx`

Pattern notes: chapters use a sticky 100dvh copy stage inside 140dvh to 300dvh scroll regions. Copy stays editorial and sparse while the persistent canvas carries narrative continuity.

### Interactive control

Files: `components/ui/Header.tsx`, `components/sections/Story.tsx`

Pattern notes: controls are sharp, unfilled by default, and switch to acid green on hover or keyboard focus. Buttons use mono uppercase labels and physical 1px borders where boundaries are needed.
