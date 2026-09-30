# gitBENT architecture

## Thesis

**gitBENT is not a simulation of broken hardware. It is a patchable image nervous system where physical and impossible signals can be crossed to produce emergent visual behavior.**

The circuit-bending metaphor is the interface, not the limit.

A real camera can expose color channels, sensor readout, gain, timing, and storage artifacts. gitBENT may also expose geometry, image neighborhoods, symbolic region identities, artificial fields, time, compression structure, bitplanes, and other signals that do not exist as literal wires in a consumer camera.

That is intentional.

## Product rule

gitBENT is an **instrument**, not a filter collection.

A Bend is a signal graph. The image is the consequence of that graph.

When adding a feature, ask:

> Does this create a new signal, destination, component, adapter, or relationship?

If the only representation is a named visual preset such as "spiral glitch" or "VHS 4", expose the underlying machinery instead whenever practical.

The preferred outcome is that recognizable effects can emerge accidentally from simpler parts.

## Physical and impossible buses

Signals may come from several domains.

### Image signals

- RED
- GREEN
- BLUE
- LUMA
- EDGE

### Coordinate / geometry signals

- X
- Y
- RADIUS
- ANGLE
- BLOCK_X
- BLOCK_Y

### Synthetic field signals

- NOISE
- FLOW_X
- FLOW_Y
- CELL_ID

### Symbolic / quantized signals

- PALETTE_INDEX

Later domains may include:

- bitplanes
- compression blocks
- motion
- frame age
- temporal buffers
- region IDs
- audio
- accelerometer / gyro
- touch
- external control

Cross-domain patching is a core behavior, not an edge case.

Examples:

```
ANGLE -> SAMPLE_X
RADIUS -> HUE_SHIFT
EDGE -> BIT_DEPTH
CELL_ID -> SAMPLE_Y
FLOW_X -> SATURATION
PALETTE_INDEX -> X_OFFSET
```

## Address-space bending

gitBENT distinguishes between **offsetting** coordinates and **rewriting sample addresses**.

### X_OFFSET / Y_OFFSET

These behave like displacement: a source pushes the current sample position away from where it started.

### SAMPLE_X / SAMPLE_Y

These are non-physical address-space inputs. A signal can directly influence where each output pixel fetches its source pixel from.

This is one of the first explicitly impossible buses.

Examples:

```
ANGLE -> SAMPLE_X
RADIUS -> SAMPLE_Y
CELL_ID -> SAMPLE_X
FLOW_Y -> SAMPLE_Y
```

These relationships can create folds, tunnels, radial tearing, block teleportation, and other structures without hard-coding those effects as presets.

## Current V0.2 graph

### Sources

- RED
- GREEN
- BLUE
- LUMA
- X
- Y
- NOISE
- EDGE
- RADIUS
- ANGLE
- BLOCK_X
- BLOCK_Y
- FLOW_X
- FLOW_Y
- CELL_ID
- PALETTE_INDEX

### Targets

- RED
- GREEN
- BLUE
- X_OFFSET
- Y_OFFSET
- SAMPLE_X
- SAMPLE_Y
- THRESHOLD
- POSTERIZE
- HUE_SHIFT
- SATURATION
- BIT_DEPTH

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

Components should live **on wires** and transform signals rather than becoming hidden global effects.

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

Components must remain serializable and composable.

## Fields

gitBENT may generate internal environments that exist independently of the uploaded image.

Current first-generation fields:

- NOISE
- FLOW_X
- FLOW_Y
- CELL_ID
- RADIUS
- ANGLE

Later:

- wave interference
- turbulence
- Voronoi distance
- signed distance fields
- reaction-diffusion
- attractor fields
- curl fields

A field can control color, sampling, quantization, memory, or another field.

## Randomness

Random operations should gain explicit seeds.

**LICK THE CIRCUIT BOARD** remains incremental: one new intervention at a time, so accidental discoveries can be understood, undone, saved, and eventually reproduced from seed.

## Temporal phase

After the still-image signal universe is sufficiently strange, add a frame ring buffer:

- NOW
- FRAME -1
- FRAME -2
- FRAME -4
- FRAME -8
- FRAME -16

This unlocks temporal displacement, feedback, smearing, brightness-controlled delay, motion-controlled buffer addressing, and previous-frame color contamination.

Video should inherit the mature still-image graph. It should not merely animate a shallow filter stack.

## Dither / palette phase

Dithering is graph machinery, not a post-effect menu.

Planned modules:

- ordered Bayer
- Floyd-Steinberg
- Atkinson
- Sierra
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
- visible distinction between physical, digital, field, and forbidden domains
- saved specimens that reveal their wiring

Avoid:

- hidden preset stacks
- fake knobs that secretly map to unrelated effects
- generic "glitch" labels with no signal meaning
- blocking invalid connections when an adapter could make them interesting
