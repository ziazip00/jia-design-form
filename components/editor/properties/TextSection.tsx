import FontPicker from "../FontPicker";
import { Section, NumberField, type SectionProps } from "./Fields";
const FONT_SIZE_OPTIONS = [
  8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 96,
];
const LETTER_SPACING_OPTIONS = [-10, -5, 0, 5, 10, 20];
const LINE_HEIGHT_OPTIONS = [
  { label: "자동", value: "auto" as const },
  { label: "100%", value: 1 },
  { label: "120%", value: 1.2 },
  { label: "140%", value: 1.4 },
  { label: "160%", value: 1.6 },
  { label: "180%", value: 1.8 },
  { label: "200%", value: 2 },
];
function FontSizeDropdown({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="field">
      글자 크기
      <select
        aria-label="글자 크기"
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!isNaN(v)) onChange(v);
        }}
        onBlur={(e) => {
          const v = Number(e.target.value);
          if (!isNaN(v) && v > 0) onChange(v);
          else e.target.value = value;
        }}
      >
        {FONT_SIZE_OPTIONS.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
        <option value={value}>직접 입력: {value}</option>
      </select>
      <input
        type="number"
        min={1}
        max={500}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!isNaN(v) && v > 0) onChange(v);
        }}
        style={{ width: 60, marginLeft: 8, padding: "2px 4px" }}
      />
    </label>
  );
}
function LetterSpacingDropdown({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="field">
      자간
      <select
        aria-label="자간"
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!isNaN(v)) onChange(v);
        }}
        onBlur={(e) => {
          const v = Number(e.target.value);
          if (!isNaN(v)) onChange(v);
          else e.target.value = value;
        }}
      >
        {LETTER_SPACING_OPTIONS.map((spacing) => (
          <option key={spacing} value={spacing}>
            {spacing}
          </option>
        ))}
        <option value={value}>직접 입력: {value}</option>
      </select>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!isNaN(v)) onChange(v);
        }}
        style={{ width: 60, marginLeft: 8, padding: "2px 4px" }}
      />
    </label>
  );
}
function LineHeightDropdown({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const currentOption = LINE_HEIGHT_OPTIONS.find(
    (opt) => opt.value === value || opt.label === "자동",
  );
  return (
    <label className="field">
      행간
      <select
        aria-label="행간"
        value={currentOption?.value ?? "auto"}
        onChange={(e) => {
          const val = e.target.value;
          if (val === "auto") {
            onChange(1.2);
          } else {
            const v = Number(val);
            if (!isNaN(v)) onChange(v);
          }
        }}
      >
        {LINE_HEIGHT_OPTIONS.map((opt) => (
          <option key={opt.label} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {typeof value === "number" && value !== 1.2 && (
        <input
          type="number"
          min={0.5}
          max={4}
          step={0.1}
          value={value}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (!isNaN(v) && v >= 0.5 && v <= 4) onChange(v);
          }}
          style={{ width: 60, marginLeft: 8, padding: "2px 4px" }}
        />
      )}
    </label>
  );
}
export default function TextSection({ layer: l, patch }: SectionProps) {
  if (l.type !== "text") return null;
  return (
    <Section title="텍스트">
      <label className="field">
        텍스트 박스 크기
        <select
          aria-label="텍스트 박스 크기"
          value={l.textSizing ?? "auto"}
          onChange={(e) =>
            patch({ textSizing: e.target.value as "auto" | "fixed" })
          }
        >
          <option value="auto">자동 너비 · 내용에 맞춤</option>
          <option value="fixed">고정 크기 · 수동 조절</option>
        </select>
      </label>
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
        <FontSizeDropdown
          value={l.fontSize}
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
        <LineHeightDropdown
          value={l.lineHeight}
          onChange={(lineHeight) => patch({ lineHeight })}
        />
        <LetterSpacingDropdown
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
