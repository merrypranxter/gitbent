# gitBENT

**gitBENT** is an impossible circuit-bending image instrument.

It began with the idea of simulating a circuit-bent camera, then immediately escaped the camera.

> **gitBENT is a patchable image nervous system where physical and impossible signals can be crossed to produce emergent visual behavior.**

It is deliberately **not** a menu of glitch filters. A saved Bend is a reusable wiring graph, and the image is the consequence of that graph.

## V0.2 — Forbidden Ports

The current still-image lab can patch ordinary image signals together, but it can also cross signals that have no literal equivalent on a real camera circuit board.

### Sources

- RED / GREEN / BLUE / LUMA
- X / Y
- NOISE
- EDGE
- RADIUS / ANGLE
- BLOCK_X / BLOCK_Y
- FLOW_X / FLOW_Y
- CELL_ID
- PALETTE_INDEX

### Targets

- RED / GREEN / BLUE
- X OFFSET / Y OFFSET
- **SAMPLE X / SAMPLE Y** — rewrite where pixels are fetched from
- THRESHOLD
- POSTERIZE
- HUE SHIFT
- SATURATION
- BIT DEPTH

Try things such as:

```
ANGLE -> SAMPLE X
RADIUS -> HUE SHIFT
EDGE -> BIT DEPTH
CELL ID -> SAMPLE Y
FLOW X -> SATURATION
```

The goal is not to choose a named effect. The goal is to cross systems and discover behavior.

## Current controls

- upload a still image
- patch source jacks into target jacks
- PATCH / BRIDGE / SHORT
- per-wire strength
- visible cables
- undo / redo
- **LICK THE CIRCUIT BOARD** for one random intervention at a time
- save/load specimens in browser storage
- export PNG

## Why still images first?

Still images are the lab bench.

The signal language should become interesting before live video is added. Once the graph has genuinely useful impossible relationships, the same system can gain frame memory, feedback, delayed frames, motion signals, and live camera input instead of becoming "the same filters, but moving."

## AI Studio

This repository keeps the Google AI Studio Vite/React/TypeScript scaffold intact, so the app can continue to be opened, edited, and evolved there.

Image bending itself runs client-side and does not require a Gemini call per image.

## Run locally

```bash
npm install
npm run dev
```

Type-check:

```bash
npm run lint
```

Production build:

```bash
npm run build
```
