import { Section, NumberField, type SectionProps } from "./Fields";
export default function AppearanceSection({ layer: l, patch }: SectionProps) {
  return (
    <Section title="외형">
      <div className="two">
        <NumberField
          label="불투명도 %"
          value={l.opacity * 100}
          min={0}
          max={100}
          onChange={(v) => patch({ opacity: v / 100 })}
        />
        {(l.type === "image" ||
          (l.type === "shape" && l.shape !== "circle")) && (
          <NumberField
            label="모서리 반경"
            value={l.cornerRadius ?? (l.type === "shape" ? l.radius : 0)}
            min={0}
            max={Math.min(l.width, l.height) / 2}
            onChange={(cornerRadius) =>
              patch({
                cornerRadius,
                ...(l.type === "shape" ? { radius: cornerRadius } : {}),
              })
            }
          />
        )}
      </div>
    </Section>
  );
}
