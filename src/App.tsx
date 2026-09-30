/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {useEffect, useMemo, useRef, useState, type CSSProperties} from 'react';
import {
  bendImage,
  type Connection,
  type ConnectionMode,
  type SignalSource,
  type SignalTarget,
} from './engine.ts';

const SOURCES: SignalSource[] = ['RED', 'GREEN', 'BLUE', 'LUMA', 'X', 'Y', 'NOISE'];
const TARGETS: SignalTarget[] = [
  'RED',
  'GREEN',
  'BLUE',
  'X_OFFSET',
  'Y_OFFSET',
  'THRESHOLD',
  'POSTERIZE',
];
const MODES: ConnectionMode[] = ['PATCH', 'BRIDGE', 'SHORT'];

const sourceColors: Record<SignalSource, string> = {
  RED: '#ff355e',
  GREEN: '#74ff66',
  BLUE: '#3fd5ff',
  LUMA: '#f8ff8d',
  X: '#ff70e8',
  Y: '#b69cff',
  NOISE: '#ff9f43',
};

const targetColors: Record<SignalTarget, string> = {
  RED: '#ff355e',
  GREEN: '#74ff66',
  BLUE: '#3fd5ff',
  X_OFFSET: '#ff70e8',
  Y_OFFSET: '#b69cff',
  THRESHOLD: '#f8ff8d',
  POSTERIZE: '#ff9f43',
};

interface SavedBend {
  id: string;
  name: string;
  createdAt: string;
  connections: Connection[];
}

function makeId() {
  if ('randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2, 10);
}

function displayPort(name: SignalTarget) {
  return name.replaceAll('_', ' ');
}

function readSavedBends(): SavedBend[] {
  try {
    const value = localStorage.getItem('gitbent:bends');
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sourceDataRef = useRef<ImageData | null>(null);

  const [dimensions, setDimensions] = useState({width: 0, height: 0});
  const [imageName, setImageName] = useState('');
  const [pendingSource, setPendingSource] = useState<SignalSource | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const [status, setStatus] = useState(
    'LOAD AN IMAGE. THEN TOUCH A SOURCE JACK AND A TARGET JACK.',
  );
  const [savedBends, setSavedBends] = useState<SavedBend[]>(readSavedBends);

  const selectedWire =
    connections.find((wire) => wire.id === selectedWireId) ?? null;

  useEffect(() => {
    if (!sourceDataRef.current || !dimensions.width || !dimensions.height) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const bent = bendImage(
      sourceDataRef.current,
      dimensions.width,
      dimensions.height,
      connections,
    );

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    canvas.getContext('2d')?.putImageData(bent, 0, 0);
  }, [connections, dimensions]);

  const wireCountByTarget = useMemo(() => {
    const counts: Partial<Record<SignalTarget, number>> = {};
    for (const wire of connections) {
      counts[wire.target] = (counts[wire.target] ?? 0) + 1;
    }
    return counts;
  }, [connections]);

  function loadImage(file?: File) {
    if (!file) return;

    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const maxDimension = 900;
      const scale = Math.min(
        1,
        maxDimension / Math.max(image.width, image.height),
      );
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));

      const buffer = document.createElement('canvas');
      buffer.width = width;
      buffer.height = height;

      const context = buffer.getContext('2d', {willReadFrequently: true});
      if (!context) {
        setStatus('CANVAS CONTEXT FAILED. THE MACHINE IS SULKING.');
        URL.revokeObjectURL(url);
        return;
      }

      context.drawImage(image, 0, 0, width, height);
      sourceDataRef.current = context.getImageData(0, 0, width, height);

      setDimensions({width, height});
      setImageName(file.name);
      setStatus('IMAGE HOT. PATCH SOMETHING THAT SHOULD NOT BE PATCHED.');
      URL.revokeObjectURL(url);
    };

    image.onerror = () => {
      setStatus('THAT IMAGE REFUSED TO ENTER THE MACHINE.');
      URL.revokeObjectURL(url);
    };

    image.src = url;
  }

  function chooseSource(source: SignalSource) {
    setPendingSource(source);
    setStatus(`${source} ARMED. NOW TOUCH A TARGET JACK.`);
  }

  function chooseTarget(target: SignalTarget) {
    if (!pendingSource) {
      setStatus('PICK A SOURCE JACK FIRST.');
      return;
    }

    const wire: Connection = {
      id: makeId(),
      source: pendingSource,
      target,
      mode: 'PATCH',
      strength: 0.65,
    };

    setConnections((current) => [...current, wire]);
    setSelectedWireId(wire.id);
    setPendingSource(null);
    setStatus(`${wire.source} → ${displayPort(wire.target)} CONNECTED.`);
  }

  function updateSelected(patch: Partial<Connection>) {
    if (!selectedWireId) return;

    setConnections((current) =>
      current.map((wire) =>
        wire.id === selectedWireId ? {...wire, ...patch} : wire,
      ),
    );
  }

  function removeSelected() {
    if (!selectedWireId) return;

    setConnections((current) =>
      current.filter((wire) => wire.id !== selectedWireId),
    );
    setSelectedWireId(null);
    setStatus('WIRE YANKED OUT.');
  }

  function lickCircuitBoard() {
    const source = SOURCES[Math.floor(Math.random() * SOURCES.length)];
    const target = TARGETS[Math.floor(Math.random() * TARGETS.length)];
    const mode = MODES[Math.floor(Math.random() * MODES.length)];
    const strength = Number((0.25 + Math.random() * 0.7).toFixed(2));

    const wire: Connection = {
      id: makeId(),
      source,
      target,
      mode,
      strength,
    };

    setConnections((current) => [...current, wire]);
    setSelectedWireId(wire.id);
    setStatus(
      `⚡ ACCIDENTAL CONTACT: ${source} → ${displayPort(target)} / ${mode}`,
    );
  }

  function clearBoard() {
    setConnections([]);
    setSelectedWireId(null);
    setPendingSource(null);
    setStatus('BOARD CLEARED. THE CAMERA HAS FORGOTTEN ITS SINS.');
  }

  function exportPng() {
    const canvas = canvasRef.current;
    if (!canvas || !dimensions.width) return;

    const link = document.createElement('a');
    const stem = imageName ? imageName.replace(/\.[^.]+$/, '') : 'image';
    link.download = `${stem}-gitbent.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  function persistBends(next: SavedBend[]) {
    setSavedBends(next);
    localStorage.setItem('gitbent:bends', JSON.stringify(next));
  }

  function saveBend() {
    if (!connections.length) {
      setStatus('NOTHING TO SAVE. COMMIT A SMALL ELECTRICAL CRIME FIRST.');
      return;
    }

    const suggested = `SPECIMEN ${String(savedBends.length + 1).padStart(3, '0')}`;
    const name = window.prompt('NAME THIS BEND', suggested);
    if (!name) return;

    const bend: SavedBend = {
      id: makeId(),
      name,
      createdAt: new Date().toISOString(),
      connections,
    };

    persistBends([bend, ...savedBends]);
    setStatus(`${name.toUpperCase()} PRESERVED IN A JAR.`);
  }

  function loadBend(bend: SavedBend) {
    const restored = bend.connections.map((wire) => ({
      ...wire,
      id: makeId(),
    }));

    setConnections(restored);
    setSelectedWireId(null);
    setPendingSource(null);
    setStatus(`${bend.name.toUpperCase()} REANIMATED.`);
  }

  function deleteBend(id: string) {
    persistBends(savedBends.filter((bend) => bend.id !== id));
  }

  const sourceY = (index: number) => 34 + index * 42;
  const targetY = (index: number) => 34 + index * 42;

  return (
    <main className="app-shell">
      <header className="masthead">
        <div>
          <p className="eyebrow">VIRTUAL IMAGE INSTRUMENT // V0.1</p>
          <h1>
            git<span>BENT</span>
          </h1>
        </div>
        <p className="manifesto">
          NOT A FILTER. A CAMERA SIGNAL WITH THE BACK PANEL RIPPED OFF.
        </p>
      </header>

      <section className="workbench">
        <div className="viewer panel">
          <div className="panel-topline">
            <span>IMAGE MONITOR</span>
            <span>
              {dimensions.width
                ? `${dimensions.width}×${dimensions.height}`
                : 'NO SIGNAL'}
            </span>
          </div>

          <div className="screen">
            <canvas
              ref={canvasRef}
              className={dimensions.width ? '' : 'empty'}
            />
            {!dimensions.width && (
              <div className="empty-message">
                <strong>NO IMAGE SIGNAL</strong>
                <span>Feed the machine a JPG, PNG, or WEBP.</span>
              </div>
            )}
          </div>

          <div className="image-controls">
            <label className="button hot">
              LOAD IMAGE
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => loadImage(event.target.files?.[0])}
              />
            </label>
            <button
              className="button"
              onClick={exportPng}
              disabled={!dimensions.width}
            >
              EXPORT PNG
            </button>
          </div>
        </div>

        <div className="patcher panel">
          <div className="panel-topline">
            <span>PATCH BAY</span>
            <span>
              {connections.length} WIRE{connections.length === 1 ? '' : 'S'}
            </span>
          </div>

          <div className="status">{status}</div>

          <svg
            className="patchboard"
            viewBox="0 0 520 330"
            role="img"
            aria-label="Circuit patch bay"
          >
            <text x="18" y="16" className="bay-heading">
              SIGNAL OUT
            </text>
            <text x="502" y="16" textAnchor="end" className="bay-heading">
              SIGNAL IN
            </text>

            {connections.map((wire) => {
              const sourceIndex = SOURCES.indexOf(wire.source);
              const targetIndex = TARGETS.indexOf(wire.target);
              const y1 = sourceY(sourceIndex);
              const y2 = targetY(targetIndex);
              const selected = wire.id === selectedWireId;

              return (
                <path
                  key={wire.id}
                  d={`M 146 ${y1} C 220 ${y1}, 300 ${y2}, 374 ${y2}`}
                  className={`patch-cable ${selected ? 'selected' : ''}`}
                  style={
                    {
                      '--wire-color': sourceColors[wire.source],
                    } as CSSProperties
                  }
                  onClick={() => setSelectedWireId(wire.id)}
                />
              );
            })}

            {SOURCES.map((source, index) => {
              const y = sourceY(index);
              return (
                <g
                  key={source}
                  className={`port source-port ${pendingSource === source ? 'armed' : ''}`}
                  onClick={() => chooseSource(source)}
                >
                  <text x="18" y={y + 5}>
                    {source}
                  </text>
                  <circle className="port-hit" cx="140" cy={y} r="16" />
                  <circle
                    className="jack"
                    cx="140"
                    cy={y}
                    r="8"
                    style={
                      {
                        '--port-color': sourceColors[source],
                      } as CSSProperties
                    }
                  />
                </g>
              );
            })}

            {TARGETS.map((target, index) => {
              const y = targetY(index);
              return (
                <g
                  key={target}
                  className="port target-port"
                  onClick={() => chooseTarget(target)}
                >
                  <circle className="port-hit" cx="380" cy={y} r="16" />
                  <circle
                    className="jack"
                    cx="380"
                    cy={y}
                    r="8"
                    style={
                      {
                        '--port-color': targetColors[target],
                      } as CSSProperties
                    }
                  />
                  <text x="502" y={y + 5} textAnchor="end">
                    {displayPort(target)}
                    {wireCountByTarget[target]
                      ? ` ×${wireCountByTarget[target]}`
                      : ''}
                  </text>
                </g>
              );
            })}
          </svg>

          <div className="chaos-row">
            <button className="button danger" onClick={lickCircuitBoard}>
              ⚡ LICK THE CIRCUIT BOARD
            </button>
            <button className="button" onClick={clearBoard}>
              CLEAR BOARD
            </button>
          </div>
        </div>
      </section>

      <section className="lower-grid">
        <div className="inspector panel">
          <div className="panel-topline">
            <span>WIRE INSPECTOR</span>
            <span>{selectedWire ? 'LIVE' : 'IDLE'}</span>
          </div>

          {selectedWire ? (
            <div className="inspector-body">
              <div className="wire-title">
                <span style={{color: sourceColors[selectedWire.source]}}>
                  {selectedWire.source}
                </span>
                <b>→</b>
                <span>{displayPort(selectedWire.target)}</span>
              </div>

              <div className="mode-row">
                {MODES.map((mode) => (
                  <button
                    key={mode}
                    className={`mode-button ${selectedWire.mode === mode ? 'active' : ''}`}
                    onClick={() => updateSelected({mode})}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <label className="slider-label">
                <span>STRENGTH</span>
                <output>{Math.round(selectedWire.strength * 100)}%</output>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={selectedWire.strength}
                  onChange={(event) =>
                    updateSelected({strength: Number(event.target.value)})
                  }
                />
              </label>

              <p className="mode-help">
                {selectedWire.mode === 'PATCH' &&
                  'Signal politely modulates the destination.'}
                {selectedWire.mode === 'BRIDGE' &&
                  'Signals contaminate each other around their midpoint.'}
                {selectedWire.mode === 'SHORT' &&
                  'The source aggressively takes over the destination.'}
              </p>

              <button
                className="button danger ghost"
                onClick={removeSelected}
              >
                YANK THIS WIRE
              </button>
            </div>
          ) : (
            <div className="idle-card">
              <strong>NO WIRE SELECTED</strong>
              <span>Tap any glowing cable to alter the damage.</span>
            </div>
          )}
        </div>

        <div className="specimens panel">
          <div className="panel-topline">
            <span>SPECIMEN JARS</span>
            <span>{savedBends.length} SAVED</span>
          </div>

          <div className="specimen-actions">
            <button className="button hot" onClick={saveBend}>
              SAVE CURRENT BEND
            </button>
          </div>

          <div className="specimen-list">
            {!savedBends.length && (
              <div className="idle-card">
                <strong>EMPTY SHELF</strong>
                <span>Saved bends live in this browser for now.</span>
              </div>
            )}

            {savedBends.map((bend) => (
              <article className="specimen" key={bend.id}>
                <button
                  className="specimen-main"
                  onClick={() => loadBend(bend)}
                >
                  <strong>{bend.name}</strong>
                  <span>
                    {bend.connections.length} wire
                    {bend.connections.length === 1 ? '' : 's'}
                  </span>
                </button>
                <button
                  className="delete"
                  onClick={() => deleteBend(bend.id)}
                  aria-label={`Delete ${bend.name}`}
                >
                  ×
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer>
        <span>THE MACHINE IS ALLOWED TO BE WRONG.</span>
        <span>gitBENT // SIGNAL GRAPH PROTOTYPE</span>
      </footer>
    </main>
  );
}
