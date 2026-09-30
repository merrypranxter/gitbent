# gitBENT architecture

## Product rule

gitBENT is an **instrument**, not a filter collection.

A bend is a signal graph. The image is the consequence of that graph.

If a feature can only be represented as a named visual preset, prefer exposing the underlying signal, destination, operation, or component instead.

## V0.1 renderer

V0.1 uses Canvas 2D + ImageData intentionally. This is the smallest useful experiment for proving the graph behavior before moving rendering to WebGL2.

The first questions are:

1. Do arbitrary signal connections produce meaningfully different results?
2. Do PATCH / BRIDGE / SHORT feel different?
3. Does the same saved bend react differently to different source images?
4. Which signal relationships are actually fun enough to keep?

## Graph model

A Bend is serializable JSON.

```ts
type Bend = {
  version: 1
  id: string
  name: string
  seed?: number
  connections: Connection[]
}

type Connection = {
  id: string
  source: SignalPort
  target: TargetPort
  mode: 'PATCH' | 'BRIDGE' | 'SHORT'
  strength: number
  components?: Component[]
}
```

## Current signals

Scalar sources:

- RED
- GREEN
- BLUE
- LUMA
- X
- Y
- NOISE

Current destinations:

- RED
- GREEN
- BLUE
- X_OFFSET
- Y_OFFSET
- THRESHOLD
- POSTERIZE

## Typed signals later

Future graph nodes should distinguish useful signal types:

- scalar
- vec2
- RGB
- texture
- temporal texture
- gate / boolean
- integer / bit field
- time

**Mismatched connections should not simply be rejected.**

Instead, gitBENT should provide intentionally lossy adapters.

Examples:

- RGB -> scalar: luminance / average / max channel
- scalar -> RGB: grayscale / palette mapping
- texture -> scalar: sampled pixel / regional mean / edge energy
- time -> scalar: oscillator
- vec2 -> RGB: coordinate-to-color mapping

The design goal is to make incorrect wiring productive.

## Connection modes

### PATCH
Source politely modulates the destination.

### BRIDGE
Signals contaminate one another around a midpoint / combination operation.

### SHORT
Source aggressively dominates the destination.

Later:

- FLOAT
- LEAK
- FEEDBACK

## Wire components

Planned components:

- resistor / attenuator
- amplifier
- inverter
- clamp
- diode
- quantizer
- bit crusher
- bit swap
- XOR / AND / OR
- noise injector
- oscillator
- sample-and-hold
- delay
- capacitor / memory
- feedback tap

Components should remain serializable and composable.

## Randomness

Random operations should gain explicit seeds.

**LICK THE CIRCUIT BOARD** should remain incremental: one new intervention at a time, so accidental discoveries can be understood and reproduced.

## Temporal phase

Add a frame ring buffer:

- NOW
- FRAME -1
- FRAME -2
- FRAME -4
- FRAME -8
- FRAME -16

This unlocks temporal displacement, feedback, smearing, brightness-controlled delay, motion-controlled buffer addressing, and previous-frame color contamination.

## Dither / palette phase

Dithering should be graph machinery, not a post-effect menu.

Planned modules:

- ordered Bayer
- Floyd-Steinberg
- Atkinson
- Sierra
- posterize
- custom palette
- palette index
- halftone scale / angle
- channel misregistration

Useful parameters should be patchable.

Examples:

```
LUMA -> DITHER_THRESHOLD
RED -> BAYER_SCALE
FRAME_-4 -> PALETTE_INDEX
```

## Live camera phase

Browser:

```
getUserMedia()
  -> video frame
  -> WebGL texture
  -> compiled Bend graph
  -> canvas
```

Target iPhone Safari / installed PWA first.

Possible later native version:

```
AVFoundation
  -> CVPixelBuffer
  -> Metal texture
  -> Bend graph
  -> display / capture
```

## UI rule

The user should learn gitBENT like an instrument.

Prefer:

- visible jacks
- visible cables
- inspectable connections
- components inserted into cables
- plain-English port explanations
- saved specimens that reveal their wiring

Avoid:

- hidden preset stacks
- fake knobs that secretly map to unrelated effects
- generic "glitch" labels with no signal meaning
- blocking invalid connections when an adapter could make them interesting
