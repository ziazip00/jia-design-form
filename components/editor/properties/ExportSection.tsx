import { useState } from "react";
import type Konva from "konva";
import type { DesignLayer } from "@/types/design";
import { exportSelection, supportsSVG } from "@/lib/exportSelection";
import { Section } from "./Fields";
export default function ExportSection({
  layer,
  stageRef,
}: {
  layer: DesignLayer;
  stageRef: React.RefObject<Konva.Stage | null>;
}) {
  const [format, setFormat] = useState<"png" | "jpeg" | "svg">("png"),
    [scale, setScale] = useState(1),
    [error, setError] = useState("");
  return (
    <Section title="내보내기">
      <div className="two">
        <select
          aria-label="내보내기 배율"
          value={scale}
          onChange={(e) => setScale(Number(e.target.value))}
        >
          {[1, 2, 3].map((s) => (
            <option value={s} key={s}>
              {s}x
            </option>
          ))}
        </select>
        <select
          aria-label="선택 객체 파일 형식"
          value={format === "svg" && !supportsSVG(layer) ? "png" : format}
          onChange={(e) => setFormat(e.target.value as typeof format)}
        >
          <option value="png">PNG</option>
          <option value="jpeg">JPG</option>
          <option value="svg" disabled={!supportsSVG(layer)}>
            SVG
          </option>
        </select>
      </div>
      <button
        className="section-add"
        disabled={!layer.visible}
        onClick={async () => {
          try {
            setError("");
            if (stageRef.current)
              await exportSelection(
                stageRef.current,
                layer,
                format === "svg" && !supportsSVG(layer) ? "png" : format,
                scale,
              );
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "내보내기에 실패했습니다.",
            );
          }
        }}
      >
        선택 객체 내보내기
      </button>
      {!supportsSVG(layer) && (
        <p className="hint">SVG: 효과 없는 도형·아이콘 지원</p>
      )}
      {error && <p role="alert">{error}</p>}
    </Section>
  );
}
