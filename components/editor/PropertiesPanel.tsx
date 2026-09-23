import { SlidersHorizontal, MousePointer2 } from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import FontPicker from "./FontPicker";
function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="field">
      {label}
      <input
        aria-label={label}
        key={value}
        type="number"
        defaultValue={Math.round(value * 100) / 100}
        min={min}
        max={max}
        step={step}
        onBlur={(e) => {
          const v = Number(e.target.value);
          if (e.target.value !== "" && Number.isFinite(v))
            onChange(Math.max(min ?? -100000, Math.min(max ?? 100000, v)));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
    </label>
  );
}
function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="field">
      {label}
      <div className="color-field">
        <input
          aria-label={label}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span>{value.toUpperCase()}</span>
      </div>
    </label>
  );
}
export default function PropertiesPanel() {
  const s = useEditorStore(),
    l = s.document.layers.find((l) => l.id === s.selectedId);
  const patch = (v: Record<string, unknown>) => l && s.patch(l.id, v);
  return (
    <aside className="properties">
      <div className="panel-heading">
        <SlidersHorizontal size={16} />
        <h2>속성</h2>
      </div>
      {!l ? (
        <>
          <div className="selection-empty">
            <MousePointer2 size={28} />
            <h3>디자인을 자유롭게</h3>
            <p>
              캔버스나 레이어 목록에서
              <br />
              편집할 요소를 선택하세요.
            </p>
          </div>
          <section>
            <h3>캔버스</h3>
            <ColorField
              label="배경 색상"
              value={s.document.canvas.background}
              onChange={(background) =>
                s.commit({
                  ...s.document,
                  canvas: { ...s.document.canvas, background },
                })
              }
            />
            <p className="hint">
              {s.document.canvas.width} × {s.document.canvas.height} px
            </p>
          </section>
          <section className="shortcuts">
            <h3>작업을 더 빠르게</h3>
            <p>
              실행 취소 <kbd>Ctrl Z</kbd>
            </p>
            <p>
              다시 실행 <kbd>Ctrl Shift Z</kbd>
            </p>
            <p>
              복제 <kbd>Ctrl D</kbd>
            </p>
            <p>
              삭제 <kbd>Delete</kbd>
            </p>
            <p>
              미세 이동 <kbd>↑ ↓ ← →</kbd>
            </p>
          </section>
        </>
      ) : (
        <>
          <section>
            <div className="section-title">
              <h3>{l.name}</h3>
              <span className="type-tag">{l.type}</span>
            </div>
            <div className="checks">
              <label>
                <input
                  type="checkbox"
                  checked={l.visible}
                  onChange={(e) => patch({ visible: e.target.checked })}
                />{" "}
                표시
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={l.locked}
                  onChange={(e) => patch({ locked: e.target.checked })}
                />{" "}
                잠금
              </label>
            </div>
          </section>
          <fieldset disabled={l.locked}>
            <section>
              <h3>위치와 크기</h3>
              <div className="two">
                {(
                  ["x", "y", "width", "height", "rotation", "opacity"] as const
                ).map((key) => (
                  <NumberField
                    key={key}
                    label={
                      {
                        x: "X",
                        y: "Y",
                        width: "Width",
                        height: "Height",
                        rotation: "Rotation",
                        opacity: "Opacity",
                      }[key]
                    }
                    value={l[key]}
                    min={
                      ["width", "height"].includes(key)
                        ? 10
                        : key === "opacity"
                          ? 0
                          : undefined
                    }
                    max={key === "opacity" ? 1 : undefined}
                    step={key === "opacity" ? 0.05 : 1}
                    onChange={(v) => {
                      if (
                        l.type === "image" &&
                        l.keepRatio &&
                        (key === "width" || key === "height")
                      )
                        patch(
                          key === "width"
                            ? { width: v, height: (l.height * v) / l.width }
                            : { height: v, width: (l.width * v) / l.height },
                        );
                      else patch({ [key]: v });
                    }}
                  />
                ))}
              </div>
            </section>
            {l.type === "text" && (
              <section>
                <h3>텍스트</h3>
                <label className="field">
                  Text
                  <textarea
                    aria-label="Text"
                    key={l.id + l.text}
                    defaultValue={l.text}
                    onBlur={(e) => patch({ text: e.target.value })}
                  />
                </label>
                <FontPicker
                  key={l.id}
                  value={l.fontFamily}
                  onChange={(fontFamily) => s.patch(l.id, { fontFamily })}
                />
                <div className="two">
                  <NumberField
                    label="Font Size"
                    value={l.fontSize}
                    min={6}
                    max={500}
                    onChange={(fontSize) => patch({ fontSize })}
                  />
                  <label className="field">
                    Font Weight
                    <select
                      aria-label="Font Weight"
                      value={l.fontWeight}
                      onChange={(e) =>
                        patch({ fontWeight: Number(e.target.value) })
                      }
                    >
                      {[300, 400, 500, 600, 700, 800, 900].map((w) => (
                        <option key={w}>{w}</option>
                      ))}
                    </select>
                  </label>
                  <NumberField
                    label="Line Height"
                    value={l.lineHeight}
                    min={0.5}
                    max={4}
                    step={0.1}
                    onChange={(lineHeight) => patch({ lineHeight })}
                  />
                  <NumberField
                    label="Letter Spacing"
                    value={l.letterSpacing}
                    min={-10}
                    max={100}
                    onChange={(letterSpacing) => patch({ letterSpacing })}
                  />
                </div>
                <label className="field">
                  Text Align
                  <select
                    aria-label="Text Align"
                    value={l.align}
                    onChange={(e) => patch({ align: e.target.value })}
                  >
                    <option value="left">왼쪽 정렬</option>
                    <option value="center">가운데 정렬</option>
                    <option value="right">오른쪽 정렬</option>
                  </select>
                </label>
                <ColorField
                  label="Text Color"
                  value={l.color}
                  onChange={(color) => patch({ color })}
                />
              </section>
            )}
            {l.type === "image" && (
              <section>
                <h3>이미지</h3>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={l.keepRatio}
                    onChange={(e) => patch({ keepRatio: e.target.checked })}
                  />{" "}
                  비율 유지
                </label>
                <div className="two">
                  <button onClick={() => patch({ flipX: !l.flipX })}>
                    좌우 반전
                  </button>
                  <button onClick={() => patch({ flipY: !l.flipY })}>
                    상하 반전
                  </button>
                </div>
              </section>
            )}
            {(l.type === "shape" || l.type === "icon") && (
              <section>
                <h3>모양</h3>
                <ColorField
                  label="Fill"
                  value={l.fill}
                  onChange={(fill) => patch({ fill })}
                />
                {l.type === "shape" && (
                  <>
                    <ColorField
                      label="Border Color"
                      value={l.stroke}
                      onChange={(stroke) => patch({ stroke })}
                    />
                    <div className="two">
                      <NumberField
                        label="Border Width"
                        value={l.strokeWidth}
                        min={0}
                        max={100}
                        onChange={(strokeWidth) => patch({ strokeWidth })}
                      />
                      {l.shape !== "circle" && (
                        <NumberField
                          label="Border Radius"
                          value={l.radius}
                          min={0}
                          max={1000}
                          onChange={(radius) => patch({ radius })}
                        />
                      )}
                    </div>
                  </>
                )}
              </section>
            )}
          </fieldset>
        </>
      )}
    </aside>
  );
}
