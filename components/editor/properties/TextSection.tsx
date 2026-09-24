import FontPicker from "../FontPicker";
import { Section, NumberField, type SectionProps } from "./Fields";
export default function TextSection({ layer: l, patch }: SectionProps) {
  if (l.type !== "text") return null;
  return (
    <Section title="텍스트">
      <textarea
        aria-label="Text"
        value={l.text}
        onChange={(e) => patch({ text: e.target.value })}
      />
      <FontPicker
        value={l.fontFamily}
        onChange={(fontFamily) => patch({ fontFamily })}
      />
      <div className="two">
        <NumberField
          label="Font Size"
          value={l.fontSize}
          min={1}
          max={500}
          onChange={(fontSize) => patch({ fontSize })}
        />
        <label className="field">
          굵기
          <select
            aria-label="Font Weight"
            value={l.fontWeight}
            onChange={(e) => patch({ fontWeight: Number(e.target.value) })}
          >
            {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((w) => (
              <option key={w}>{w}</option>
            ))}
          </select>
        </label>
        <NumberField
          label="행간"
          min={0.5}
          max={4}
          step={0.1}
          value={l.lineHeight}
          onChange={(lineHeight) => patch({ lineHeight })}
        />
        <NumberField
          label="자간"
          min={-10}
          max={100}
          value={l.letterSpacing}
          onChange={(letterSpacing) => patch({ letterSpacing })}
        />
      </div>
      <select
        aria-label="텍스트 정렬"
        value={l.align}
        onChange={(e) => patch({ align: e.target.value as typeof l.align })}
      >
        <option value="left">왼쪽 정렬</option>
        <option value="center">가운데 정렬</option>
        <option value="right">오른쪽 정렬</option>
      </select>
    </Section>
  );
}
