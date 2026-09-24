import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Group, Transformer } from "react-konva";
import Konva from "konva";
import { useEditorStore } from "@/store/editorStore";
import { LayerNode } from "./LayerNodes";
import type { TextLayer } from "@/types/design";
import { fillsOf } from "@/lib/layerStyles";
import ImageContextToolbar, { type ImageAction } from "./ImageContextToolbar";
export default function CanvasEditor({
  stageRef,
  onImageAction,
}: {
  stageRef: React.RefObject<Konva.Stage | null>;
  onImageAction: (action: ImageAction) => void;
}) {
  const { document: doc, selectedId, select, patch } = useEditorStore();
  const host = useRef<HTMLDivElement>(null),
    transformer = useRef<Konva.Transformer>(null);
  const [area, setArea] = useState({ width: 700, height: 700 }),
    [zoom, setZoom] = useState(1),
    [editing, setEditing] = useState<{
      layer: TextLayer;
      value: string;
    } | null>(null);
  const fit = Math.min(
    (area.width - 100) / doc.canvas.width,
    (area.height - 110) / doc.canvas.height,
    1,
  );
  const scale = Math.max(0.05, fit * zoom);
  const width = doc.canvas.width * scale,
    height = doc.canvas.height * scale;
  const selected = doc.layers.find((l) => l.id === selectedId);
  const preview = useEditorStore((s) => s.preview);
  const [toolbar, setToolbar] = useState({ left: 12, top: 52 });
  const locateToolbar = () => {
    const n = stageRef.current?.findOne("#" + selectedId),
      h = host.current?.getBoundingClientRect(),
      c = stageRef.current?.container().getBoundingClientRect();
    if (!n || !h || !c) return;
    const r = n.getClientRect();
    setToolbar({
      left: Math.max(8, Math.min(h.width - 510, c.left - h.left + r.x)),
      top: Math.max(50, Math.min(h.height - 90, c.top - h.top + r.y - 54)),
    });
  };
  useEffect(() => {
    locateToolbar();
  }, [doc, selectedId, preview, scale, area]);
  useEffect(() => {
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setArea({ width: r.width, height: r.height });
    });
    if (host.current) ro.observe(host.current);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const node = stageRef.current?.findOne("#" + selectedId);
    transformer.current?.nodes(
      node && selected?.visible && !selected.locked && !editing ? [node] : [],
    );
  }, [selectedId, doc, editing, selected, stageRef]);
  const finish = () => {
    if (editing) {
      patch(editing.layer.id, { text: editing.value });
      setEditing(null);
    }
  };
  return (
    <main
      className="workspace"
      ref={host}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) select(null);
      }}
    >
      <div className="canvas-meta">
        <span>{doc.name}</span>
        <span>
          {doc.canvas.width} × {doc.canvas.height}
        </span>
      </div>
      <div className="canvas-scroll" onScroll={locateToolbar}>
        <div className="artboard" style={{ width, height }}>
          <Stage
            ref={stageRef}
            width={width}
            height={height}
            scaleX={scale}
            scaleY={scale}
            onMouseDown={(e) => {
              if (
                e.target === e.target.getStage() ||
                e.target.name() === "paper"
              )
                select(null);
            }}
          >
            <Layer>
              <Rect
                name="paper"
                width={doc.canvas.width}
                height={doc.canvas.height}
                fill={doc.canvas.background}
              />
              {doc.layers
                .filter((l) => l.visible)
                .map((l) => (
                  <Group
                    key={l.id}
                    id={l.id}
                    x={l.x}
                    y={l.y}
                    width={l.width}
                    height={l.height}
                    rotation={l.rotation}
                    opacity={editing?.layer.id === l.id ? 0 : l.opacity}
                    draggable={!l.locked}
                    onClick={() => select(l.id)}
                    onTap={() => select(l.id)}
                    onDragStart={() => select(l.id)}
                    onDragMove={(e) =>
                      useEditorStore.getState().previewTransform(l.id, {
                        x: e.target.x(),
                        y: e.target.y(),
                      })
                    }
                    onTransform={(e) => {
                      const n = e.target;
                      useEditorStore.getState().previewTransform(l.id, {
                        x: n.x(),
                        y: n.y(),
                        width: l.width * n.scaleX(),
                        height: l.height * n.scaleY(),
                        rotation: n.rotation(),
                      });
                    }}
                    onDblClick={() => {
                      if (l.type === "text" && !l.locked)
                        setEditing({ layer: l, value: l.text });
                    }}
                    onDragEnd={(e) => {
                      patch(l.id, {
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
                      patch(l.id, {
                        x: Math.round(n.x()),
                        y: Math.round(n.y()),
                        width: Math.max(10, Math.round(l.width * sx)),
                        height: Math.max(10, Math.round(l.height * sy)),
                        rotation: Math.round(n.rotation()),
                      });
                      useEditorStore.getState().clearPreview();
                    }}
                  >
                    <Rect
                      width={l.width}
                      height={l.height}
                      fill="rgba(0,0,0,0)"
                    />
                    <LayerNode layer={l} />
                  </Group>
                ))}
            </Layer>
            <Layer name="controls">
              <Transformer
                ref={transformer}
                rotateEnabled
                flipEnabled={false}
                keepRatio={selected?.keepRatio ?? false}
                enabledAnchors={
                  selected?.keepRatio
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
          {editing && (
            <textarea
              aria-label="캔버스 텍스트 편집"
              autoFocus
              value={editing.value}
              onChange={(e) =>
                setEditing({ ...editing, value: e.target.value })
              }
              onBlur={finish}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Escape") setEditing(null);
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) finish();
              }}
              style={{
                position: "absolute",
                left: editing.layer.x * scale,
                top: editing.layer.y * scale,
                width: editing.layer.width * scale,
                height: editing.layer.height * scale,
                fontSize: editing.layer.fontSize * scale,
                fontFamily: editing.layer.fontFamily,
                fontWeight: editing.layer.fontWeight,
                lineHeight: editing.layer.lineHeight,
                letterSpacing: editing.layer.letterSpacing * scale,
                textAlign: editing.layer.align,
                color:
                  fillsOf(editing.layer)
                    .filter((f) => f.visible)
                    .at(-1)?.color ?? editing.layer.color,
                transform: `rotate(${editing.layer.rotation}deg)`,
                transformOrigin: "top left",
                padding: 0,
                border: "1px solid #3b82f6",
                background: "rgba(255,255,255,.95)",
                resize: "none",
                outline: "none",
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
        <span>더블클릭으로 텍스트 편집 · Shift로 비율 유지</span>
        <div>
          <button
            aria-label="축소"
            onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
          >
            −
          </button>
          <button onClick={() => setZoom(1)}>{Math.round(scale * 100)}%</button>
          <button
            aria-label="확대"
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
          >
            +
          </button>
        </div>
      </div>
    </main>
  );
}
