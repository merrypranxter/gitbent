# Roadmap

## V0.1 — prove the Bend

- [x] AI Studio React/Vite/TypeScript shell
- [x] still-image upload
- [x] Canvas processing engine
- [x] RED / GREEN / BLUE / LUMA / X / Y / NOISE sources
- [x] RGB / X OFFSET / Y OFFSET / THRESHOLD / POSTERIZE targets
- [x] PATCH / BRIDGE / SHORT modes
- [x] per-wire strength
- [x] visible patch cables
- [x] one-at-a-time random bend
- [x] browser-local specimen save/load
- [x] PNG export
- [x] mobile-responsive first pass
- [x] undo / redo
- [ ] keep tuning signal math from real use

## V0.2 — Forbidden Ports

Goal: move beyond literal camera simulation into impossible cross-domain imaging.

### New sources

- [x] EDGE
- [x] RADIUS
- [x] ANGLE
- [x] BLOCK_X
- [x] BLOCK_Y
- [x] FLOW_X
- [x] FLOW_Y
- [x] CELL_ID
- [x] PALETTE_INDEX

### New targets

- [x] SAMPLE_X
- [x] SAMPLE_Y
- [x] HUE_SHIFT
- [x] SATURATION
- [x] BIT_DEPTH

### Next V0.2 experiments

- [ ] identify the best forbidden source/target pairings through play
- [ ] add port-family labels: IMAGE / GEOMETRY / FIELD / FORBIDDEN
- [ ] improve CELL_ID toward true Voronoi behavior
- [ ] add a WAVE field
- [ ] add region-based signals
- [ ] add a true custom PALETTE target/editor
- [ ] performance profiling before the graph grows further

## V0.3 — wire components

- resistor / attenuator
- amplifier
- inverter
- diode / clip
- quantizer
- bit crusher
- noise injector
- oscillator
- component chain per wire
- serialize components inside saved Bend JSON

## V0.4 — memory

- previous-image / frame abstraction
- delay
- capacitor-like persistence
- feedback-safe limits
- deterministic seed plumbing

## V0.5 — dither board

- ordered Bayer
- Floyd-Steinberg
- Atkinson
- Sierra
- custom palette editor
- palette-index signal
- dither threshold / scale patch targets
- RGB / CMY misregistration

## V0.6 — live browser camera

- request camera permission
- getUserMedia source
- WebGL2 renderer
- live patching
- front / rear camera selector
- still capture
- performance controls

## V0.7 — temporal camera / video

- frame ring buffer
- FRAME -N signals
- motion source
- delay-depth target
- temporal displacement
- feedback
- video capture/export

## V0.8 — specimens

- thumbnails
- star/favorite
- rename
- duplicate/mutate
- JSON import/export
- shareable Bend files
- seeded mutation

## V1 — installable instrument

- PWA polish
- phone-first cable UX
- offline operation
- robust export
- specimen browser
- compact onboarding

## Later / dangerous

- breed two bends
- graph crossover + mutation
- geometry controlling time
- symbolic regions controlling compression
- bitplanes controlling address space
- accelerometer / gyro / touch signals
- audio-reactive signals
- MIDI / WebMIDI / OSC
- native iOS AVFoundation + Metal
