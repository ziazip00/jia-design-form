import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { DesignLayer, LayerPatch } from "@/types/design";
export type SectionProps = {
  layer: DesignLayer;
  patch: (p: LayerPatch) => void;
};
export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <details className="property-section" open>
      <summary>
        {title}
        <span>⌄</span>
      </summary>
      <div className="section-content">{children}</div>
    </details>
  );
}
export function NumberField({
  label,
  value,
  onChange,
  min = -100000,
  max = 100000,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const [draft, setDraft] = useState(String(Math.round(value * 100) / 100));
  useEffect(() => setDraft(String(Math.round(value * 100) / 100)), [value]);
  return (
    <label className="field">
      {label}
      <input
        aria-label={label}
        type="number"
        value={draft}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          setDraft(e.target.value);
          const v = Number(e.target.value);
          if (
            e.target.value !== "" &&
            Number.isFinite(v) &&
            v >= min &&
            v <= max
          )
            onChange(v);
        }}
        onBlur={() => setDraft(String(Math.round(value * 100) / 100))}
      />
    </label>
  );
}
export function ColorField({
  value,
  onChange,
  label = "색상",
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  const [hex, setHex] = useState(value);
  useEffect(() => setHex(value), [value]);
  return (
    <div className="color-field">
      <input
        type="color"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <input
        aria-label={`${label} HEX`}
        value={hex.toUpperCase()}
        maxLength={7}
        onChange={(e) => {
          setHex(e.target.value);
          const v = e.target.value.startsWith("#")
            ? e.target.value
            : "#" + e.target.value;
          if (/^#[a-f\d]{6}$/i.test(v)) onChange(v);
        }}
        onBlur={() => setHex(value)}
      />
    </div>
  );
}
