import { useState } from "react";
import { useEditorStore } from "@/store/editorStore";
const presets = [
  ["Instagram Square", 1080, 1080],
  ["Instagram Portrait", 1080, 1350],
  ["Instagram Story", 1080, 1920],
  ["Web Banner", 1200, 600],
  ["Popup", 500, 667],
] as const;
export default function CanvasSizeSelector() {
  const { document: doc, commit } = useEditorStore();
  const [open, setOpen] = useState(false);
  return (
    <div className="size-selector">
      <button onClick={() => setOpen(!open)}>
        Canvas Size{" "}
        <span>
          {doc.canvas.width} × {doc.canvas.height}
        </span>
        ⌄
      </button>
      {open && (
        <div className="size-popover">
          <h3>캔버스 크기</h3>
          {presets.map(([name, width, height]) => (
            <button
              key={name}
              onClick={() => {
                commit({ ...doc, canvas: { ...doc.canvas, width, height } });
                setOpen(false);
              }}
            >
              {name}
              <small>
                {width} × {height}
              </small>
            </button>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              commit({
                ...doc,
                canvas: {
                  ...doc.canvas,
                  width: Number(d.get("width")),
                  height: Number(d.get("height")),
                },
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
                defaultValue={doc.canvas.width}
              />
              <input
                aria-label="Custom Height"
                name="height"
                type="number"
                min="100"
                max="4096"
                required
                defaultValue={doc.canvas.height}
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
