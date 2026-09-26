import { useState } from "react";
import { useEditorStore } from "@/store/editorStore";
import type { Artboard } from "@/types/design";
const presets = [
  ["Instagram Square", 1080, 1080],
  ["Instagram Portrait", 1080, 1350],
  ["Instagram Story", 1080, 1920],
  ["Web Banner", 1200, 600],
  ["Popup", 500, 667],
] as const;
export default function CanvasSizeSelector() {
  const { document: doc, commit, selectedArtboardId } = useEditorStore();
  const artboard = doc.artboards.find((a) => a.id === selectedArtboardId) ||
    doc.artboards[0] || null;
  const [open, setOpen] = useState(false);
  const sizeLabel = artboard ? `${artboard.width} × ${artboard.height}` : "—";
  const currentWidth = artboard?.width ?? 1080;
  const currentHeight = artboard?.height ?? 1350;
  const updateArtboard = (patch: Partial<Artboard>) => {
    if (!artboard) return;
    const nextArtboards = doc.artboards.map((a) =>
      a.id === artboard.id ? { ...a, ...patch } : a,
    );
    commit({ ...doc, artboards: nextArtboards });
  };
  return (
    <div className="size-selector">
      <button onClick={() => setOpen(!open)}>
        Canvas Size{" "}
        <span>{sizeLabel}</span>
        ⌄
      </button>
      {open && (
        <div className="size-popover">
          <h3>캔버스 크기</h3>
          {presets.map(([name, width, height]) => (
            <button
              key={name}
              onClick={() => {
                updateArtboard({ width, height });
                setOpen(false);
              }}
            >
              {name}
              <small>{width} × {height}</small>
            </button>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              updateArtboard({
                width: Number(d.get("width")),
                height: Number(d.get("height")),
              });
              setOpen(false);
            }}
          >
            <label>Custom Size</label>
            <div className="two">
              <input
                aria-label="Custom Width"
                name="width"
                type="number"
                min="100"
                max="4096"
                required
                defaultValue={currentWidth}
              />
              <input
                aria-label="Custom Height"
                name="height"
                type="number"
                min="100"
                max="4096"
                required
                defaultValue={currentHeight}
              />
            </div>
            <button className="primary" type="submit">
              적용
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
