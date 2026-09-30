# gitBENT

**gitBENT** is a virtual circuit-bent camera / image instrument.

It is deliberately **not** a menu of glitch filters. The image is treated as a signal system with patchable sources and targets. A saved bend is a reusable wiring graph.

## V0.1

Current prototype:

- upload a still image
- patch virtual signal jacks together
- PATCH / BRIDGE / SHORT connection modes
- adjust connection strength
- visible patch cables
- **LICK THE CIRCUIT BOARD** to add one random bend at a time
- save/load bends in browser storage
- export the bent image as PNG
- phone-friendly responsive UI

### Current signal sources

- RED
- GREEN
- BLUE
- LUMA
- X
- Y
- NOISE

### Current targets

- RED
- GREEN
- BLUE
- X OFFSET
- Y OFFSET
- THRESHOLD
- POSTERIZE

## Philosophy

The point is not to select an effect.

The point is to create a small image-processing system where "wrong" connections remain productive. Different source images should react differently to the same wiring.

Later phases add:

- virtual electronic components on wires
- temporal frame memory
- dithering and palette modules
- live iPhone/browser camera input
- WebGL processing
- video capture
- specimen mutation / breeding
- optional native iOS AVFoundation + Metal version

## AI Studio\n\nThis repository keeps the Google AI Studio Vite/React/TypeScript scaffold intact, so the app can continue to be opened, edited, and evolved there. Image bending itself runs client-side and does not require a Gemini call per image.\n\n## Run locally

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
