import {
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  Link,
  Unlink,
  RotateCw,
} from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import { alignedPosition } from "@/lib/layerStyles";
import { Section, NumberField, type SectionProps } from "./Fields";
export default function PositionSection({ layer: l, patch }: SectionProps) {
  const canvas = useEditorStore((s) => s.document.canvas);
  const dirs = ["left", "center", "right", "top", "middle", "bottom"];
  const labels = [
    "왼쪽 정렬",
    "가로 중앙 정렬",
    "오른쪽 정렬",
    "위쪽 정렬",
    "세로 중앙 정렬",
    "아래쪽 정렬",
  ];
  return (
    <Section title="위치">
      <div className="alignment-row">
        {[
          AlignStartVertical,
          AlignCenterVertical,
          AlignEndVertical,
          AlignStartHorizontal,
          AlignCenterHorizontal,
          AlignEndHorizontal,
        ].map((Icon, i) => (
          <button
            key={i}
            title={`${labels[i]} · 캔버스 기준`}
            aria-label={labels[i]}
            onClick={() => patch(alignedPosition(l, canvas, dirs[i]))}
          >
            <Icon size={17} />
          </button>
        ))}
      </div>
      <div className="two">
        <NumberField label="X" value={l.x} onChange={(x) => patch({ x })} />
        <NumberField label="Y" value={l.y} onChange={(y) => patch({ y })} />
        <NumberField
          label="W"
          min={1}
          max={8192}
          value={l.width}
          onChange={(width) =>
            patch({
              width,
              ...(l.keepRatio ? { height: (l.height * width) / l.width } : {}),
            })
          }
        />
        <NumberField
          label="H"
          min={1}
          max={8192}
          value={l.height}
          onChange={(height) =>
            patch({
              height,
              ...(l.keepRatio ? { width: (l.width * height) / l.height } : {}),
            })
          }
        />
        <NumberField
          label="회전 °"
          value={l.rotation}
          onChange={(rotation) => patch({ rotation })}
        />
        <div className="inline-tools">
          <button
            aria-label="비율 잠금"
            title="비율 잠금 / 해제"
            aria-pressed={!!l.keepRatio}
            onClick={() => patch({ keepRatio: !l.keepRatio })}
          >
            {l.keepRatio ? <Link size={16} /> : <Unlink size={16} />}
          </button>
          <button
            title="90° 회전"
            aria-label="90° 회전"
            onClick={() => patch({ rotation: (l.rotation + 90) % 360 })}
          >
            <RotateCw size={16} />
          </button>
        </div>
      </div>
    </Section>
  );
}
