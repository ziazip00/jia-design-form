import type { DesignLayer, Paint, Stroke, LayerEffect } from "../types/design";
export function fillsOf(l: DesignLayer): Paint[] {
  return (
    l.fills ??
    (l.type === "image"
      ? []
      : [
          {
            id: "legacy-fill",
            color: l.type === "text" ? l.color : l.fill,
            opacity: 1,
            visible: true,
          },
        ])
  );
}
export function strokesOf(l: DesignLayer): Stroke[] {
  return (
    l.strokes ??
    (l.type === "shape" && l.strokeWidth > 0
      ? [
          {
            id: "legacy-stroke",
            color: l.stroke,
            width: l.strokeWidth,
            opacity: 1,
            visible: true,
            position: "center",
          },
        ]
      : l.outlineEnabled
        ? [
            {
              id: "legacy-stroke",
              color: l.outlineColor || "#172f47",
              width: l.outlineWidth ?? 2,
              opacity: 1,
              visible: true,
              position: "center",
            },
          ]
        : [])
  );
}
export function effectsOf(l: DesignLayer): LayerEffect[] {
  if (l.effects) return l.effects;
  const result: LayerEffect[] = [];
  if (l.shadowEnabled ?? (l.shadowOpacity ?? 0) > 0)
    result.push({
      id: "legacy-shadow",
      type: "shadow",
      color: l.shadowColor || "#172f47",
      opacity: l.shadowOpacity ?? 0.35,
      visible: true,
      blur: l.shadowBlur ?? 12,
      x: l.shadowOffsetX ?? 0,
      y: l.shadowOffsetY ?? 8,
      spread: 0,
    });
  if (l.glowEnabled)
    result.push({
      id: "legacy-glow",
      type: "glow",
      color: l.glowColor || "#64b5ff",
      opacity: l.glowOpacity ?? 0.6,
      visible: true,
      blur: l.glowBlur ?? 20,
      x: 0,
      y: 0,
      spread: 0,
    });
  return result;
}
export function stylePadding(l: DesignLayer) {
  return Math.ceil(
    Math.max(
      0,
      ...strokesOf(l)
        .filter((s) => s.visible)
        .map((s) =>
          s.position === "inside"
            ? 0
            : s.position === "center"
              ? s.width / 2
              : s.width,
        ),
      ...effectsOf(l)
        .filter((e) => e.visible && e.type !== "inner")
        .map(
          (e) =>
            e.blur * 3 +
            Math.max(Math.abs(e.x), Math.abs(e.y)) +
            Math.abs(e.spread) +
            2,
        ),
    ),
  );
}
export function advancedStyle(l: DesignLayer) {
  return !!(
    l.fills ||
    l.strokes ||
    l.effects ||
    l.cornerRadius ||
    (l.type === "image" && (l.crop || l.paletteMap))
  );
}
export function alignedPosition(
  l: DesignLayer,
  canvas: { width: number; height: number },
  direction: string,
) {
  const a = (l.rotation * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a);
  const xs = [0, l.width * c, -l.height * s, l.width * c - l.height * s],
    ys = [0, l.width * s, l.height * c, l.width * s + l.height * c];
  const left = Math.min(...xs),
    right = Math.max(...xs),
    top = Math.min(...ys),
    bottom = Math.max(...ys);
  if (direction === "left") return { x: -left };
  if (direction === "center") return { x: (canvas.width - right - left) / 2 };
  if (direction === "right") return { x: canvas.width - right };
  if (direction === "top") return { y: -top };
  if (direction === "middle") return { y: (canvas.height - bottom - top) / 2 };
  return { y: canvas.height - bottom };
}
