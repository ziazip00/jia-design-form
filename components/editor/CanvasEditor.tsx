import { useEffect, useRef, useState, useCallback } from "react";
import { Stage, Layer, Rect, Group, Transformer, Line, Path as KonvaPath } from "react-konva";
import Konva from "konva";
import { useEditorStore } from "@/store/editorStore";
import { LayerNode } from "./LayerNodes";
import { fitText, autoTextSize } from "@/lib/textSizing";
import { useFontStore } from "@/store/fontStore";
import { makeLayer, uniqueName } from "@/lib/designParser";
import type { TextLayer, ImageLayer, DesignLayer, PathPoint, PathData, ShapeLayer } from "@/types/design";
import { fillsOf } from "@/lib/layerStyles";
import ImageContextToolbar, { type ImageAction } from "./ImageContextToolbar";
import type { Artboard } from "@/types/design";
export default function CanvasEditor({
  stageRef,
  onImageAction,
}: {
  stageRef: React.RefObject<Konva.Stage | null>;
  onImageAction: (action: ImageAction) => void;
}) {
  const {
    document: committed,
    palettePreview,
    selectedArtboardId,
    selectedLayerIds,
    selectArtboard,
    selectLayer,
    selectLayers,
    patch,
    setZoom,
    setPan,
  } = useEditorStore();
  const s = useEditorStore();
  const [penTool, setPenTool] = useState(false);
  const [penPoints, setPenPoints] = useState<PathPoint[]>([]);
  const [penDragStart, setPenDragStart] = useState<{ x: number; y: number } | null>(null);
  const [penDragCurrent, setPenDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [penHoverPos, setPenHoverPos] = useState<{ x: number; y: number } | null>(null);
  const penRef = useRef<HTMLCanvasElement | null>(null);
  const doc = palettePreview ?? committed;
  const host = useRef<HTMLDivElement>(null),
    transformer = useRef<Konva.Transformer>(null);
  const [area, setArea] = useState({ width: 700, height: 700 }),
    [zoom, setZoomState] = useState(doc.zoom || 1),
    [pan, setPanState] = useState(doc.pan || { x: 0, y: 0 });
  // store의 zoom/pan 변경 시 로컬 state 동기화
  useEffect(() => { setZoomState(doc.zoom ?? 1); }, [doc.zoom]);
  useEffect(() => { setPanState(doc.pan ?? { x: 0, y: 0 }); }, [doc.pan]);
  // 최신 applyZoom을 항상 참조하도록 ref 유지 (stale closure 방지)
  const applyZoomRef = useRef<(newZoom: number, centerArtX?: number, centerArtY?: number) => void>();
  applyZoomRef.current = applyZoom;
  const [editing, setEditing] = useState<{
    layer: TextLayer;
    value: string;
  } | null>(null);
  const fonts = useFontStore((s) => s.fonts);
  const [fontVersion, setFontVersion] = useState(0);
  const cancelled = useRef(false);
  const prevText = useRef<string | undefined>(undefined);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      if (active) {
        useEditorStore.getState().reflowText();
        setFontVersion((v) => v + 1);
      }
    };
    refresh();
    document.fonts.ready.then(refresh);
    document.fonts.addEventListener("loadingdone", refresh);
    return () => {
      active = false;
      document.fonts.removeEventListener("loadingdone", refresh);
    };
  }, [fonts]);

  const draft = editing
    ? fitText(
        { ...editing.layer, text: editing.value },
        undefined,
        prevText.current
          ? () => autoTextSize({ ...editing.layer, text: prevText.current! })
          : undefined,
      )
    : null;

  const selectedArtboard = doc.artboards.find((a) => a.id === selectedArtboardId) ||
    doc.artboards[0];
  const artboardLayers = doc.layers.filter((l) =>
    (l as DesignLayer).artboardId === selectedArtboard?.id &&
    (l as DesignLayer).visible !== false
  );

  const fit = Math.min(
    (area.width - 100) / (selectedArtboard?.width || 1080),
    (area.height - 110) / (selectedArtboard?.height || 1350),
    1,
  );
  const scale = Math.max(0.05, fit * zoom);
  const width = (selectedArtboard?.width || 1080) * scale;
  const height = (selectedArtboard?.height || 1350) * scale;

  const artboardW = selectedArtboard?.width || 1080;
  const artboardH = selectedArtboard?.height || 1350;
  const artboardX = selectedArtboard?.x || 0;
  const artboardY = selectedArtboard?.y || 0;

  function applyZoom(newZoom: number, centerArtX?: number, centerArtY?: number) {
    const clamped = Math.max(0.1, Math.min(5, newZoom));
    const newScale = Math.max(0.05, fit * clamped);
    const newWidth = artboardW * newScale;
    const newHeight = artboardH * newScale;
    let targetPanX: number, targetPanY: number;
    if (centerArtX !== undefined && centerArtY !== undefined) {
      // 현재 scale에서 centerArtX,Y의 화면상 위치
      const curScreenX = pan.x + artboardX * scale + centerArtX * scale;
      const curScreenY = pan.y + artboardY * scale + centerArtY * scale;
      // 새 scale에서 같은 화면 위치를 유지하려면:
      // curScreenX = newPanX + artboardX * newScale + centerArtX * newScale
      targetPanX = curScreenX - artboardX * newScale - centerArtX * newScale;
      targetPanY = curScreenY - artboardY * newScale - centerArtY * newScale;
    } else {
      // 아트보드 중앙 기준: 화면 중앙에 오도록 pan 조정
      targetPanX = pan.x + (width - newWidth) / 2;
      targetPanY = pan.y + (height - newHeight) / 2;
    }
    setZoomState(clamped);
    setPanState({ x: targetPanX, y: targetPanY });
    useEditorStore.getState().setZoom(clamped);
    useEditorStore.getState().setPan({ x: targetPanX, y: targetPanY });
  }

  // 아트보드 전환 시 화면이 새 아트보드 중심으로 이동하도록 pan 조정
  useEffect(() => {
    if (!selectedArtboard) return;
    const targetCx = artboardX * scale + width / 2;
    const targetCy = artboardY * scale + height / 2;
    setPanState({ x: targetCx - width / 2, y: targetCy - height / 2 });
    useEditorStore.getState().setPan({ x: targetCx - width / 2, y: targetCy - height / 2 });
  }, [selectedArtboardId]);

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      if (!e.evt.ctrlKey && !e.evt.metaKey) return;
      e.evt.preventDefault();
      const stage = e.target.getStage();
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;
      // 화면 좌표 → 아트보드 좌표 변환
      const artX = (pos.x - pan.x) / scale - artboardX;
      const artY = (pos.y - pan.y) / scale - artboardY;
      const delta = -e.evt.deltaY * 0.0015;
      const newZoom = Math.max(0.1, Math.min(5, zoom * (1 + delta)));
      applyZoomRef.current?.(newZoom, artX, artY);
    },
    [zoom, scale, pan, artboardX, artboardY],
  );

  const selectedIdsSet = new Set(selectedLayerIds);
  const selected = selectedLayerIds.length === 1
    ? doc.layers.find((l) => l.id === selectedLayerIds[0])
    : null;
  const preview = useEditorStore((s) => s.preview);
  const [toolbar, setToolbar] = useState({ left: 12, top: 52 });
  const locateToolbar = useCallback(() => {
    if (selectedLayerIds.length !== 1) return;
    const n = stageRef.current?.findOne("#" + selectedLayerIds[0]),
      h = host.current?.getBoundingClientRect(),
      c = stageRef.current?.container().getBoundingClientRect();
    if (!n || !h || !c) return;
    const r = n.getClientRect();
    setToolbar({
      left: Math.max(8, Math.min(h.width - 510, c.left - h.left + r.x)),
      top: Math.max(50, Math.min(h.height - 90, c.top - h.top + r.y - 54)),
    });
  }, [selectedLayerIds, stageRef, host]);
  useEffect(() => {
    locateToolbar();
  }, [doc, selectedLayerIds, preview, scale, area, locateToolbar]);
  useEffect(() => {
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setArea({ width: r.width, height: r.height });
    });
    if (host.current) ro.observe(host.current);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const node = stageRef.current?.findOne("#" + selectedLayerIds[0]);
    transformer.current?.nodes(
      node && selected?.visible && !selected.locked && !editing ? [node] : [],
    );
  }, [selectedLayerIds, doc, editing, selected, stageRef]);

  // 키보드 줌 (Ctrl + / Ctrl -) 및 Ctrl+0 (전체 보기)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.ctrlKey || e.metaKey) && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        applyZoomRef.current?.(Math.min(5, zoom + 0.2));
      } else if ((e.ctrlKey || e.metaKey) && e.key === "-") {
        e.preventDefault();
        applyZoomRef.current?.(Math.max(0.1, zoom - 0.2));
      } else if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault();
        fitToScreenRef.current?.();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [zoom]);

  // Space + 드래그 화면 이동 (Pan)
  // spaceDown ref: 이벤트 핸들러에서 최신 값 참조용
  const spaceDownRef = useRef(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; panX: number; panY: number } | null>(null);

  useEffect(() => {
    spaceDownRef.current = spaceDown;
  }, [spaceDown]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        setSpaceDown(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setSpaceDown(false);
        setDragStart(null);
      }
    };
    const handleMouseDown = (e: MouseEvent) => {
      if (spaceDownRef.current && e.button === 0) {
        setDragStart({
          x: e.clientX,
          y: e.clientY,
          panX: pan.x,
          panY: pan.y,
        });
      }
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (dragStart) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        setPanState({ x: dragStart.panX + dx, y: dragStart.panY + dy });
        useEditorStore.getState().setPan({ x: dragStart.panX + dx, y: dragStart.panY + dy });
      }
    };
    const handleMouseUp = () => {
      setDragStart(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [pan]);

  // Ctrl+0: 현재 아트보드 전체를 화면에 맞추기
  const fitToScreenRef = useRef<() => void>();
  fitToScreenRef.current = fitToScreen;

  function fitToScreen() {
    const padding = 60;
    const availableWidth = area.width - padding * 2;
    const availableHeight = area.height - padding * 2;
    const artboardW = selectedArtboard?.width || 1080;
    const artboardH = selectedArtboard?.height || 1350;
    // 아트보드 전체가 viewport에 들어가려면 필요한 scale
    const neededScale = Math.min(
      availableWidth / artboardW,
      availableHeight / artboardH,
      1,
    );
    // scale = fit * zoom 이므로, 필요한 zoom = neededScale / fit
    const fitZoom = fit > 0 ? neededScale / fit : neededScale;
    const clampedZoom = Math.max(0.1, Math.min(5, fitZoom));
    const newScale = Math.max(0.05, fit * clampedZoom);
    const newWidth = artboardW * newScale;
    const newHeight = artboardH * newScale;
    const targetPanX = (area.width - newWidth) / 2;
    const targetPanY = (area.height - newHeight) / 2;
    setZoomState(clampedZoom);
    setPanState({ x: targetPanX, y: targetPanY });
    useEditorStore.getState().setZoom(clampedZoom);
    useEditorStore.getState().setPan({ x: targetPanX, y: targetPanY });
  }

  const finish = () => {
    setEditing(null);
    useEditorStore.getState().clearPreview();
    prevText.current = undefined;
  };

  function screenToArtboard(e: Konva.KonvaEventObject<MouseEvent>) {
    const stage = e.target.getStage();
    if (!stage) return { x: 0, y: 0 };
    const point = stage.getPointerPosition();
    if (!point) return { x: 0, y: 0 };
    return {
      x: (point.x - pan.x) / scale - artboardX,
      y: (point.y - pan.y) / scale - artboardY,
    };
  }

  function handlePenMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    if (!penTool) return;
    const tgt = e.target;
    if (tgt === e.target.getStage() || tgt.name() === "paper" || tgt.name() === "pen-preview") {
      const pos = screenToArtboard(e);
      const threshold = 20 / scale;
      if (penPoints.length >= 2) {
        const first = penPoints[0];
        const dx = pos.x - first.x;
        const dy = pos.y - first.y;
        if (Math.sqrt(dx * dx + dy * dy) < threshold) {
          finishPenPath(true);
          return;
        }
      }
      if (penDragStart) {
        setPenDragStart(null);
      }
      setPenPoints((prev) => [...prev, { x: pos.x, y: pos.y }]);
    }
  }

  function handlePenMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
    if (!penTool) return;
    const pos = screenToArtboard(e);
    setPenHoverPos(pos);
    if (penPoints.length > 0 && !penDragStart) {
      const last = penPoints[penPoints.length - 1];
      const dx = pos.x - last.x;
      const dy = pos.y - last.y;
      if (Math.sqrt(dx * dx + dy * dy) > 5 / scale) {
        setPenDragStart(last);
        setPenDragCurrent(pos);
      }
    }
    if (penDragStart) {
      setPenDragCurrent(pos);
    }
  }

  function handlePenMouseUp() {
    if (!penTool || !penDragStart || !penDragCurrent) return;
    const start = penDragStart;
    const end = penDragCurrent;
    if (penPoints.length > 1) {
      const prev = penPoints[penPoints.length - 1];
      const cx = (prev.x + end.x) / 2;
      const cy = (prev.y + end.y) / 2;
      const hOut = {
        x: prev.x + (end.x - prev.x) * 0.5,
        y: prev.y + (end.y - prev.y) * 0.3,
      };
      const hIn = { x: end.x - (end.x - prev.x) * 0.3, y: end.y - (end.y - prev.y) * 0.5 };
      setPenPoints((prevPoints) => [
        ...prevPoints.slice(0, -1),
        { ...prev, handleOut: hOut },
        { x: end.x, y: end.y, handleIn: hIn },
      ]);
    } else if (penPoints.length === 1) {
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
      setPenPoints((prevPoints) => [
        ...prevPoints,
        { x: end.x, y: end.y, handleIn: { x: midX, y: midY } },
      ]);
    }
    setPenDragStart(null);
    setPenDragCurrent(null);
  }

  function finishPenPath(closed: boolean) {
    if (penPoints.length < 2) {
      setPenTool(false);
      setPenPoints([]);
      setPenDragStart(null);
      setPenDragCurrent(null);
      setPenHoverPos(null);
      return;
    }
    const pts = penPoints.map((p, i) => ({
      x: p.x,
      y: p.y,
      handleIn: p.handleIn,
      handleOut: p.handleOut,
    }));
    const bounds = pts.reduce(
      (acc, p) => ({
        minX: Math.min(acc.minX, p.x),
        minY: Math.min(acc.minY, p.y),
        maxX: Math.max(acc.maxX, p.x),
        maxY: Math.max(acc.maxY, p.y),
      }),
      { minX: 0, minY: 0, maxX: 100, maxY: 100 },
    );
    const pathData: PathData = {
      closed,
      points: pts,
    };
    const defaultName = "펜 경로";
    const sameArtboardLayers = s.document.layers.filter(
      (l) => (l as DesignLayer).artboardId === selectedArtboardId,
    );
    const sameNames = sameArtboardLayers.map((l) => (l as DesignLayer).name);
    const layerName = uniqueName(defaultName, sameNames);
    const newLayer = makeLayer("shape", {
      name: layerName,
      shape: "path",
      path: pathData,
      fill: "#d9eafb",
      stroke: "#8eb5d8",
      strokeWidth: 2,
      width: Math.max(10, bounds.maxX - bounds.minX),
      height: Math.max(10, bounds.maxY - bounds.minY),
      x: bounds.minX,
      y: bounds.minY,
      artboardId: selectedArtboardId,
    });
    s.add(newLayer);
    setPenTool(false);
    setPenPoints([]);
    setPenDragStart(null);
    setPenDragCurrent(null);
    setPenHoverPos(null);
  }

  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Space + 드래그 중이면 화면 이동(Pan)만 작동, 객체 선택/펜툴은 무시
    if (spaceDownRef.current) return;
    handlePenMouseDown(e);
    if (e.target === e.target.getStage() || e.target.name() === "paper") {
      selectArtboard(selectedArtboardId);
    }
  };

  const handleStageMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Space + 드래그 중이면 펜툴 처리 건너뛰기
      if (spaceDownRef.current) return;
      handlePenMouseMove(e);
    },
    [penTool, penPoints, penDragStart, penDragCurrent],
  );

  const handleStageMouseUp = useCallback(() => {
    // Space + 드래그 중이면 펜툴 업 처리 건너뛰기
    if (spaceDownRef.current) return;
    handlePenMouseUp();
  }, [penTool, penDragStart, penDragCurrent]);
  return (
    <main
      className="workspace"
      ref={host}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) selectArtboard(selectedArtboardId);
      }}
    >
      <div className="canvas-meta">
        <span>{doc.name}</span>
        <span>
          {selectedArtboard?.width || 1080} × {selectedArtboard?.height || 1350}
        </span>
        <div className="artboard-tabs">
          {doc.artboards.map((a) => (
            <button
              key={a.id}
              className={`artboard-tab ${a.id === selectedArtboardId ? "active" : ""}`}
              onClick={() => selectArtboard(a.id)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                const name = prompt("아트보드 이름:", a.name);
                if (name && name.trim()) {
                  useEditorStore.getState().commit({
                    ...doc,
                    artboards: doc.artboards.map((ab) =>
                      ab.id === a.id ? { ...ab, name: name.trim() } : ab
                    ),
                  });
                }
              }}
            >
              {a.name}
              <span className="artboard-size">{a.width}×{a.height}</span>
            </button>
          ))}
          <button
            className="artboard-add"
            onClick={() => useEditorStore.getState().addArtboard()}
            title="아트보드 추가"
          >
            ＋
          </button>
        </div>
      </div>
      <div className="canvas-scroll" onScroll={locateToolbar}>
        <div
          className="artboard"
          style={{
            width,
            height,
            transform: `translate(${pan.x + artboardX * scale}px, ${pan.y + artboardY * scale}px)`,
          }}
        >
          <Stage
            ref={stageRef}
            width={width}
            height={height}
            scaleX={scale}
            scaleY={scale}
            onWheel={handleWheel}
            onMouseDown={handleStageMouseDown}
            onMouseMove={handleStageMouseMove}
            onMouseUp={handleStageMouseUp}
          >
            <Layer>
              <Rect
                name="paper"
                width={selectedArtboard?.width || 1080}
                height={selectedArtboard?.height || 1350}
                fill={selectedArtboard?.background || "#ffffff"}
              />
              {penTool &&
                penPoints.length >= 2 &&
                (() => {
                  const parts: string[] = [];
                  penPoints.forEach((p, i) => {
                    if (i === 0) {
                      parts.push(`M${p.x} ${p.y}`);
                    } else {
                      const prev = penPoints[i - 1];
                      if (prev.handleOut || p.handleIn) {
                        const hOut = prev.handleOut || { x: p.x, y: prev.y };
                        const hIn = p.handleIn || { x: p.x, y: prev.y };
                        parts.push(`C${hOut.x} ${hOut.y} ${hIn.x} ${hIn.y} ${p.x} ${p.y}`);
                      } else {
                        parts.push(`L${p.x} ${p.y}`);
                      }
                    }
                  });
                  if (penDragStart && penDragCurrent) {
                    const last = penPoints[penPoints.length - 1];
                    parts.push(`L${penDragCurrent.x} ${penDragCurrent.y}`);
                  }
                  return (
                    <KonvaPath
                      name="pen-preview"
                      data={parts.join(" ")}
                      fill="rgba(137, 181, 255, 0.2)"
                      stroke="#89b5ff"
                      strokeWidth={2 / scale}
                      listening={false}
                    />
                  );
                })()}
              {penPoints.map((p, i) => (
                <Group key={i}>
                  <Rect
                    x={p.x - 3 / scale}
                    y={p.y - 3 / scale}
                    width={6 / scale}
                    height={6 / scale}
                    fill="#3b82f6"
                    stroke="#ffffff"
                    strokeWidth={1 / scale}
                    listening={false}
                  />
                </Group>
              ))}
              {penDragStart &&
                penDragCurrent &&
                penPoints.length > 0 &&
                penPoints.length < 2 && (
                  <Line
                    points={[penDragStart.x, penDragStart.y, penDragCurrent.x, penDragCurrent.y]}
                    stroke="#3b82f6"
                    strokeWidth={2 / scale}
                    listening={false}
                  />
                )}
              {artboardLayers
                .sort((a, b) => {
                  const za = (a as DesignLayer).zIndex || 0;
                  const zb = (b as DesignLayer).zIndex || 0;
                  return za - zb;
                })
                .map((l) => {
                  const layer = l as DesignLayer;
                  const isSelected = selectedLayerIds.includes(layer.id);
                  return (
                    <Group
                      key={layer.id}
                      id={layer.id}
                      x={layer.x}
                      y={layer.y}
                      width={layer.width}
                      height={layer.height}
                      rotation={layer.rotation}
                      opacity={editing?.layer.id === layer.id ? 0 : layer.opacity}
                      draggable={!layer.locked}
                      onClick={(e) => {
                        if (e.evt.shiftKey) {
                          const newIds = selectedLayerIds.includes(layer.id)
                            ? selectedLayerIds.filter((id) => id !== layer.id)
                            : [...selectedLayerIds, layer.id];
                          selectLayers(newIds);
                        } else {
                          selectLayer(layer.id);
                        }
                      }}
                      onTap={() => selectLayer(layer.id)}
                      onDragStart={() => selectLayer(layer.id)}
                      onDragMove={(e) =>
                        useEditorStore.getState().previewTransform(layer.id, {
                          x: e.target.x(),
                          y: e.target.y(),
                        })
                      }
                      onTransform={(e) => {
                        const n = e.target;
                        useEditorStore.getState().previewTransform(layer.id, {
                          x: n.x(),
                          y: n.y(),
                          width: layer.width * n.scaleX(),
                          height: layer.height * n.scaleY(),
                          rotation: n.rotation(),
                        });
                      }}
                      onDblClick={() => {
                        if (layer.type === "text" && !layer.locked) {
                          cancelled.current = false;
                          selectLayer(layer.id);
                          prevText.current = layer.text;
                          setEditing({ layer, value: layer.text });
                        }
                      }}
                      onDragEnd={(e) => {
                        patch(layer.id, {
                          x: Math.round(e.target.x()),
                          y: Math.round(e.target.y()),
                        });
                        useEditorStore.getState().clearPreview();
                      }}
                      onTransformEnd={(e) => {
                        const n = e.target;
                        const sx = n.scaleX(),
                          sy = n.scaleY();
                        n.scaleX(1);
                        n.scaleY(1);
                        patch(layer.id, {
                          x: Math.round(n.x()),
                          y: Math.round(n.y()),
                          width: Math.max(10, Math.round(layer.width * sx)),
                          height: Math.max(10, Math.round(layer.height * sy)),
                          rotation: Math.round(n.rotation()),
                        });
                        useEditorStore.getState().clearPreview();
                      }}
                      style={{
                        border: isSelected ? "2px solid #3b82f6" : undefined,
                        borderRadius: isSelected ? "4px" : undefined,
                      }}
                    >
                      <Rect
                        width={layer.width}
                        height={layer.height}
                        fill="rgba(0,0,0,0)"
                      />
                      <LayerNode key={fontVersion} layer={layer} />
                    </Group>
                  );
                })}
            </Layer>
            <Layer name="controls">
              <Transformer
                ref={transformer}
                rotateEnabled
                flipEnabled={false}
                keepRatio={selected?.type === "image" ? (selected as ImageLayer).keepRatio : false}
                enabledAnchors={
                  selected?.type === "image" && (selected as ImageLayer).keepRatio
                    ? ["top-left", "top-right", "bottom-left", "bottom-right"]
                    : undefined
                }
                borderStroke="#3b82f6"
                anchorStroke="#3b82f6"
                anchorFill="#ffffff"
                anchorSize={8}
                rotateAnchorOffset={25}
                boundBoxFunc={(old, next) =>
                  next.width < 10 || next.height < 10 ? old : next
                }
              />
            </Layer>
          </Stage>
          {editing && draft && (
            <textarea
              aria-label="캔버스 텍스트 편집"
              wrap={draft.textSizing === "fixed" ? "soft" : "off"}
              spellCheck={false}
              autoFocus
              value={editing.value}
              onChange={(e) => {
                const value = e.target.value;
                prevText.current = editing.value;
                setEditing({ ...editing, value });
                const prevSize = autoTextSize({
                  ...editing.layer,
                  text: prevText.current!,
                });
                const next = fitText(
                  { ...editing.layer, text: value },
                  undefined,
                  () => prevSize,
                );
                useEditorStore
                  .getState()
                  .previewTransform(editing.layer.id, {
                    width: next.width,
                    height: next.height,
                  });
              }}
              onBlur={finish}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.nativeEvent.isComposing) return;
                if (e.key === "Escape") {
                  cancelled.current = true;
                  setEditing(null);
                  useEditorStore.getState().clearPreview();
                  prevText.current = undefined;
                }
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) finish();
              }}
              style={{
                position: "absolute",
                left: editing.layer.x * scale,
                top: editing.layer.y * scale,
                width: draft.width,
                height: draft.height,
                fontSize: editing.layer.fontSize,
                fontFamily: editing.layer.fontFamily,
                fontWeight: editing.layer.fontWeight,
                lineHeight: editing.layer.lineHeight,
                letterSpacing: editing.layer.letterSpacing,
                textAlign: editing.layer.align,
                color:
                  fillsOf(editing.layer)
                    .filter((f) => f.visible)
                    .at(-1)?.color ?? editing.layer.color,
                transform: `rotate(${editing.layer.rotation}deg) scale(${scale})`,
                transformOrigin: "top left",
                padding: 0,
                border: "none",
                whiteSpace: draft.textSizing === "fixed" ? "pre-wrap" : "pre",
                overflow: "hidden",
                minWidth: 1,
                minHeight: 1,
                background: "rgba(255,255,255,.95)",
                resize: "none",
                outline: `${1 / scale}px solid #3b82f6`,
              }}
            />
          )}
        </div>
      </div>
      {selected?.type === "image" &&
        selected.visible &&
        !selected.locked &&
        !editing && (
          <ImageContextToolbar
            layer={selected}
            left={toolbar.left}
            top={toolbar.top}
            onAction={onImageAction}
          />
        )}
      <div className="canvas-footer">
        <span>Ctrl + / -로 확대·축소 · Ctrl + 0으로 전체 보기 · Space + 드래그로 이동 · 마우스 휠로 확대·축소</span>
        <div>
          <button
            aria-label="축소"
            onClick={() => applyZoomRef.current?.(Math.max(0.1, zoom - 0.2))}
          >
            −
          </button>
          <button>{Math.round(zoom * 100)}%</button>
          <button
            aria-label="확대"
            onClick={() => applyZoomRef.current?.(Math.min(5, zoom + 0.2))}
          >
            +
          </button>
        </div>
      </div>
    </main>
  );
}
