import Konva from "konva";
import type { TextLayer, DesignDocument } from "../types/design";
export const textMetricKeys = [
  "text",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "textSizing",
] as const;
export function autoTextSize(layer: TextLayer) {
  const node = new Konva.Text({
    text: layer.text.replace(/\r\n?/g, "\n"),
    fontFamily: layer.fontFamily,
    fontSize: layer.fontSize,
    fontStyle: String(layer.fontWeight),
    lineHeight: layer.lineHeight,
    letterSpacing: layer.letterSpacing,
    wrap: "none",
    padding: 0,
  });
  const size = {
    width: Math.max(1, Math.ceil(node.width())),
    height: Math.max(1, Math.ceil(node.height())),
  };
  node.destroy();
  return size;
}
export function fitText(
  layer: TextLayer,
  measure: (l: TextLayer) => { width: number; height: number } = autoTextSize,
): TextLayer {
  if (
    layer.textSizing === "fixed" ||
    (measure === autoTextSize && typeof document === "undefined")
  )
    return layer;
  const size = measure(layer);
  return size.width === layer.width && size.height === layer.height
    ? layer
    : { ...layer, ...size };
}
export function fitDocumentText(
  doc: DesignDocument,
  previous?: DesignDocument,
  force = false,
): DesignDocument {
  let changed = false;
  const layers = doc.layers.map((l) => {
    if (l.type !== "text") return l;
    const old = previous?.layers.find((p) => p.id === l.id);
    if (
      !force &&
      old?.type === "text" &&
      textMetricKeys.every((k) => old[k] === l[k])
    )
      return l;
    const next = fitText(l);
    changed ||= next !== l;
    return next;
  });
  return changed ? { ...doc, layers } : doc;
}
export function textResizeMode(old: TextLayer, patch: Record<string, unknown>) {
  return patch.textSizing === undefined &&
    (["width", "height"] as const).some(
      (k) =>
        typeof patch[k] === "number" &&
        Math.abs((patch[k] as number) - old[k]) > 0.5,
    )
    ? { ...patch, textSizing: "fixed" }
    : patch;
}
