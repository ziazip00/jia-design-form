import type { ImageLayer } from "../types/design";
import type { ImageAnalysis } from "./paletteDocument";
import { dominantColors, hex, recolorPixels } from "./paletteColors";
const analyses = new Map<string, Promise<ImageAnalysis>>();
export function analyzeImage(src: string): Promise<ImageAnalysis> {
  const cached = analyses.get(src);
  if (cached) return cached;
  const task = new Promise<ImageAnalysis>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 180 / Math.max(image.width, image.height));
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const colors = dominantColors(
          ctx.getImageData(0, 0, canvas.width, canvas.height).data,
        );
        canvas.width = 16;
        canvas.height = 16;
        ctx.drawImage(image, 0, 0, 16, 16);
        const data = ctx.getImageData(0, 0, 16, 16).data,
          grid: string[] = [];
        for (let i = 0; i < data.length; i += 4)
          grid.push(
            data[i + 3] < 128 ? "" : hex([data[i], data[i + 1], data[i + 2]]),
          );
        resolve({ colors, grid });
      } catch (e) {
        reject(e);
      }
    };
    image.onerror = () =>
      reject(new Error("이미지 색상을 분석하지 못했습니다."));
    image.src = src;
  });
  analyses.set(src, task);
  if (analyses.size > 12) analyses.delete(analyses.keys().next().value!);
  task.catch(() => analyses.delete(src));
  return task;
}
const rendered = new WeakMap<
  HTMLImageElement,
  Map<string, HTMLCanvasElement>
>();
export function paletteImage(
  image: HTMLImageElement,
  map: NonNullable<ImageLayer["paletteMap"]>,
) {
  const key = JSON.stringify(map),
    cache = rendered.get(image) ?? new Map<string, HTMLCanvasElement>(),
    old = cache.get(key);
  if (old) return old;
  const c = document.createElement("canvas"),
    scale = Math.min(1, 2048 / Math.max(image.width, image.height));
  c.width = Math.max(1, Math.round(image.width * scale));
  c.height = Math.max(1, Math.round(image.height * scale));
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0, c.width, c.height);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  data.data.set(recolorPixels(data.data, map.source, map.target));
  ctx.putImageData(data, 0, 0);
  cache.set(key, c);
  if (cache.size > 3) cache.delete(cache.keys().next().value!);
  rendered.set(image, cache);
  return c;
}
