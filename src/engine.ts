export type SignalSource = 'RED' | 'GREEN' | 'BLUE' | 'LUMA' | 'X' | 'Y' | 'NOISE';
export type SignalTarget =
  | 'RED'
  | 'GREEN'
  | 'BLUE'
  | 'X_OFFSET'
  | 'Y_OFFSET'
  | 'THRESHOLD'
  | 'POSTERIZE';

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

function noise2D(x: number, y: number) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

function luma(r: number, g: number, b: number) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function signalValue(
  source: SignalSource,
  r: number,
  g: number,
  b: number,
  x: number,
  y: number,
  width: number,
  height: number,
) {
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
      return width <= 1 ? 0 : x / (width - 1);
    case 'Y':
      return height <= 1 ? 0 : y / (height - 1);
    case 'NOISE':
      return noise2D(x, y);
  }
}

function mixChannel(
  current: number,
  source: number,
  mode: ConnectionMode,
  strength: number,
) {
  const amount = clamp(strength, 0, 1);

  if (mode === 'SHORT') {
    return clamp(current * (1 - amount) + source * 255 * amount);
  }

  if (mode === 'BRIDGE') {
    return clamp(current + (source - 0.5) * 255 * amount);
  }

  return clamp(current * (1 - amount) + source * 255 * amount);
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

  const xWires = connections.filter((wire) => wire.target === 'X_OFFSET');
  const yWires = connections.filter((wire) => wire.target === 'Y_OFFSET');
  const otherWires = connections.filter(
    (wire) => wire.target !== 'X_OFFSET' && wire.target !== 'Y_OFFSET',
  );

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const baseIndex = (y * width + x) * 4;
      const baseR = src[baseIndex];
      const baseG = src[baseIndex + 1];
      const baseB = src[baseIndex + 2];

      let sampleX = x;
      let sampleY = y;

      for (const wire of xWires) {
        const signal = signalValue(
          wire.source,
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

      for (const wire of yWires) {
        const signal = signalValue(
          wire.source,
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

      sampleX = Math.round(((sampleX % width) + width) % width);
      sampleY = Math.round(((sampleY % height) + height) % height);

      const sampleIndex = (sampleY * width + sampleX) * 4;
      let r = src[sampleIndex];
      let g = src[sampleIndex + 1];
      let b = src[sampleIndex + 2];

      for (const wire of otherWires) {
        const signal = signalValue(
          wire.source,
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
            Math.round(
              2 + signal * 14 * Math.max(0.15, wire.strength),
            ),
          );
          const step = 255 / (levels - 1);
          const amount = wire.mode === 'SHORT' ? 1 : wire.strength;
          const quantize = (value: number) =>
            Math.round(value / step) * step;

          r = r * (1 - amount) + quantize(r) * amount;
          g = g * (1 - amount) + quantize(g) * amount;
          b = b * (1 - amount) + quantize(b) * amount;
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
