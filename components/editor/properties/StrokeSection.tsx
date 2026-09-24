import { strokesOf } from "@/lib/layerStyles";
import type { Stroke } from "@/types/design";
import { Section, ColorField, NumberField, type SectionProps } from "./Fields";
export default function StrokeSection({ layer: l, patch }: SectionProps) {
  const strokes = strokesOf(l);
  const update = (i: number, p: Partial<Stroke>) =>
    patch({ strokes: strokes.map((s, j) => (i === j ? { ...s, ...p } : s)) });
  return (
    <Section title="외곽선">
      {strokes.map((s, i) => (
        <div className="paint-item" key={s.id}>
          <ColorField
            value={s.color}
            label="외곽선 색상"
            onChange={(color) => update(i, { color })}
          />
          <div className="two">
            <NumberField
              label="선 굵기"
              value={s.width}
              min={0}
              max={100}
              onChange={(width) => update(i, { width })}
            />
            <NumberField
              label="선 불투명도 %"
              value={s.opacity * 100}
              min={0}
              max={100}
              onChange={(v) => update(i, { opacity: v / 100 })}
            />
          </div>
          <div className="paint-controls">
            <select
              aria-label="외곽선 위치"
              value={s.position}
              onChange={(e) =>
                update(i, { position: e.target.value as Stroke["position"] })
              }
            >
              <option value="inside">안쪽</option>
              <option value="center">중앙</option>
              <option value="outside">바깥쪽</option>
            </select>
            <button
              aria-label="외곽선 표시"
              title="외곽선 표시 / 숨김"
              aria-pressed={s.visible}
              onClick={() => update(i, { visible: !s.visible })}
            >
              {s.visible ? "◉" : "○"}
            </button>
            <button
              aria-label="외곽선 삭제"
              title="외곽선 삭제"
              onClick={() =>
                patch({ strokes: strokes.filter((_, j) => j !== i) })
              }
            >
              −
            </button>
          </div>
        </div>
      ))}
      <button
        className="section-add"
        onClick={() =>
          patch({
            strokes: [
              ...strokes,
              {
                id: crypto.randomUUID(),
                color: "#111111",
                width: 2,
                opacity: 1,
                visible: true,
                position: "center",
              },
            ],
          })
        }
      >
        ＋ 외곽선 추가
      </button>
    </Section>
  );
}
