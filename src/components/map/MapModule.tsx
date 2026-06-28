// src/components/map/MapModule.tsx
// Fantasy map editor using React Konva

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Stage, Layer, Line, Rect, Ellipse, Text, Circle } from "react-konva";
import {
  Pencil, Square, Circle as CircleIcon, Type, Eraser,
  Layers, Plus, Save, Trash2, MapPin, Eye, EyeOff, Lock, Unlock,
  MousePointer, ZoomIn, ZoomOut
} from "lucide-react";
import { useAppStore } from "@/store";
import { mapsDb } from "@/lib/db";
import type { WorldMap, MapCanvas, MapLayer, KonvaObject } from "@/types";

type Tool = "select" | "pencil" | "rect" | "ellipse" | "text" | "eraser" | "pin";

const CANVAS_W = 3000;
const CANVAS_H = 1800;

export default function MapModule() {
  const { activeWorld } = useAppStore();
  const [maps, setMaps] = useState<WorldMap[]>([]);
  const [activeMap, setActiveMap] = useState<WorldMap | null>(null);
  const [canvas, setCanvas] = useState<MapCanvas>({
    layers: [{ id: "base", name: "Base", visible: true, locked: false, objects: [] }],
    viewport: { x: 0, y: 0, scale: 0.5 },
    width: CANVAS_W,
    height: CANVAS_H,
  });

  // Drawing state
  const [tool, setTool] = useState<Tool>("pencil");
  const [color, setColor] = useState("#4a8c5c");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [activeLayerId, setActiveLayerId] = useState("base");
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentLine, setCurrentLine] = useState<number[]>([]);
  const stageRef = useRef<any>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  const TOOL_COLORS = [
    "#4a8c5c", "#c4933f", "#3d7ab5", "#8b6fad",
    "#c0392b", "#e8dcc8", "#2e2a24", "#ffffff",
  ];

  useEffect(() => {
    if (activeWorld) loadMaps();
  }, [activeWorld?.id]);

  async function loadMaps() {
    if (!activeWorld) return;
    const list = await mapsDb.getAll(activeWorld.id);
    setMaps(list);
    if (list.length > 0) loadMap(list[0]);
  }

  function loadMap(map: WorldMap) {
    setActiveMap(map);
    try {
      const c = JSON.parse(map.canvas_json) as MapCanvas;
      setCanvas(c);
      setActiveLayerId(c.layers[0]?.id ?? "base");
    } catch {}
  }

  async function createMap() {
    if (!activeWorld) return;
    const id = await mapsDb.create(activeWorld.id, `Map ${maps.length + 1}`);
    const map = await mapsDb.get(id);
    if (map) {
      setMaps(prev => [...prev, map]);
      loadMap(map);
    }
  }

  const scheduleSave = useCallback((c: MapCanvas) => {
    if (!activeMap) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await mapsDb.save(activeMap.id, JSON.stringify(c));
    }, 1500);
  }, [activeMap]);

  function getActiveLayer(): MapLayer | undefined {
    return canvas.layers.find(l => l.id === activeLayerId);
  }

  function updateCanvas(updater: (c: MapCanvas) => MapCanvas) {
    setCanvas(prev => {
      const next = updater(prev);
      scheduleSave(next);
      return next;
    });
  }

  // ── Stage events ──
  function handleMouseDown(e: any) {
    if (tool === "select") return;
    const layer = getActiveLayer();
    if (!layer || layer.locked) return;

    const pos = e.target.getStage().getPointerPosition();
    if (!pos) return;

    const worldPos = {
      x: (pos.x - canvas.viewport.x) / canvas.viewport.scale,
      y: (pos.y - canvas.viewport.y) / canvas.viewport.scale,
    };

    if (tool === "pencil" || tool === "eraser") {
      setIsDrawing(true);
      setCurrentLine([worldPos.x, worldPos.y]);
    } else if (tool === "rect") {
      const obj: KonvaObject = {
        id: crypto.randomUUID(),
        type: "rect",
        attrs: { x: worldPos.x, y: worldPos.y, width: 100, height: 60, fill: color, opacity: 0.7 },
      };
      addObject(obj);
    } else if (tool === "ellipse") {
      const obj: KonvaObject = {
        id: crypto.randomUUID(),
        type: "ellipse",
        attrs: { x: worldPos.x, y: worldPos.y, radiusX: 60, radiusY: 40, fill: color, opacity: 0.7 },
      };
      addObject(obj);
    }
  }

  function handleMouseMove(e: any) {
    if (!isDrawing || (tool !== "pencil" && tool !== "eraser")) return;
    const pos = e.target.getStage().getPointerPosition();
    if (!pos) return;
    const worldPos = {
      x: (pos.x - canvas.viewport.x) / canvas.viewport.scale,
      y: (pos.y - canvas.viewport.y) / canvas.viewport.scale,
    };
    setCurrentLine(prev => [...prev, worldPos.x, worldPos.y]);
  }

  function handleMouseUp() {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentLine.length < 4) { setCurrentLine([]); return; }

    const obj: KonvaObject = {
      id: crypto.randomUUID(),
      type: "line",
      attrs: {
        points: currentLine,
        stroke: tool === "eraser" ? "var(--forge-bg)" : color,
        strokeWidth: tool === "eraser" ? strokeWidth * 3 : strokeWidth,
        lineCap: "round",
        lineJoin: "round",
        globalCompositeOperation: tool === "eraser" ? "destination-out" : "source-over",
      },
    };
    addObject(obj);
    setCurrentLine([]);
  }

  function addObject(obj: KonvaObject) {
    updateCanvas(c => ({
      ...c,
      layers: c.layers.map(l =>
        l.id === activeLayerId ? { ...l, objects: [...l.objects, obj] } : l
      ),
    }));
  }

  function toggleLayerVisibility(layerId: string) {
    updateCanvas(c => ({
      ...c,
      layers: c.layers.map(l => l.id === layerId ? { ...l, visible: !l.visible } : l),
    }));
  }

  function toggleLayerLock(layerId: string) {
    updateCanvas(c => ({
      ...c,
      layers: c.layers.map(l => l.id === layerId ? { ...l, locked: !l.locked } : l),
    }));
  }

  function addLayer() {
    const id = crypto.randomUUID();
    const layer: MapLayer = {
      id, name: `Layer ${canvas.layers.length + 1}`, visible: true, locked: false, objects: [],
    };
    updateCanvas(c => ({ ...c, layers: [...c.layers, layer] }));
    setActiveLayerId(id);
  }

  function clearActiveLayer() {
    if (!confirm("Clear all objects on this layer?")) return;
    updateCanvas(c => ({
      ...c,
      layers: c.layers.map(l => l.id === activeLayerId ? { ...l, objects: [] } : l),
    }));
  }

  function zoom(factor: number) {
    updateCanvas(c => ({
      ...c,
      viewport: { ...c.viewport, scale: Math.min(3, Math.max(0.1, c.viewport.scale * factor)) },
    }));
  }

  const TOOLS: { id: Tool; icon: React.ReactNode; label: string }[] = [
    { id: "select",  icon: <MousePointer size={15} />, label: "Select" },
    { id: "pencil",  icon: <Pencil size={15} />, label: "Draw" },
    { id: "eraser",  icon: <Eraser size={15} />, label: "Erase" },
    { id: "rect",    icon: <Square size={15} />, label: "Rectangle" },
    { id: "ellipse", icon: <CircleIcon size={15} />, label: "Ellipse" },
    { id: "text",    icon: <Type size={15} />, label: "Text" },
    { id: "pin",     icon: <MapPin size={15} />, label: "Pin" },
  ];

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Tools + Layers */}
      <div
        className="w-52 shrink-0 flex flex-col"
        style={{ background: 'var(--forge-surface)', borderRight: '1px solid var(--forge-border)' }}
      >
        {/* Map selector */}
        <div className="p-2 border-b" style={{ borderColor: 'var(--forge-border)' }}>
          <select
            className="forge-input text-xs"
            value={activeMap?.id ?? ""}
            onChange={e => {
              const m = maps.find(m => m.id === e.target.value);
              if (m) loadMap(m);
            }}
          >
            {maps.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <button onClick={createMap} className="forge-btn forge-btn-ghost text-xs w-full justify-center mt-1">
            <Plus size={12} /> New Map
          </button>
        </div>

        {/* Tool palette */}
        <div className="p-2 border-b" style={{ borderColor: 'var(--forge-border)' }}>
          <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--forge-subtle)' }}>
            Tools
          </div>
          <div className="grid grid-cols-2 gap-1">
            {TOOLS.map(t => (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                title={t.label}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors"
                style={{
                  background: tool === t.id ? 'var(--forge-muted)' : 'transparent',
                  color: tool === t.id ? 'var(--forge-accent)' : 'var(--forge-subtle)',
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Color + stroke */}
        <div className="p-2 border-b" style={{ borderColor: 'var(--forge-border)' }}>
          <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--forge-subtle)' }}>
            Color
          </div>
          <div className="grid grid-cols-4 gap-1 mb-2">
            {TOOL_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-8 h-8 rounded border-2 transition-all"
                style={{
                  background: c,
                  borderColor: color === c ? 'var(--forge-text)' : 'transparent',
                  transform: color === c ? 'scale(1.1)' : 'scale(1)',
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border"
              style={{ borderColor: 'var(--forge-border)' }}
            />
            <div className="flex-1">
              <div className="text-xs mb-1" style={{ color: 'var(--forge-subtle)' }}>Size: {strokeWidth}</div>
              <input
                type="range" min={1} max={40} value={strokeWidth}
                onChange={e => setStrokeWidth(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Layers */}
        <div className="p-2 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--forge-subtle)' }}>
              Layers
            </div>
            <button onClick={addLayer} className="forge-btn forge-btn-ghost p-0.5" title="Add layer">
              <Plus size={12} style={{ color: 'var(--forge-accent)' }} />
            </button>
          </div>
          {[...canvas.layers].reverse().map(layer => (
            <div
              key={layer.id}
              onClick={() => setActiveLayerId(layer.id)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer mb-0.5"
              style={{
                background: activeLayerId === layer.id ? 'var(--forge-muted)' : 'transparent',
                color: activeLayerId === layer.id ? 'var(--forge-accent)' : 'var(--forge-text)',
              }}
            >
              <Layers size={11} />
              <span className="text-xs flex-1 truncate">{layer.name}</span>
              <button onClick={e => { e.stopPropagation(); toggleLayerVisibility(layer.id); }}
                      className="opacity-60 hover:opacity-100">
                {layer.visible ? <Eye size={10} /> : <EyeOff size={10} />}
              </button>
              <button onClick={e => { e.stopPropagation(); toggleLayerLock(layer.id); }}
                      className="opacity-60 hover:opacity-100">
                {layer.locked ? <Lock size={10} /> : <Unlock size={10} />}
              </button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="p-2 border-t space-y-1" style={{ borderColor: 'var(--forge-border)' }}>
          <button onClick={clearActiveLayer} className="forge-btn forge-btn-ghost text-xs w-full justify-center">
            <Trash2 size={11} /> Clear Layer
          </button>
          <button onClick={() => activeMap && mapsDb.save(activeMap.id, JSON.stringify(canvas))}
                  className="forge-btn forge-btn-primary text-xs w-full justify-center">
            <Save size={11} /> Save Map
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden" style={{ background: '#0a0f0a', cursor: tool === 'pencil' ? 'crosshair' : 'default' }}>
        {/* Zoom controls */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
          <button onClick={() => zoom(1.2)} className="forge-btn forge-btn-ghost p-2 forge-panel">
            <ZoomIn size={14} />
          </button>
          <button onClick={() => zoom(0.8)} className="forge-btn forge-btn-ghost p-2 forge-panel">
            <ZoomOut size={14} />
          </button>
          <div className="text-xs text-center forge-panel px-2 py-1" style={{ color: 'var(--forge-subtle)' }}>
            {Math.round(canvas.viewport.scale * 100)}%
          </div>
        </div>

        {activeMap ? (
          <Stage
            ref={stageRef}
            width={window.innerWidth - 208}
            height={window.innerHeight - 44}
            x={canvas.viewport.x}
            y={canvas.viewport.y}
            scaleX={canvas.viewport.scale}
            scaleY={canvas.viewport.scale}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            draggable={tool === "select"}
            onDragEnd={e => {
              updateCanvas(c => ({
                ...c,
                viewport: { ...c.viewport, x: e.target.x(), y: e.target.y() },
              }));
            }}
            onWheel={e => {
              e.evt.preventDefault();
              const scaleBy = 1.05;
              const newScale = e.evt.deltaY < 0
                ? canvas.viewport.scale * scaleBy
                : canvas.viewport.scale / scaleBy;
              updateCanvas(c => ({
                ...c,
                viewport: { ...c.viewport, scale: Math.min(3, Math.max(0.1, newScale)) },
              }));
            }}
          >
            {/* Background */}
            <Layer>
              <Rect
                x={0} y={0}
                width={CANVAS_W} height={CANVAS_H}
                fill="#0d1a0e"
              />
              {/* Grid dots */}
              {Array.from({ length: 30 }, (_, i) =>
                Array.from({ length: 18 }, (_, j) => (
                  <Circle
                    key={`${i}-${j}`}
                    x={i * 100 + 50} y={j * 100 + 50}
                    radius={1} fill="rgba(255,255,255,0.05)"
                  />
                ))
              ).flat()}
            </Layer>

            {/* Render layers */}
            {canvas.layers.filter(l => l.visible).map(layer => (
              <Layer key={layer.id}>
                {layer.objects.map(obj => renderObject(obj))}
                {/* Current drawing line */}
                {isDrawing && activeLayerId === layer.id && currentLine.length >= 4 && (
                  <Line
                    points={currentLine}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    lineCap="round"
                    lineJoin="round"
                  />
                )}
              </Layer>
            ))}
          </Stage>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p style={{ color: 'var(--forge-subtle)' }}>Create a map to start drawing</p>
              <button onClick={createMap} className="forge-btn forge-btn-primary mt-3">
                <Plus size={14} /> New Map
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function renderObject(obj: KonvaObject): React.ReactNode {
  const key = obj.id;
  switch (obj.type) {
    case "line":
      return <Line key={key} {...(obj.attrs as any)} />;
    case "rect":
      return <Rect key={key} {...(obj.attrs as any)} />;
    case "ellipse":
      return <Ellipse key={key} {...(obj.attrs as any)} />;
    case "text":
      return <Text key={key} {...(obj.attrs as any)} />;
    default:
      return null;
  }
}
