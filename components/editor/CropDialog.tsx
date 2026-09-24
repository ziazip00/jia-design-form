import { useEffect, useRef, useState } from "react";
import type { ImageLayer } from "@/types/design";
import { cropPatch } from "@/lib/imageEditing";
import { useEditorStore } from "@/store/editorStore";
type Box = NonNullable<ImageLayer["crop"]>;
export default function CropDialog({
  layer,
  onClose,
}: {
  layer: ImageLayer;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    area = useRef<HTMLDivElement>(null),
    drag = useRef<{ handle: string; x: number; y: number; box: Box } | null>(
      null,
    );
  const [box, setBox] = useState<Box>(
      layer.crop ?? { x: 0, y: 0, width: 1, height: 1 },
    ),
    [error, setError] = useState("");
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  const apply = () => {
    const s = useEditorStore.getState(),
      current = s.document.layers.find((l) => l.id === layer.id);
    if (JSON.stringify(current) !== JSON.stringify(layer)) {
      setError("이미지가 변경됐습니다. 창을 닫고 다시 선택하세요.");
      return;
    }
    s.patch(layer.id, cropPatch(layer, box));
    onClose();
  };
  return (
    <dialog
      ref={ref}
      className="image-edit-dialog"
      onCancel={onClose}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          apply();
        }
      }}
    >
      <header>
        <h2>이미지 자르기</h2>
        <button aria-label="자르기 닫기" onClick={onClose}>
          ×
        </button>
      </header>
      <p>원본의 자를 영역을 조절하세요. Enter로 완료 · Esc로 취소</p>
      <div
        className="crop-image"
        ref={area}
        onPointerMove={(e) => {
          const g = drag.current,
            r = area.current?.getBoundingClientRect();
          if (!g || !r) return;
          const dx = (e.clientX - g.x) / r.width,
            dy = (e.clientY - g.y) / r.height;
          let { x, y, width, height } = g.box;
          const right = x + width,
            bottom = y + height;
          if (g.handle === "move") {
            x = Math.min(1 - width, Math.max(0, x + dx));
            y = Math.min(1 - height, Math.max(0, y + dy));
          } else {
            if (g.handle.includes("w")) {
              x = Math.max(0, Math.min(right - 0.02, x + dx));
              width = right - x;
            }
            if (g.handle.includes("e"))
              width = Math.max(0.02, Math.min(1 - x, width + dx));
            if (g.handle.includes("n")) {
              y = Math.max(0, Math.min(bottom - 0.02, y + dy));
              height = bottom - y;
            }
            if (g.handle.includes("s"))
              height = Math.max(0.02, Math.min(1 - y, height + dy));
          }
          setBox({ x, y, width, height });
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        {/* The original source remains intact; crop is normalized document metadata. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={layer.src} alt="자르기 원본" draggable={false} />
        <div
          className="crop-box"
          style={{
            left: `${box.x * 100}%`,
            top: `${box.y * 100}%`,
            width: `${box.width * 100}%`,
            height: `${box.height * 100}%`,
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = {
              handle: (e.target as HTMLElement).dataset.handle ?? "move",
              x: e.clientX,
              y: e.clientY,
              box,
            };
          }}
        >
          {["nw", "n", "ne", "e", "se", "s", "sw", "w"].map((handle) => (
            <span
              key={handle}
              data-handle={handle}
              className={`crop-handle ${handle}`}
            />
          ))}
          <div className="crop-thirds" />
        </div>
      </div>
      <p role="alert">{error}</p>
      <footer>
        <button onClick={() => setBox({ x: 0, y: 0, width: 1, height: 1 })}>
          전체 원본
        </button>
        <button onClick={onClose}>취소</button>
        <button className="primary" onClick={apply}>
          자르기 완료
        </button>
      </footer>
    </dialog>
  );
}
