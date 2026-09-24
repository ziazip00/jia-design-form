import type { DesignDocument, DesignLayer } from "../types/design";
import { fillsOf } from "./layerStyles";
import { dominantColors, mapColor, mix, readableColor } from "./paletteColors";
export interface ColorOrigin {
  source?: string;
  colors: Record<string, string>;
  paletteMap?: Extract<DesignLayer, { type: "image" }>["paletteMap"];
}
export interface ColorOrigins {
  canvas: Record<string, string>;
  layers: Record<string, ColorOrigin[]>;
}
export interface ImageAnalysis {
  colors: string[];
  grid: string[];
}
export type ImageAnalyses = Record<string, ImageAnalysis>;
const keys = [
  "color",
  "fill",
  "stroke",
  "shadowColor",
  "outlineColor",
  "glowColor",
] as const;
export function colorsOf(l: DesignLayer) {
  const c: Record<string, string> = {};
  const obj = l as unknown as Record<string, unknown>;
  keys.forEach((k) => {
    if (typeof obj[k] === "string") c[k] = obj[k] as string;
  });
  for (const name of ["fills", "strokes", "effects"] as const)
    l[name]?.forEach((p) => (c[`${name}:${p.id}`] = p.color));
  return c;
}
export function originOf(l: DesignLayer, origins: ColorOrigins) {
  return origins.layers[l.id]?.find(
    (o) => o.source === (l.type === "image" ? l.src : undefined),
  );
}
export function captureOrigins(
  doc: DesignDocument,
  origins: ColorOrigins,
): ColorOrigins {
  const layers = { ...origins.layers };
  for (const l of doc.layers) {
    const old = originOf(l, origins),
      colors = colorsOf(l);
    if (!old) {
      layers[l.id] = [
        ...(layers[l.id] ?? []),
        {
          source: l.type === "image" ? l.src : undefined,
          colors,
          paletteMap: l.type === "image" ? l.paletteMap : undefined,
        },
      ];
    } else if (Object.keys(colors).some((k) => !(k in old.colors))) {
      const updated = { ...old, colors: { ...colors, ...old.colors } };
      layers[l.id] = layers[l.id].map((o) => (o === old ? updated : o));
    }
  }
  return {
    canvas: { [doc.id]: doc.canvas.background, ...origins.canvas },
    layers,
  };
}
function replaceColors(
  l: DesignLayer,
  colors: Record<string, string>,
): DesignLayer {
  const result = { ...l } as unknown as Record<string, unknown>;
  for (const k of keys) if (colors[k] !== undefined) result[k] = colors[k];
  for (const name of ["fills", "strokes", "effects"] as const)
    if (l[name])
      result[name] = l[name]!.map((p) => ({
        ...p,
        color: colors[`${name}:${p.id}`] ?? p.color,
      }));
  return result as unknown as DesignLayer;
}
export function originalDocument(
  doc: DesignDocument,
  origins: ColorOrigins,
): DesignDocument {
  return {
    ...doc,
    palette: undefined,
    canvas: {
      ...doc.canvas,
      background: origins.canvas[doc.id] ?? doc.canvas.background,
    },
    layers: doc.layers.map((l) => {
      if (l.locked || !l.visible) return l;
      const o = originOf(l, origins);
      if (!o) return l;
      const result = replaceColors(l, o.colors);
      return result.type === "image"
        ? { ...result, paletteMap: o.paletteMap }
        : result;
    }),
  };
}
export function designColors(doc: DesignDocument) {
  const pixels: number[] = [];
  for (const l of doc.layers.filter((l) => l.visible && !l.locked)) {
    for (const color of Object.values(colorsOf(l))) {
      if (!/^#[0-9a-f]{6}$/i.test(color)) continue;
      pixels.push(
        ...[1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16)),
        255,
      );
    }
  }
  pixels.push(
    ...[1, 3, 5].map((i) =>
      parseInt(doc.canvas.background.slice(i, i + 2), 16),
    ),
    255,
  );
  return dominantColors(new Uint8ClampedArray(pixels));
}
function localPoint(l: DesignLayer, x: number, y: number) {
  const a = (-l.rotation * Math.PI) / 180,
    dx = x - l.x,
    dy = y - l.y;
  return {
    x: dx * Math.cos(a) - dy * Math.sin(a),
    y: dx * Math.sin(a) + dy * Math.cos(a),
  };
}
function backdrop(
  doc: DesignDocument,
  index: number,
  x: number,
  y: number,
  analyses: ImageAnalyses,
) {
  let color = doc.canvas.background;
  for (const l of doc.layers.slice(0, index)) {
    if (!l.visible || l.type === "text") continue;
    const p = localPoint(l, x, y);
    if (p.x < 0 || p.y < 0 || p.x > l.width || p.y > l.height) continue;
    if (
      l.type === "shape" &&
      l.shape === "circle" &&
      (p.x / l.width - 0.5) ** 2 + (p.y / l.height - 0.5) ** 2 > 0.25
    )
      continue;
    if (l.type === "image") {
      const grid = analyses[l.id]?.grid;
      if (!grid) continue;
      let nx = p.x / l.width,
        ny = p.y / l.height;
      if (l.flipX) nx = 1 - nx;
      if (l.flipY) ny = 1 - ny;
      const crop = l.crop ?? { x: 0, y: 0, width: 1, height: 1 };
      const at =
        Math.min(15, Math.floor((crop.y + ny * crop.height) * 16)) * 16 +
        Math.min(15, Math.floor((crop.x + nx * crop.width) * 16));
      let c = grid[at];
      if (!c) continue;
      if (l.paletteMap)
        c = mapColor(c, l.paletteMap.source, l.paletteMap.target);
      color = mix(c, color, l.opacity);
    } else
      for (const f of fillsOf(l).filter((f) => f.visible))
        color = mix(f.color, color, l.opacity * f.opacity);
  }
  return color;
}
export function applyPalette(
  doc: DesignDocument,
  origins: ColorOrigins,
  source: string[],
  target: string[],
  id: string,
  analyses: ImageAnalyses,
  includeImages = true,
) {
  const original = originalDocument(doc, origins);
  const vectorSource = original.layers.some(l => l.type !== 'image' && l.visible && !l.locked) ? designColors(original) : source;
  let next: DesignDocument = {
    ...doc,
    palette: { id, colors: [...target] },
    canvas: {
      ...doc.canvas,
      background: mapColor(original.canvas.background, vectorSource, target),
    },
    layers: original.layers.map((l) => {
      if (l.locked || !l.visible) return l;
      const values = colorsOf(l);
      for (const k of Object.keys(values))
        values[k] = mapColor(values[k], vectorSource, target);
      let result = replaceColors(l, values);
      if (result.type === "image") {
        const analysis = analyses[l.id];
        const current = doc.layers.find((n) => n.id === l.id);
        result = {
          ...result,
          paletteMap:
            includeImages && analysis
              ? { source: analysis.colors, target: [...target] }
              : current?.type === "image"
                ? current.paletteMap
                : undefined,
        };
      }
      return result;
    }),
  };
  let warnings = 0;
  next = {
    ...next,
    layers: next.layers.map((l, index) => {
      if (l.type !== "text" || l.locked || !l.visible) return l;
      const a = (l.rotation * Math.PI) / 180;
      const backgrounds = [
        [0.15, 0.25],
        [0.5, 0.5],
        [0.85, 0.75],
      ].map(([u, v]) =>
        backdrop(
          next,
          index,
          l.x + l.width * u * Math.cos(a) - l.height * v * Math.sin(a),
          l.y + l.width * u * Math.sin(a) + l.height * v * Math.cos(a),
          analyses,
        ),
      );
      let warning = false;
      const color = readableColor(l.color, backgrounds, l.opacity);
      warning ||= color.warning;
      const fills = l.fills?.map((f) => {
        const c = readableColor(f.color, backgrounds, l.opacity * f.opacity);
        if (f.visible) warning ||= c.warning;
        return { ...f, color: c.color };
      });
      if (warning) warnings++;
      return { ...l, color: color.color, ...(fills ? { fills } : {}) };
    }),
  };
  return { document: next, warnings };
}
