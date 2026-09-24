import { fillsOf } from "@/lib/layerStyles";
import { Section, ColorField, NumberField, type SectionProps } from "./Fields";
export default function FillSection({ layer: l, patch }: SectionProps) {
  const fills = fillsOf(l);
  return (
    <Section title="채우기">
      {fills.map((f, i) => (
        <div className="paint-item" key={f.id}>
          <ColorField
            value={f.color}
            onChange={(color) =>
              patch({
                fills: fills.map((p, j) => (j === i ? { ...p, color } : p)),
              })
            }
          />
          <div className="paint-controls">
            <NumberField
              label="채우기 투명도 %"
              min={0}
              max={100}
              value={f.opacity * 100}
              onChange={(v) =>
                patch({
                  fills: fills.map((p, j) =>
                    j === i ? { ...p, opacity: v / 100 } : p,
                  ),
                })
              }
            />
            <button
              title="채우기 표시 / 숨김"
              aria-label="채우기 표시"
              aria-pressed={f.visible}
              onClick={() =>
                patch({
                  fills: fills.map((p, j) =>
                    j === i ? { ...p, visible: !p.visible } : p,
                  ),
                })
              }
            >
              {f.visible ? "◉" : "○"}
            </button>
            <button
              title="채우기 삭제"
              aria-label="채우기 삭제"
              onClick={() => patch({ fills: fills.filter((_, j) => j !== i) })}
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
            fills: [
              ...fills,
              {
                id: crypto.randomUUID(),
                color: "#D9D9D9",
                opacity: 1,
                visible: true,
              },
            ],
          })
        }
      >
        ＋ 채우기 추가
      </button>
    </Section>
  );
}
