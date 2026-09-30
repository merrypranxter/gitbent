export type SignalSource =
  | 'RED'
  | 'GREEN'
  | 'BLUE'
  | 'LUMA'
  | 'X'
  | 'Y'
  | 'NOISE'
  | 'EDGE'
  | 'RADIUS'
  | 'ANGLE'
  | 'BLOCK_X'
  | 'BLOCK_Y'
  | 'FLOW_X'
  | 'FLOW_Y'
  | 'CELL_ID'
  | 'PALETTE_INDEX';

export type SignalTarget =
  | 'RED'
  | 'GREEN'
  | 'BLUE'
  | 'X_OFFSET'
  | 'Y_OFFSET'
  | 'SAMPLE_X'
  | 'SAMPLE_Y'
  | 'THRESHOLD'
  | 'POSTERIZE'
  | 'HUE_SHIFT'
  | 'SATURATION'
  | 'BIT_DEPTH';

export type ConnectionMode = 'PATCH' | 'BRIDGE' | 'SHORT';

export interface Connection {
  id: string;
  source: SignalSource;
  target: SignalTarget;
  mode: ConnectionMode;
  strength: number;
}

const clamp = (value: number, min = 0, max = 255) =>
  Math.max(min, Math.min(max, value));

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const wrap = (value: number, size: number) =>
  ((value % size) + size) % size;

const lerp = (a: number, b: number, amount: number) =>
  a + (b - a) * amount;

function noise2D(x: number, y: number) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

function luma(r: number, g: number, b: number) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function pixelLuma(
  src: Uint8ClampedArray,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const sx = Math.round(wrap(x, width));
  const sy = Math.round(wrap(y, height));
  const index = (sy * width + sx) * 4;
  return luma(src[index], src[index + 1], src[index + 2]);
}

function edgeStrength(
  src: Uint8ClampedArray,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const left = pixelLuma(src, x - 1, y, width, height);
  const right = pixelLuma(src, x + 1, y, width, height);
  const up = pixelLuma(src, x, y - 1, width, height);
  const down = pixelLuma(src, x, y + 1, width, height);
  const gx = right - left;
  const gy = down - up;
  return clamp01(Math.sqrt(gx * gx + gy * gy) * 1.6);
}

function flowField(
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const nx = width <= 1 ? 0 : x / (width - 1);
  const ny = height <= 1 ? 0 : y / (height - 1);
  const phase =
    Math.sin(nx * Math.PI * 5 + Math.sin(ny * Math.PI * 3)) +
    Math.cos(ny * Math.PI * 4 - nx * Math.PI * 2);

  return {
    x: clamp01(0.5 + 0.25 * Math.sin(phase * 2.4 + ny * 6.0)),
    y: clamp01(0.5 + 0.25 * Math.cos(phase * 2.1 - nx * 7.0)),
  };
}

function signalValue(
  source: SignalSource,
  src: Uint8ClampedArray,
  r: number,
  g: number,
  b: number,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const nx = width <= 1 ? 0 : x / (width - 1);
  const ny = height <= 1 ? 0 : y / (height - 1);

  switch (source) {
    case 'RED':
      return r / 255;
    case 'GREEN':
      return g / 255;
    case 'BLUE':
      return b / 255;
    case 'LUMA':
      return luma(r, g, b);
    case 'X':
      return nx;
    case 'Y':
      return ny;
    case 'NOISE':
      return noise2D(x, y);
    case 'EDGE':
      return edgeStrength(src, x, y, width, height);
    case 'RADIUS': {
      const dx = nx - 0.5;
      const dy = ny - 0.5;
      return clamp01(Math.sqrt(dx * dx + dy * dy) / Math.SQRT1_2);
    }
    case 'ANGLE':
      return (Math.atan2(ny - 0.5, nx - 0.5) + Math.PI) / (Math.PI * 2);
    case 'BLOCK_X':
      return (Math.floor(x / 8) % 16) / 15;
    case 'BLOCK_Y':
      return (Math.floor(y / 8) % 16) / 15;
    case 'FLOW_X':
      return flowField(x, y, width, height).x;
    case 'FLOW_Y':
      return flowField(x, y, width, height).y;
    case 'CELL_ID': {
      const cellSize = Math.max(18, Math.round(Math.min(width, height) / 14));
      const cellX = Math.floor(x / cellSize);
      const cellY = Math.floor(y / cellSize);
      return noise2D(cellX * 11.3, cellY * 17.7);
    }
    case 'PALETTE_INDEX':
      return Math.round(luma(r, g, b) * 7) / 7;
  }
}

function mixChannel(
  current: number,
  source: number,
  mode: ConnectionMode,
  strength: number,
) {
  const amount = clamp01(strength);

  if (mode === 'SHORT') {
    return clamp(current * (1 - amount) + source * 255 * amount);
  }

  if (mode === 'BRIDGE') {
    return clamp(current + (source - 0.5) * 255 * amount);
  }

  return clamp(current * (1 - amount) + source * 255 * amount);
}

function applyAddressSignal(
  current: number,
  source: number,
  size: number,
  mode: ConnectionMode,
  strength: number,
) {
  const amount = clamp01(strength);
  const absoluteTarget = source * Math.max(0, size - 1);

  if (mode === 'SHORT') {
    return lerp(current, absoluteTarget, amount);
  }

  if (mode === 'BRIDGE') {
    return current + (source - 0.5) * size * amount * 1.8;
  }

  return lerp(current, absoluteTarget, amount * 0.72);
}

function rgbToHsl(r: number, g: number, b: number) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h /= 6;
    if (h < 0) h += 1;
  }

  return {h, s: clamp01(s), l: clamp01(l)};
}

function hslToRgb(h: number, s: number, l: number) {
  const hue = wrap(h, 1);
  const saturation = clamp01(s);
  const lightness = clamp01(l);
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const hp = hue * 6;
  const x = c * (1 - Math.abs((hp % 2) - 1));

  let rn = 0;
  let gn = 0;
  let bn = 0;

  if (hp < 1) [rn, gn, bn] = [c, x, 0];
  else if (hp < 2) [rn, gn, bn] = [x, c, 0];
  else if (hp < 3) [rn, gn, bn] = [0, c, x];
  else if (hp < 4) [rn, gn, bn] = [0, x, c];
  else if (hp < 5) [rn, gn, bn] = [x, 0, c];
  else [rn, gn, bn] = [c, 0, x];

  const m = lightness - c / 2;
  return {
    r: (rn + m) * 255,
    g: (gn + m) * 255,
    b: (bn + m) * 255,
  };
}

export function bendImage(
  sourceData: ImageData,
  width: number,
  height: number,
  connections: Connection[],
) {
  const src = sourceData.data;
  const out = new ImageData(width, height);
  const dst = out.data;

  const xOffsetWires = connections.filter((wire) => wire.target === 'X_OFFSET');
  const yOffsetWires = connections.filter((wire) => wire.target === 'Y_OFFSET');
  const sampleXWires = connections.filter((wire) => wire.target === 'SAMPLE_X');
  const sampleYWires = connections.filter((wire) => wire.target === 'SAMPLE_Y');
  const colorWires = connections.filter(
    (wire) =>
      !['X_OFFSET', 'Y_OFFSET', 'SAMPLE_X', 'SAMPLE_Y'].includes(wire.target),
  );

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const baseIndex = (y * width + x) * 4;
      const baseR = src[baseIndex];
      const baseG = src[baseIndex + 1];
      const baseB = src[baseIndex + 2];

      let sampleX = x;
      let sampleY = y;

      for (const wire of sampleXWires) {
        const signal = signalValue(
          wire.source,
          src,
          baseR,
          baseG,
          baseB,
          x,
          y,
          width,
          height,
        );
        sampleX = applyAddressSignal(
          sampleX,
          signal,
          width,
          wire.mode,
          wire.strength,
        );
      }

      for (const wire of sampleYWires) {
        const signal = signalValue(
          wire.source,
          src,
          baseR,
          baseG,
          baseB,
          x,
          y,
          width,
          height,
        );
        sampleY = applyAddressSignal(
          sampleY,
          signal,
          height,
          wire.mode,
          wire.strength,
        );
      }

      for (const wire of xOffsetWires) {
        const signal = signalValue(
          wire.source,
          src,
          baseR,
          baseG,
          baseB,
          x,
          y,
          width,
          height,
        );
        const bipolar = signal * 2 - 1;
        const maxShift = Math.max(8, width * 0.22);
        sampleX +=
          bipolar *
          maxShift *
          wire.strength *
          (wire.mode === 'SHORT' ? 1.7 : 1);
      }

      for (const wire of yOffsetWires) {
        const signal = signalValue(
          wire.source,
          src,
          baseR,
          baseG,
          baseB,
          x,
          y,
          width,
          height,
        );
        const bipolar = signal * 2 - 1;
        const maxShift = Math.max(8, height * 0.22);
        sampleY +=
          bipolar *
          maxShift *
          wire.strength *
          (wire.mode === 'SHORT' ? 1.7 : 1);
      }

      sampleX = Math.round(wrap(sampleX, width));
      sampleY = Math.round(wrap(sampleY, height));

      const sampleIndex = (sampleY * width + sampleX) * 4;
      let r = src[sampleIndex];
      let g = src[sampleIndex + 1];
      let b = src[sampleIndex + 2];

      for (const wire of colorWires) {
        const signal = signalValue(
          wire.source,
          src,
          r,
          g,
          b,
          sampleX,
          sampleY,
          width,
          height,
        );

        if (wire.target === 'RED') {
          r = mixChannel(r, signal, wire.mode, wire.strength);
        }

        if (wire.target === 'GREEN') {
          g = mixChannel(g, signal, wire.mode, wire.strength);
        }

        if (wire.target === 'BLUE') {
          b = mixChannel(b, signal, wire.mode, wire.strength);
        }

        if (wire.target === 'THRESHOLD') {
          const threshold =
            0.5 * (1 - wire.strength) + signal * wire.strength;
          const on = luma(r, g, b) >= threshold ? 255 : 0;

          if (wire.mode === 'SHORT') {
            r = on;
            g = on;
            b = on;
          } else {
            const amount =
              wire.mode === 'BRIDGE'
                ? wire.strength * 0.72
                : wire.strength * 0.48;
            r = r * (1 - amount) + on * amount;
            g = g * (1 - amount) + on * amount;
            b = b * (1 - amount) + on * amount;
          }
        }

        if (wire.target === 'POSTERIZE') {
          const levels = Math.max(
            2,
            Math.round(2 + signal * 14 * Math.max(0.15, wire.strength)),
          );
          const step = 255 / (levels - 1);
          const amount = wire.mode === 'SHORT' ? 1 : wire.strength;
          const quantize = (value: number) =>
            Math.round(value / step) * step;

          r = r * (1 - amount) + quantize(r) * amount;
          g = g * (1 - amount) + quantize(g) * amount;
          b = b * (1 - amount) + quantize(b) * amount;
        }

        if (wire.target === 'HUE_SHIFT') {
          const hsl = rgbToHsl(r, g, b);

          if (wire.mode === 'SHORT') {
            hsl.h = lerp(hsl.h, signal, wire.strength);
          } else {
            const turns =
              (signal - 0.5) *
              wire.strength *
              (wire.mode === 'BRIDGE' ? 2 : 1);
            hsl.h = wrap(hsl.h + turns, 1);
          }

          const shifted = hslToRgb(hsl.h, hsl.s, hsl.l);
          r = shifted.r;
          g = shifted.g;
          b = shifted.b;
        }

        if (wire.target === 'SATURATION') {
          const hsl = rgbToHsl(r, g, b);

          if (wire.mode === 'SHORT') {
            hsl.s = lerp(hsl.s, signal, wire.strength);
          } else if (wire.mode === 'BRIDGE') {
            hsl.s = clamp01(hsl.s + (signal - 0.5) * wire.strength * 1.8);
          } else {
            hsl.s = clamp01(
              hsl.s * (1 + (signal - 0.5) * wire.strength * 2.2),
            );
          }

          const saturated = hslToRgb(hsl.h, hsl.s, hsl.l);
          r = saturated.r;
          g = saturated.g;
          b = saturated.b;
        }

        if (wire.target === 'BIT_DEPTH') {
          const bits = Math.max(1, Math.min(8, 1 + Math.floor(signal * 8)));
          const levels = Math.pow(2, bits);
          const step = 255 / Math.max(1, levels - 1);
          const amount =
            wire.mode === 'SHORT'
              ? 1
              : wire.strength * (wire.mode === 'BRIDGE' ? 0.9 : 0.7);
          const quantize = (value: number) =>
            Math.round(value / step) * step;

          r = lerp(r, quantize(r), amount);
          g = lerp(g, quantize(g), amount);
          b = lerp(b, quantize(b), amount);
        }
      }

      dst[baseIndex] = clamp(r);
      dst[baseIndex + 1] = clamp(g);
      dst[baseIndex + 2] = clamp(b);
      dst[baseIndex + 3] = src[sampleIndex + 3];
    }
  }

  return out;
}
