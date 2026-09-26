import { effectsOf } from "@/lib/layerStyles";
import type { LayerEffect } from "@/types/design";
import { Section, ColorField, NumberField, type SectionProps } from "./Fields";
export default function EffectsSection({ layer: l, patch }: SectionProps) {
  const effects = effectsOf(l);
  const update = (i: number, p: Partial<LayerEffect>) =>
    patch({ effects: effects.map((e, j) => (i === j ? { ...e, ...p } : e)) });
  const addEffect = (type: LayerEffect["type"]) => {
    const base: LayerEffect = {
      id: crypto.randomUUID(),
      type,
      color: "#000000",
      opacity: 0.25,
      visible: true,
      x: 0,
      y: 4,
      blur: 12,
      spread: 0,
    };
    patch({ effects: [...effects, base] });
  };
  return (
    <Section title="효과 (FX)">
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
              <option value="stroke">획 (외곽선)</option>
              <option value="gradientOverlay">그레이디언트 오버레이</option>
              <option value="patternOverlay">패턴 오버레이</option>
              <option value="satin">새틴</option>
              <option value="bevelEmboss">경사와 엠보스</option>
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
          <ColorField
            value={e.color}
            label="효과 색상"
            onChange={(color) => update(i, { color })}
          />
          <div className="two">
            <NumberField
              label="불투명도 %"
              min={0}
              max={100}
              value={e.opacity * 100}
              onChange={(v) => update(i, { opacity: v / 100 })}
            />
            <NumberField
              label="Blur"
              value={e.blur}
              min={0}
              max={200}
              onChange={(blur) => update(i, { blur })}
            />
          </div>
          {e.type === "shadow" && (
            <>
              <div className="two">
                <NumberField
                  label="거리"
                  value={e.distance ?? 4}
                  min={0}
                  max={200}
                  onChange={(distance) => update(i, { distance })}
                />
                <NumberField
                  label="각도"
                  value={e.angle ?? 90}
                  min={0}
                  max={360}
                  onChange={(angle) => update(i, { angle })}
                />
              </div>
              <NumberField
                label="퍼짐"
                value={e.spread}
                min={-100}
                max={100}
                onChange={(spread) => update(i, { spread })}
              />
            </>
          )}
          {e.type === "inner" && (
            <>
              <div className="two">
                <NumberField
                  label="거리"
                  value={e.distance ?? 4}
                  min={0}
                  max={200}
                  onChange={(distance) => update(i, { distance })}
                />
                <NumberField
                  label="각도"
                  value={e.angle ?? 90}
                  min={0}
                  max={360}
                  onChange={(angle) => update(i, { angle })}
                />
              </div>
              <NumberField
                label="퍼짐"
                value={e.spread}
                min={-100}
                max={100}
                onChange={(spread) => update(i, { spread })}
              />
            </>
          )}
          {e.type === "glow" && (
            <>
              <div className="two">
                <NumberField
                  label="거리"
                  value={e.distance ?? 4}
                  min={0}
                  max={200}
                  onChange={(distance) => update(i, { distance })}
                />
                <NumberField
                  label="각도"
                  value={e.angle ?? 90}
                  min={0}
                  max={360}
                  onChange={(angle) => update(i, { angle })}
                />
              </div>
              <NumberField
                label="크기"
                value={e.size ?? 20}
                min={0}
                max={200}
                onChange={(size) => update(i, { size })}
              />
            </>
          )}
          {e.type === "stroke" && (
            <>
              <div className="two">
                <NumberField
                  label="두께"
                  value={e.spread ?? 2}
                  min={0}
                  max={50}
                  onChange={(spread) => update(i, { spread })}
                />
                <select
                  aria-label="획 위치"
                  value={e.y ?? "outside"}
                  onChange={(ev) => update(i, { y: ev.target.value as "inside" | "center" | "outside" })}
                >
                  <option value="inside">안쪽</option>
                  <option value="center">가운데</option>
                  <option value="outside">바깥쪽</option>
                </select>
              </div>
              <NumberField
                label="불투명도 %"
                min={0}
                max={100}
                value={e.opacity * 100}
                onChange={(v) => update(i, { opacity: v / 100 })}
              />
            </>
          )}
          {e.type === "gradientOverlay" && (
            <>
              <div className="two">
                <select
                  aria-label="그레이디언트 스타일"
                  value={e.gradientType ?? "linear"}
                  onChange={(ev) => update(i, { gradientType: ev.target.value as "linear" | "radial" })}
                >
                  <option value="linear">선형</option>
                  <option value="radial">방사형</option>
                </select>
                <NumberField
                  label="각도"
                  value={e.angle ?? 90}
                  min={0}
                  max={360}
                  onChange={(angle) => update(i, { angle })}
                />
              </div>
              <div className="gradient-stops">
                <label className="field">
                  색상 스톱
                  <div className="stop-list">
                    {(e.gradientStops ?? [{ color: "#ff0000", position: 0 }, { color: "#0000ff", position: 100 }]).map((stop, idx) => (
                      <div key={idx} className="stop-row">
                        <input
                          type="color"
                          value={stop.color}
                          onChange={(ev) => {
                            const stops = [...(e.gradientStops ?? [])];
                            stops[idx] = { ...stops[idx], color: ev.target.value };
                            update(i, { gradientStops: stops });
                          }}
                        />
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={stop.position}
                          onChange={(ev) => {
                            const stops = [...(e.gradientStops ?? [])];
                            stops[idx] = { ...stops[idx], position: Number(ev.target.value) };
                            update(i, { gradientStops: stops });
                          }}
                        />
                        <button
                          onClick={() => {
                            const stops = [...(e.gradientStops ?? [])];
                            stops.splice(idx, 1);
                            update(i, { gradientStops: stops });
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    className="section-add"
                    onClick={() => {
                      const stops = [...(e.gradientStops ?? []), { color: "#000000", position: 50 }];
                      update(i, { gradientStops: stops });
                    }}
                  >
                    ＋ 스톱 추가
                  </button>
                </label>
              </div>
            </>
          )}
          {e.type === "patternOverlay" && (
            <label className="field">
              패턴 URL
              <input
                type="text"
                value={e.pattern ?? ""}
                onChange={(ev) => update(i, { pattern: ev.target.value })}
                placeholder="https://example.com/pattern.png"
              />
            </label>
          )}
          {e.type === "satin" && (
            <>
              <NumberField
                label="불투명도 %"
                min={0}
                max={100}
                value={e.satinOpacity ?? 50}
                onChange={(v) => update(i, { satinOpacity: v })}
              />
              <NumberField
                label="블러"
                value={e.satinBlur ?? 10}
                min={0}
                max={100}
                onChange={(v) => update(i, { satinBlur: v })}
              />
              <NumberField
                label="Edge"
                value={e.satinEdge ?? 2}
                min={0}
                max={50}
                onChange={(v) => update(i, { satinEdge: v })}
              />
            </>
          )}
          {e.type === "bevelEmboss" && (
            <>
              <select
                aria-label="엠보스 스타일"
                value={e.bevelStyle ?? "outer"}
                onChange={(ev) => update(i, { bevelStyle: ev.target.value as "outer" | "inner" })}
              >
                <option value="outer">외부</option>
                <option value="inner">내부</option>
              </select>
              <NumberField
                label="깊이"
                value={e.bevelDepth ?? 10}
                min={0}
                max={100}
                onChange={(v) => update(i, { bevelDepth: v })}
              />
              <NumberField
                label="방향"
                value={e.bevelDirection ?? 120}
                min={0}
                max={360}
                onChange={(v) => update(i, { bevelDirection: v })}
              />
              <NumberField
                label="Blur"
                value={e.blur}
                min={0}
                max={100}
                onChange={(blur) => update(i, { blur })}
              />
            </>
          )}
        </div>
      ))}
      <button
        className="section-add"
        onClick={() => addEffect("shadow")}
      >
        ＋ 그림자 추가
      </button>
      <button
        className="section-add"
        onClick={() => addEffect("stroke")}
      >
        ＋ 획 (외곽선) 추가
      </button>
      <button
        className="section-add"
        onClick={() => addEffect("gradientOverlay")}
      >
        ＋ 그레이디언트 오버레이 추가
      </button>
    </Section>
  );
}
