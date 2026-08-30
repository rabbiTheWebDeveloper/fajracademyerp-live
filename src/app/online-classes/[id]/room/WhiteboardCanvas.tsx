"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Pen,
  Highlighter,
  Eraser,
  Square,
  Circle,
  Minus,
  Type,
  Undo2,
  Redo2,
  Trash2,
  Download,
  Check,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToolType = "pen" | "highlighter" | "eraser" | "line" | "rect" | "circle" | "text";

interface WhiteboardProps {
  isHost: boolean;
  onSendCommand?: (action: string, payload: any) => void;
  incomingCommand?: { action: string; payload: any; timestamp: number } | null;
  onClose?: () => void;
}

// ─── DrawCommand: lightweight history (NOT full ImageData) ────────────────────
// Storing draw commands = O(points) per entry instead of O(W×H) with ImageData.
type DrawCmd =
  | { type: "stroke"; points: { x: number; y: number }[]; color: string; lineWidth: number; alpha: number }
  | { type: "shape"; shape: "rect" | "circle" | "line"; color: string; lineWidth: number; x1: number; y1: number; x2: number; y2: number }
  | { type: "text"; text: string; x: number; y: number; color: string }
  | { type: "clear" };

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = [
  "#000000", "#ffffff", "#2563eb", "#10b981",
  "#ef4444", "#8b5cf6", "#f59e0b", "#ec4899",
];

const STROKE_SIZES = [
  { label: "Thin", size: 2 },
  { label: "Med",  size: 5 },
  { label: "Thick",size: 10 },
  { label: "XL",   size: 18 },
];

// Tools that draw continuously on move (vs shape tools that commit on pointerUp)
const FREE_TOOLS = new Set<ToolType>(["pen", "highlighter", "eraser"]);
// Max commands in undo history
const MAX_HISTORY = 60;
// Min ms between network broadcasts (≈60fps cap)
const SEND_THROTTLE_MS = 16;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Replay a single draw command onto a canvas 2D context. */
function replayCmd(ctx: CanvasRenderingContext2D, cmd: DrawCmd, dpr = 1) {
  ctx.save();
  switch (cmd.type) {
    case "stroke": {
      ctx.globalAlpha = cmd.alpha;
      ctx.strokeStyle = cmd.color;
      ctx.lineWidth = cmd.lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      for (let i = 0; i < cmd.points.length; i++) {
        const { x, y } = cmd.points[i];
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      break;
    }
    case "shape": {
      ctx.strokeStyle = cmd.color;
      ctx.lineWidth = cmd.lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (cmd.shape === "line") {
        ctx.beginPath();
        ctx.moveTo(cmd.x1, cmd.y1);
        ctx.lineTo(cmd.x2, cmd.y2);
        ctx.stroke();
      } else if (cmd.shape === "rect") {
        ctx.strokeRect(cmd.x1, cmd.y1, cmd.x2 - cmd.x1, cmd.y2 - cmd.y1);
      } else if (cmd.shape === "circle") {
        const dx = cmd.x2 - cmd.x1, dy = cmd.y2 - cmd.y1;
        ctx.beginPath();
        ctx.arc(cmd.x1, cmd.y1, Math.sqrt(dx * dx + dy * dy), 0, 2 * Math.PI);
        ctx.stroke();
      }
      break;
    }
    case "text": {
      ctx.font = "bold 16px Inter, sans-serif";
      ctx.fillStyle = cmd.color;
      ctx.fillText(cmd.text, cmd.x, cmd.y);
      break;
    }
    case "clear": {
      const w = ctx.canvas.width / dpr;
      const h = ctx.canvas.height / dpr;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      break;
    }
  }
  ctx.restore();
}

/** Full redraw from command list — used after undo/resize. */
function fullRedraw(ctx: CanvasRenderingContext2D, cmds: DrawCmd[], upTo: number, dpr = 1) {
  const w = ctx.canvas.width / dpr;
  const h = ctx.canvas.height / dpr;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i <= upTo && i < cmds.length; i++) {
    replayCmd(ctx, cmds[i], dpr);
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function WhiteboardCanvas({ isHost, onSendCommand, incomingCommand, onClose }: WhiteboardProps) {
  // Two canvas refs: base (committed) + overlay (live shape preview)
  const baseCanvasRef    = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef     = useRef<HTMLDivElement | null>(null);

  // Cached contexts — avoid getContext() on every frame
  const baseCtxRef    = useRef<CanvasRenderingContext2D | null>(null);
  const overlayCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  // Cached bounding rect — avoid getBoundingClientRect() on every pointer event
  const rectCacheRef = useRef<DOMRect | null>(null);
  const dprRef       = useRef(1);

  // Command-based undo/redo — O(n_points) per entry vs O(W×H) with ImageData
  const historyRef      = useRef<DrawCmd[]>([{ type: "clear" }]);
  const historyIndexRef = useRef<number>(0);

  // Active freehand stroke accumulator
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);

  // Network send throttle
  const lastSendRef = useRef<number>(0);
  // rAF handle for overlay preview
  const rafRef = useRef<number | null>(null);

  // Shape draw in-progress start pos (ref to avoid stale closure in rAF)
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const [tool, setTool]              = useState<ToolType>("pen");
  const [color, setColor]            = useState("#2563eb");
  const [strokeWidth, setStrokeWidth]= useState(3);
  const [isDrawing, setIsDrawing]    = useState(false);
  const [startPos, setStartPos]      = useState<{ x: number; y: number } | null>(null);
  const [textInput, setTextInput]    = useState<{ x: number; y: number; text: string } | null>(null);

  // Keep ref in sync with state for rAF callbacks
  useEffect(() => { startPosRef.current = startPos; }, [startPos]);

  // ── Canvas setup / resize ────────────────────────────────────────────────

  const setupCanvas = useCallback(() => {
    const base    = baseCanvasRef.current;
    const overlay = overlayCanvasRef.current;
    const container = containerRef.current;
    if (!base || !overlay || !container) return;

    const dpr  = window.devicePixelRatio || 1;
    dprRef.current = dpr;
    const rect = container.getBoundingClientRect();
    rectCacheRef.current = rect;

    [base, overlay].forEach((c) => {
      c.width  = rect.width  * dpr;
      c.height = rect.height * dpr;
      c.style.width  = `${rect.width}px`;
      c.style.height = `${rect.height}px`;
    });

    const bCtx = base.getContext("2d");
    const oCtx = overlay.getContext("2d");
    if (!bCtx || !oCtx) return;

    [bCtx, oCtx].forEach((ctx) => {
      ctx.scale(dpr, dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    });

    baseCtxRef.current    = bCtx;
    overlayCtxRef.current = oCtx;

    // Replay history onto fresh canvas
    fullRedraw(bCtx, historyRef.current, historyIndexRef.current, dpr);
  }, []);

  useEffect(() => {
    setupCanvas();
    const observer = new ResizeObserver(() => {
      rectCacheRef.current = null;
      setupCanvas();
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [setupCanvas]);

  // ── Incoming peer commands ───────────────────────────────────────────────

  useEffect(() => {
    if (!incomingCommand) return;
    const { action, payload } = incomingCommand;
    const ctx = baseCtxRef.current;
    if (!ctx) return;

    let cmd: DrawCmd | null = null;

    if (action === "DRAW_STROKE") {
      cmd = {
        type: "stroke",
        points: [{ x: payload.fromX, y: payload.fromY }, { x: payload.toX, y: payload.toY }],
        color: payload.tool === "eraser" ? "#ffffff" : payload.color,
        lineWidth: payload.strokeWidth,
        alpha: payload.tool === "highlighter" ? 0.4 : 1.0,
      };
    } else if (action === "DRAW_SHAPE") {
      const s = payload.type as "rect" | "circle" | "line";
      cmd = {
        type: "shape", shape: s,
        color: payload.color, lineWidth: payload.strokeWidth,
        x1: s === "line" ? payload.x1 : payload.x,
        y1: s === "line" ? payload.y1 : payload.y,
        x2: s === "line" ? payload.x2 : (payload.x + (payload.w ?? 0)),
        y2: s === "line" ? payload.y2 : (payload.y + (payload.h ?? 0)),
      };
    } else if (action === "ADD_TEXT") {
      cmd = { type: "text", text: payload.text, x: payload.x, y: payload.y, color: payload.color };
    } else if (action === "CLEAR_BOARD") {
      cmd = { type: "clear" };
    }

    if (!cmd) return;
    commitCmd(cmd);
    replayCmd(ctx, cmd, dprRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingCommand]);

  // ── History helpers ──────────────────────────────────────────────────────

  function commitCmd(cmd: DrawCmd) {
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(cmd);
    if (historyRef.current.length > MAX_HISTORY + 1) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current += 1;
    }
  }

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const ctx = baseCtxRef.current;
    if (ctx) fullRedraw(ctx, historyRef.current, historyIndexRef.current, dprRef.current);
  }, []);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const ctx = baseCtxRef.current;
    if (ctx) replayCmd(ctx, historyRef.current[historyIndexRef.current], dprRef.current);
  }, []);

  // ── Coordinate helper — uses cached rect ────────────────────────────────

  const getPos = useCallback((e: React.PointerEvent): { x: number; y: number } => {
    const rect = rectCacheRef.current
      ?? (rectCacheRef.current = baseCanvasRef.current!.getBoundingClientRect());
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  // ── Overlay shape preview ────────────────────────────────────────────────

  const clearOverlay = useCallback(() => {
    const ctx = overlayCtxRef.current;
    if (!ctx) return;
    const dpr = dprRef.current;
    ctx.clearRect(0, 0, ctx.canvas.width / dpr, ctx.canvas.height / dpr);
  }, []);

  const drawPreview = useCallback((from: { x: number; y: number }, to: { x: number; y: number }, t: ToolType, c: string, sw: number) => {
    const ctx = overlayCtxRef.current;
    if (!ctx) return;
    const dpr = dprRef.current;
    ctx.clearRect(0, 0, ctx.canvas.width / dpr, ctx.canvas.height / dpr);
    ctx.save();
    ctx.strokeStyle = c;
    ctx.lineWidth = sw;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.setLineDash([6, 4]);
    if (t === "line") {
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
    } else if (t === "rect") {
      ctx.strokeRect(from.x, from.y, to.x - from.x, to.y - from.y);
    } else if (t === "circle") {
      const dx = to.x - from.x, dy = to.y - from.y;
      ctx.beginPath(); ctx.arc(from.x, from.y, Math.sqrt(dx * dx + dy * dy), 0, 2 * Math.PI); ctx.stroke();
    }
    ctx.restore();
  }, []);

  // ── Pointer events ───────────────────────────────────────────────────────

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    const pos = getPos(e);

    if (tool === "text") {
      setTextInput({ x: pos.x, y: pos.y, text: "" });
      return;
    }

    setIsDrawing(true);
    setStartPos(pos);
    currentStrokeRef.current = [pos];

    if (FREE_TOOLS.has(tool)) {
      const ctx = baseCtxRef.current;
      if (!ctx) return;
      ctx.save();
      ctx.globalAlpha = tool === "highlighter" ? 0.35 : 1.0;
      ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
      ctx.lineWidth   = tool === "highlighter" ? strokeWidth * 2.5 : tool === "eraser" ? strokeWidth * 3 : strokeWidth;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  }, [tool, color, strokeWidth, getPos]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pos = getPos(e);

    if (FREE_TOOLS.has(tool)) {
      const ctx = baseCtxRef.current;
      if (!ctx) return;
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      currentStrokeRef.current.push(pos);

      // Throttled broadcast — max 60fps
      const now = performance.now();
      if (now - lastSendRef.current >= SEND_THROTTLE_MS) {
        lastSendRef.current = now;
        const pts = currentStrokeRef.current;
        const prev = pts[pts.length - 2];
        if (prev) {
          onSendCommand?.("DRAW_STROKE", {
            fromX: prev.x, fromY: prev.y, toX: pos.x, toY: pos.y,
            color,
            strokeWidth: tool === "highlighter" ? strokeWidth * 2.5 : tool === "eraser" ? strokeWidth * 3 : strokeWidth,
            tool,
          });
        }
      }
    } else {
      // Shape preview via rAF — prevents layout thrash from multiple moves per frame
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      const from = startPosRef.current;
      const snap = { ...pos };
      const snapTool = tool;
      const snapColor = color;
      const snapSW = strokeWidth;
      rafRef.current = requestAnimationFrame(() => {
        if (from) drawPreview(from, snap, snapTool, snapColor, snapSW);
        rafRef.current = null;
      });
    }
  }, [isDrawing, tool, color, strokeWidth, getPos, drawPreview, onSendCommand]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    clearOverlay();
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }

    const ctx = baseCtxRef.current;
    const from = startPosRef.current;
    if (!ctx || !from) { setStartPos(null); return; }

    const pos = getPos(e);

    if (FREE_TOOLS.has(tool)) {
      ctx.restore(); // end save block
      const pts = [...currentStrokeRef.current];
      commitCmd({
        type: "stroke", points: pts,
        color: tool === "eraser" ? "#ffffff" : color,
        lineWidth: tool === "highlighter" ? strokeWidth * 2.5 : tool === "eraser" ? strokeWidth * 3 : strokeWidth,
        alpha: tool === "highlighter" ? 0.35 : 1.0,
      });
      currentStrokeRef.current = [];
    } else if (tool === "line" || tool === "rect" || tool === "circle") {
      const shpTool = tool as "line" | "rect" | "circle";
      const cmd: DrawCmd = {
        type: "shape", shape: shpTool,
        color, lineWidth: strokeWidth,
        x1: from.x, y1: from.y, x2: pos.x, y2: pos.y,
      };
      replayCmd(ctx, cmd, dprRef.current);
      commitCmd(cmd);

      const payload: any = { type: shpTool, color, strokeWidth };
      if (shpTool === "line") {
        Object.assign(payload, { x1: from.x, y1: from.y, x2: pos.x, y2: pos.y });
      } else {
        Object.assign(payload, { x: from.x, y: from.y, w: pos.x - from.x, h: pos.y - from.y });
      }
      onSendCommand?.("DRAW_SHAPE", payload);
    }

    setStartPos(null);
  }, [isDrawing, tool, color, strokeWidth, getPos, clearOverlay, onSendCommand]);

  // ── Text annotation ──────────────────────────────────────────────────────

  const handleTextSubmit = useCallback(() => {
    if (!textInput?.text.trim()) { setTextInput(null); return; }
    const ctx = baseCtxRef.current;
    if (!ctx) return;
    const cmd: DrawCmd = { type: "text", text: textInput.text, x: textInput.x, y: textInput.y, color };
    replayCmd(ctx, cmd, dprRef.current);
    commitCmd(cmd);
    onSendCommand?.("ADD_TEXT", { text: textInput.text, x: textInput.x, y: textInput.y, color });
    setTextInput(null);
  }, [textInput, color, onSendCommand]);

  // ── Clear & Download ─────────────────────────────────────────────────────

  const handleClear = useCallback(() => {
    if (!confirm("Clear entire whiteboard?")) return;
    const ctx = baseCtxRef.current;
    if (!ctx) return;
    const cmd: DrawCmd = { type: "clear" };
    commitCmd(cmd);
    replayCmd(ctx, cmd, dprRef.current);
    onSendCommand?.("CLEAR_BOARD", {});
  }, [onSendCommand]);

  const handleDownload = useCallback(() => {
    const canvas = baseCanvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `fajr-whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  const cursorStyle = tool === "eraser" ? "cell" : tool === "text" ? "text" : "crosshair";

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col select-none border border-slate-700/60"
    >
      {/* ─── Floating Top Toolbar ─────────────────────────────────────────── */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 px-3 py-2 rounded-2xl shadow-2xl flex items-center gap-1.5 sm:gap-2.5 max-w-[95vw] overflow-x-auto text-slate-100">
        {/* Drawing tools */}
        {(
          [
            { id: "pen"         as ToolType, icon: <Pen className="w-4 h-4" />,         title: "Pen" },
            { id: "highlighter" as ToolType, icon: <Highlighter className="w-4 h-4" />, title: "Highlighter" },
            { id: "eraser"      as ToolType, icon: <Eraser className="w-4 h-4" />,      title: "Eraser" },
            { id: "line"        as ToolType, icon: <Minus className="w-4 h-4" />,       title: "Line" },
            { id: "rect"        as ToolType, icon: <Square className="w-4 h-4" />,      title: "Rectangle" },
            { id: "circle"      as ToolType, icon: <Circle className="w-4 h-4" />,      title: "Circle" },
            { id: "text"        as ToolType, icon: <Type className="w-4 h-4" />,        title: "Text" },
          ]
        ).map(({ id, icon, title }) => (
          <button
            key={id}
            onClick={() => setTool(id)}
            title={title}
            className={`p-2 rounded-xl transition-all ${
              tool === id
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            {icon}
          </button>
        ))}

        <div className="w-px h-5 bg-slate-700/80 mx-1" />

        {/* Color palette */}
        <div className="flex items-center gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-5 h-5 rounded-full border-2 transition-transform ${
                color === c ? "scale-125 border-blue-400" : "border-slate-600 hover:scale-110"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <div className="w-px h-5 bg-slate-700/80 mx-1" />

        {/* Stroke sizes */}
        <div className="flex items-center gap-1">
          {STROKE_SIZES.map((s) => (
            <button
              key={s.size}
              onClick={() => setStrokeWidth(s.size)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                strokeWidth === s.size
                  ? "bg-slate-700 text-blue-400 border border-blue-500/50"
                  : "text-slate-400 hover:bg-slate-800"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-slate-700/80 mx-1" />

        <button onClick={handleUndo} className="p-2 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors" title="Undo">
          <Undo2 className="w-4 h-4" />
        </button>
        <button onClick={handleRedo} className="p-2 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors" title="Redo">
          <Redo2 className="w-4 h-4" />
        </button>
        <button onClick={handleClear} className="p-2 rounded-xl text-rose-400 hover:bg-rose-950/40 transition-colors" title="Clear Board">
          <Trash2 className="w-4 h-4" />
        </button>
        <button onClick={handleDownload} className="p-2 rounded-xl text-emerald-400 hover:bg-emerald-950/40 transition-colors" title="Download PNG">
          <Download className="w-4 h-4" />
        </button>

        {onClose && (
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1" title="Close Whiteboard">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ─── Dual Canvas Stack ────────────────────────────────────────────── */}
      {/* Base canvas — committed / permanent strokes */}
      <canvas
        ref={baseCanvasRef}
        className="absolute inset-0 w-full h-full touch-none"
        style={{ cursor: cursorStyle }}
      />
      {/* Overlay canvas — live shape preview (all pointer events go here) */}
      <canvas
        ref={overlayCanvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="absolute inset-0 w-full h-full touch-none"
        style={{ cursor: cursorStyle }}
      />

      {/* ─── Floating Text Input ──────────────────────────────────────────── */}
      {textInput && (
        <div
          className="absolute z-40 bg-slate-900 border border-slate-700 p-2 rounded-xl shadow-2xl flex items-center gap-2"
          style={{ top: textInput.y + 10, left: textInput.x + 10 }}
        >
          <input
            type="text"
            autoFocus
            placeholder="Type text note..."
            value={textInput.text}
            onChange={(e) => setTextInput({ ...textInput, text: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTextSubmit();
              if (e.key === "Escape") setTextInput(null);
            }}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 text-white text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={handleTextSubmit} className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg">
            <Check className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
