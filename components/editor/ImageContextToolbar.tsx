import { Crop, ScanLine, Scissors, WandSparkles } from "lucide-react";
import type { ImageLayer } from "@/types/design";
import ImageMoreMenu from "./ImageMoreMenu";
export type ImageAction = "crop" | "region" | "background" | "prompt";
export default function ImageContextToolbar({
  layer,
  onAction,
  left,
  top,
}: {
  layer: ImageLayer;
  onAction: (action: ImageAction) => void;
  left: number;
  top: number;
}) {
  return (
    <div
      className="image-context-toolbar"
      style={{ left, top }}
      role="toolbar"
      aria-label="이미지 편집 도구"
    >
      {[
        { id: "crop", label: "자르기", Icon: Crop },
        { id: "region", label: "영역 선택", Icon: ScanLine },
        { id: "background", label: "배경 제거", Icon: Scissors },
        { id: "prompt", label: "프롬프트로 편집하기", Icon: WandSparkles },
      ].map(({ id, label, Icon }) => (
        <button
          key={id}
          title={label}
          onClick={() => onAction(id as ImageAction)}
        >
          <Icon size={16} />
          <span>{label}</span>
        </button>
      ))}
      <ImageMoreMenu layer={layer} />
    </div>
  );
}
