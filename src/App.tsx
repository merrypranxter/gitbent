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

const SOURCES: SignalSource[] = [
  'RED',
  'GREEN',
  'BLUE',
  'LUMA',
  'X',
  'Y',
  'NOISE',
  'EDGE',
  'RADIUS',
  'ANGLE',
  'BLOCK_X',
  'BLOCK_Y',
  'FLOW_X',
  'FLOW_Y',
  'CELL_ID',
  'PALETTE_INDEX',
];
const TARGETS: SignalTarget[] = [
  'RED',
  'GREEN',
  'BLUE',
  'X_OFFSET',
  'Y_OFFSET',
  'SAMPLE_X',
  'SAMPLE_Y',
  'THRESHOLD',
  'POSTERIZE',
  'HUE_SHIFT',
  'SATURATION',
  'BIT_DEPTH',
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
  EDGE: '#ffffff',
  RADIUS: '#ff4ecf',
  ANGLE: '#5ef7ff',
  BLOCK_X: '#ff8f3f',
  BLOCK_Y: '#ffe95e',
  FLOW_X: '#87ff5e',
  FLOW_Y: '#a977ff',
  CELL_ID: '#ff5e7d',
  PALETTE_INDEX: '#ff66ff',
};

const targetColors: Record<SignalTarget, string> = {
  RED: '#ff355e',
  GREEN: '#74ff66',
  BLUE: '#3fd5ff',
  X_OFFSET: '#ff70e8',
  Y_OFFSET: '#b69cff',
  SAMPLE_X: '#ff4ecf',
  SAMPLE_Y: '#5ef7ff',
  THRESHOLD: '#f8ff8d',
  POSTERIZE: '#ff9f43',
  HUE_SHIFT: '#ff66ff',
  SATURATION: '#87ff5e',
  BIT_DEPTH: '#ffffff',
};

type SourceMode = 'image' | 'camera';
type CameraFacing = 'user' | 'environment';

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

function cloneConnections(list: Connection[]) {
  return list.map((wire) => ({...wire}));
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sourceDataRef = useRef<ImageData | null>(null);
  const imageDimensionsRef = useRef({width: 0, height: 0});
  const liveBufferRef = useRef<HTMLCanvasElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraRunningRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const lastLiveFrameRef = useRef(0);
  const connectionsRef = useRef<Connection[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [dimensions, setDimensions] = useState({width: 0, height: 0});
  const [sourceMode, setSourceMode] = useState<SourceMode>('image');
  const [cameraFacing, setCameraFacing] = useState<CameraFacing>('environment');
  const [cameraActive, setCameraActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [imageName, setImageName] = useState('');
  const [pendingSource, setPendingSource] = useState<SignalSource | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [undoStack, setUndoStack] = useState<Connection[][]>([]);
  const [redoStack, setRedoStack] = useState<Connection[][]>([]);
  const sliderStartRef = useRef<Connection[] | null>(null);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const [status, setStatus] = useState(
    'LOAD AN IMAGE. THEN TOUCH A SOURCE JACK AND A TARGET JACK.',
  );
  const [savedBends, setSavedBends] = useState<SavedBend[]>(readSavedBends);

  const selectedWire =
    connections.find((wire) => wire.id === selectedWireId) ?? null;

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  useEffect(() => {
    connectionsRef.current = connections;
  }, [connections]);

  useEffect(() => {
    if (
      sourceMode !== 'image' ||
      !sourceDataRef.current ||
      !dimensions.width ||
      !dimensions.height
    ) {
      return;
    }

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
  }, [connections, dimensions, sourceMode]);

  useEffect(() => {
    return () => {
      cameraRunningRef.current = false;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const wireCountByTarget = useMemo(() => {
    const counts: Partial<Record<SignalTarget, number>> = {};
    for (const wire of connections) {
      counts[wire.target] = (counts[wire.target] ?? 0) + 1;
    }
    return counts;
  }, [connections]);

  function stopCameraHardware() {
    cameraRunningRef.current = false;

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
  }

  function stopCamera() {
    if (isRecording) stopRecording();
    stopCameraHardware();
    setCameraActive(false);

    if (sourceDataRef.current && imageDimensionsRef.current.width) {
      setSourceMode('image');
      setDimensions(imageDimensionsRef.current);
      setStatus('LIVE CAMERA OFF. STILL IMAGE LAB RESTORED.');
    } else {
      setDimensions({width: 0, height: 0});
      setStatus('LIVE CAMERA OFF. NO STILL IMAGE LOADED.');
    }
  }

  async function startCamera(facing: CameraFacing = cameraFacing) {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('THIS BROWSER WILL NOT HAND OVER A CAMERA STREAM.');
      return;
    }

    if (isRecording) stopRecording();
    stopCameraHardware();
    setStatus('ASKING THE CAMERA TO EXPOSE ITS NERVOUS SYSTEM...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {ideal: facing},
          width: {ideal: 1280},
          height: {ideal: 720},
        },
        audio: false,
      });

      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      cameraStreamRef.current = stream;
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;

      await new Promise<void>((resolve) => {
        if (video.readyState >= 1 && video.videoWidth) {
          resolve();
          return;
        }

        const handleMetadata = () => {
          video.removeEventListener('loadedmetadata', handleMetadata);
          resolve();
        };
        video.addEventListener('loadedmetadata', handleMetadata);
      });

      await video.play();

      const maxLiveDimension = 480;
      const scale = Math.min(
        1,
        maxLiveDimension / Math.max(video.videoWidth, video.videoHeight),
      );
      const width = Math.max(2, Math.round((video.videoWidth * scale) / 2) * 2);
      const height = Math.max(2, Math.round((video.videoHeight * scale) / 2) * 2);

      let buffer = liveBufferRef.current;
      if (!buffer) {
        buffer = document.createElement('canvas');
        liveBufferRef.current = buffer;
      }
      buffer.width = width;
      buffer.height = height;

      const bufferContext = buffer.getContext('2d', {willReadFrequently: true});
      const outputCanvas = canvasRef.current;
      const outputContext = outputCanvas?.getContext('2d');

      if (!bufferContext || !outputCanvas || !outputContext) {
        throw new Error('Canvas context unavailable');
      }

      outputCanvas.width = width;
      outputCanvas.height = height;

      setSourceMode('camera');
      setCameraFacing(facing);
      setCameraActive(true);
      setDimensions({width, height});
      setImageName('');
      setStatus(
        `LIVE CAMERA HOT // ${facing === 'environment' ? 'REAR' : 'FRONT'} // CPU LAB MODE`,
      );

      cameraRunningRef.current = true;
      lastLiveFrameRef.current = 0;
      const liveFrameInterval = 1000 / 15;

      const renderLiveFrame = (timestamp: number) => {
        if (!cameraRunningRef.current) return;

        if (
          timestamp - lastLiveFrameRef.current >= liveFrameInterval &&
          video.readyState >= 2
        ) {
          lastLiveFrameRef.current = timestamp;
          bufferContext.drawImage(video, 0, 0, width, height);
          const rawFrame = bufferContext.getImageData(0, 0, width, height);
          const bentFrame = bendImage(
            rawFrame,
            width,
            height,
            connectionsRef.current,
          );
          outputContext.putImageData(bentFrame, 0, 0);
        }

        animationFrameRef.current = requestAnimationFrame(renderLiveFrame);
      };

      animationFrameRef.current = requestAnimationFrame(renderLiveFrame);
    } catch (error) {
      stopCameraHardware();
      setCameraActive(false);
      const message =
        error instanceof Error ? error.message : 'unknown camera failure';
      setStatus(`CAMERA REFUSED THE PROCEDURE: ${message.toUpperCase()}`);
    }
  }

  async function flipCamera() {
    const nextFacing: CameraFacing =
      cameraFacing === 'environment' ? 'user' : 'environment';
    await startCamera(nextFacing);
  }

  function preferredRecordingMimeType() {
    if (typeof MediaRecorder === 'undefined') return '';

    const candidates = [
      'video/mp4;codecs=avc1.42E01E',
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];

    return (
      candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
    );
  }

  function startRecording() {
    const canvas = canvasRef.current;

    if (!cameraActive || !canvas) {
      setStatus('TURN ON THE LIVE CAMERA BEFORE RECORDING IT.');
      return;
    }

    if (
      typeof MediaRecorder === 'undefined' ||
      typeof canvas.captureStream !== 'function'
    ) {
      setStatus('THIS BROWSER CANNOT RECORD THE PROCESSED CANVAS YET.');
      return;
    }

    try {
      const stream = canvas.captureStream(15);
      const mimeType = preferredRecordingMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, {mimeType})
        : new MediaRecorder(stream);

      recordedChunksRef.current = [];
      recordingStreamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size) recordedChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const finalType = recorder.mimeType || mimeType || 'video/webm';
        const blob = new Blob(recordedChunksRef.current, {type: finalType});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const extension = finalType.includes('mp4') ? 'mp4' : 'webm';
        link.download = `gitbent-live-${Date.now()}.${extension}`;
        link.href = url;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        mediaRecorderRef.current = null;
        recordedChunksRef.current = [];
        setIsRecording(false);
        setStatus('VIDEO CAPTURED FROM THE BENT OUTPUT.');
      };

      recorder.start(250);
      setIsRecording(true);
      setStatus('● RECORDING THE PROCESSED SIGNAL.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'unknown recorder failure';
      setStatus(`RECORDER FAILED: ${message.toUpperCase()}`);
    }
  }

  function loadImage(file?: File) {
    if (!file) return;

    if (isRecording) stopRecording();
    stopCameraHardware();
    setCameraActive(false);
    setSourceMode('image');

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
      imageDimensionsRef.current = {width, height};

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

  function commitConnections(
    next: Connection[],
    nextStatus?: string,
    keepSelectedWireId?: string | null,
  ) {
    setUndoStack((past) => [...past, cloneConnections(connections)]);
    setRedoStack([]);
    setConnections(cloneConnections(next));
    setSelectedWireId(keepSelectedWireId ?? null);
    setPendingSource(null);

    if (nextStatus) setStatus(nextStatus);
  }

  function undo() {
    if (!undoStack.length) return;

    const previous = undoStack[undoStack.length - 1];
    setUndoStack((past) => past.slice(0, -1));
    setRedoStack((future) => [...future, cloneConnections(connections)]);
    setConnections(cloneConnections(previous));
    setSelectedWireId(null);
    setPendingSource(null);
    sliderStartRef.current = null;
    setStatus('UNDID THE LAST ELECTRICAL MISTAKE.');
  }

  function redo() {
    if (!redoStack.length) return;

    const next = redoStack[redoStack.length - 1];
    setRedoStack((future) => future.slice(0, -1));
    setUndoStack((past) => [...past, cloneConnections(connections)]);
    setConnections(cloneConnections(next));
    setSelectedWireId(null);
    setPendingSource(null);
    sliderStartRef.current = null;
    setStatus('REDID THE DAMAGE.');
  }

  function beginWireAdjustment() {
    if (!sliderStartRef.current) {
      sliderStartRef.current = cloneConnections(connections);
    }
  }

  function finishWireAdjustment() {
    const before = sliderStartRef.current;
    sliderStartRef.current = null;
    if (!before) return;

    setUndoStack((past) => [...past, before]);
    setRedoStack([]);
    setStatus('WIRE TWEAKED.');
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

    commitConnections(
      [...connections, wire],
      `${wire.source} → ${displayPort(wire.target)} CONNECTED.`,
      wire.id,
    );
  }

  function updateSelected(patch: Partial<Connection>, recordHistory = true) {
    if (!selectedWireId) return;

    const next = connections.map((wire) =>
      wire.id === selectedWireId ? {...wire, ...patch} : wire,
    );

    if (recordHistory) {
      commitConnections(next, 'WIRE TWEAKED.', selectedWireId);
    } else {
      setConnections(next);
    }
  }

  function removeSelected() {
    if (!selectedWireId) return;

    commitConnections(
      connections.filter((wire) => wire.id !== selectedWireId),
      'WIRE YANKED OUT.',
    );
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

    commitConnections(
      [...connections, wire],
      `⚡ ACCIDENTAL CONTACT: ${source} → ${displayPort(target)} / ${mode}`,
      wire.id,
    );
  }

  function clearBoard() {
    if (!connections.length) return;
    commitConnections(
      [],
      'BOARD CLEARED. THE CAMERA HAS FORGOTTEN ITS SINS.',
    );
  }

  function exportPng() {
    const canvas = canvasRef.current;
    if (!canvas || !dimensions.width) return;

    const link = document.createElement('a');
    const stem =
      sourceMode === 'camera'
        ? `gitbent-live-${Date.now()}`
        : imageName
          ? imageName.replace(/\.[^.]+$/, '')
          : 'image';
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

    commitConnections(
      restored,
      `${bend.name.toUpperCase()} REANIMATED.`,
    );
  }

  function deleteBend(id: string) {
    persistBends(savedBends.filter((bend) => bend.id !== id));
  }

  const portSpacing = 32;
  const sourceY = (index: number) => 34 + index * portSpacing;
  const targetY = (index: number) => 34 + index * portSpacing;
  const patchboardHeight =
    58 + Math.max(SOURCES.length, TARGETS.length) * portSpacing;

  return (
    <main className="app-shell">
      <header className="masthead">
        <div>
          <p className="eyebrow">IMPOSSIBLE IMAGE INSTRUMENT // V0.3 LIVE LAB</p>
          <h1>
            git<span>BENT</span>
          </h1>
        </div>
        <p className="manifesto">
          PHYSICAL + IMPOSSIBLE SIGNALS. CROSS WIRES REAL CAMERAS DO NOT HAVE.
        </p>
      </header>

      <section className="workbench">
        <div className="viewer panel">
          <div className="panel-topline">
            <span>{sourceMode === 'camera' ? 'LIVE BENT CAMERA' : 'IMAGE MONITOR'}</span>
            <span>
              {dimensions.width
                ? `${dimensions.width}×${dimensions.height}`
                : 'NO SIGNAL'}
            </span>
          </div>

          <div className="screen">
            <video ref={videoRef} className="camera-feed" playsInline muted />
            <canvas
              ref={canvasRef}
              className={dimensions.width ? '' : 'empty'}
            />
            {!dimensions.width && (
              <div className="empty-message">
                <strong>NO IMAGE SIGNAL</strong>
                <span>Load a still image or turn on the live camera.</span>
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

            {!cameraActive ? (
              <button className="button hot" onClick={() => startCamera()}>
                START LIVE CAMERA
              </button>
            ) : (
              <>
                <button className="button" onClick={flipCamera}>
                  FLIP CAMERA
                </button>
                <button className="button" onClick={stopCamera}>
                  STOP CAMERA
                </button>
              </>
            )}

            <button
              className="button"
              onClick={exportPng}
              disabled={!dimensions.width}
            >
              CAPTURE PNG
            </button>

            {cameraActive &&
              (!isRecording ? (
                <button className="button record" onClick={startRecording}>
                  ● RECORD VIDEO
                </button>
              ) : (
                <button className="button recording" onClick={stopRecording}>
                  ■ STOP RECORDING
                </button>
              ))}
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
            viewBox={`0 0 520 ${patchboardHeight}`}
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
            <button className="button" onClick={undo} disabled={!canUndo}>
              ↶ UNDO
            </button>
            <button className="button" onClick={redo} disabled={!canRedo}>
              ↷ REDO
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
                  onPointerDown={beginWireAdjustment}
                  onKeyDown={beginWireAdjustment}
                  onChange={(event) =>
                    updateSelected(
                      {strength: Number(event.target.value)},
                      false,
                    )
                  }
                  onPointerUp={finishWireAdjustment}
                  onPointerCancel={finishWireAdjustment}
                  onKeyUp={finishWireAdjustment}
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
