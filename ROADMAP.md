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
- [ ] test radically different images
- [ ] tune the signal math from real use
- [ ] undo / redo

## V0.2 — components

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

## V0.3 — memory

- previous-image / frame abstraction
- delay
- capacitor-like persistence
- feedback-safe limits
- deterministic seed plumbing

## V0.4 — dither board

- ordered Bayer
- Floyd-Steinberg
- Atkinson
- Sierra
- custom palette editor
- palette-index signal
- dither threshold / scale patch targets
- RGB / CMY misregistration

## V0.5 — live browser camera

- request camera permission
- getUserMedia source
- WebGL2 renderer
- live patching
- front / rear camera selector
- still capture
- performance controls

## V0.6 — temporal camera

- frame ring buffer
- FRAME -N signals
- motion source
- delay-depth target
- temporal displacement
- feedback
- video capture/export

## V0.7 — specimens

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
- accelerometer / gyro / touch signals
- audio-reactive signals
- MIDI / WebMIDI / OSC
- native iOS AVFoundation + Metal
