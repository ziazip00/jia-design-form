import { effectsOf } from "@/lib/layerStyles";
import type { LayerEffect } from "@/types/design";
import { Section, ColorField, NumberField, type SectionProps } from "./Fields";
export default function EffectsSection({ layer: l, patch }: SectionProps) {
  const effects = effectsOf(l);
  const update = (i: number, p: Partial<LayerEffect>) =>
    patch({ effects: effects.map((e, j) => (i === j ? { ...e, ...p } : e)) });
  return (
    <Section title="효과">
      {effects.map((e, i) => (
        <div className="paint-item" key={e.id}>
          <div className="paint-controls">
            <select
              aria-label="효과 종류"
              value={e.type}
              onChange={(ev) =>
                update(i, { type: ev.target.value as LayerEffect["type"] })
              }
            >
              <option value="shadow">그림자</option>
              <option value="inner">내부 그림자</option>
              <option value="blur">레이어 블러</option>
              <option value="glow">외부 광선</option>
            </select>
            <button
              aria-label="효과 표시"
              title="효과 표시 / 숨김"
              aria-pressed={e.visible}
              onClick={() => update(i, { visible: !e.visible })}
            >
              {e.visible ? "◉" : "○"}
            </button>
            <button
              aria-label="효과 삭제"
              title="효과 삭제"
              onClick={() =>
                patch({ effects: effects.filter((_, j) => j !== i) })
              }
            >
              −
            </button>
          </div>
          {e.type !== "blur" && (
            <ColorField
              value={e.color}
              label="효과 색상"
              onChange={(color) => update(i, { color })}
            />
          )}
          <div className="two">
            {e.type !== "blur" && (
              <>
                <NumberField
                  label="효과 X"
                  value={e.x}
                  min={-200}
                  max={200}
                  onChange={(x) => update(i, { x })}
                />
                <NumberField
                  label="효과 Y"
                  value={e.y}
                  min={-200}
                  max={200}
                  onChange={(y) => update(i, { y })}
                />
                <NumberField
                  label="Spread"
                  value={e.spread}
                  min={-100}
                  max={100}
                  onChange={(spread) => update(i, { spread })}
                />
                <NumberField
                  label="효과 불투명도 %"
                  min={0}
                  max={100}
                  value={e.opacity * 100}
                  onChange={(v) => update(i, { opacity: v / 100 })}
                />
              </>
            )}
            <NumberField
              label="Blur"
              value={e.blur}
              min={0}
              max={100}
              onChange={(blur) => update(i, { blur })}
            />
          </div>
        </div>
      ))}
      <button
        className="section-add"
        onClick={() =>
          patch({
            effects: [
              ...effects,
              {
                id: crypto.randomUUID(),
                type: "shadow",
                color: "#000000",
                opacity: 0.25,
                visible: true,
                x: 0,
                y: 4,
                blur: 12,
                spread: 0,
              },
            ],
          })
        }
      >
        ＋ 효과 추가
      </button>
    </Section>
  );
}
