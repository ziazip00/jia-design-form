import Konva from "konva";
import {paletteImage} from './paletteImage';
import type { DesignLayer } from "../types/design";
import { fillsOf, strokesOf, effectsOf, stylePadding } from "./layerStyles";
export const iconPath = (icon: string) =>
  icon === "heart"
    ? "M50 90 L12 52 C-18 14 30 -5 50 24 C70 -5 118 14 88 52 Z"
    : icon === "star"
      ? "M50 0 L62 35 L100 38 L70 61 L80 100 L50 77 L20 100 L30 61 L0 38 L38 35 Z"
      : "M50 0 Q55 45 100 50 Q55 55 50 100 Q45 55 0 50 Q45 45 50 0 Z";
function surface(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
// Separable alpha morphology. A deque keeps spread/stroke work linear in pixel count.
export function morphAlpha(
  input: Uint8ClampedArray,
  w: number,
  h: number,
  radius: number,
  erode = false,
) {
  const r = Math.max(0, Math.ceil(radius));
  if (!r) return new Uint8ClampedArray(input);
  let source = new Uint8ClampedArray(w * h);
  for (let i = 0; i < source.length; i++) source[i] = input[i * 4 + 3];
  for (const vertical of [false, true]) {
    const out = new Uint8ClampedArray(w * h),
      len = vertical ? h : w,
      lines = vertical ? w : h;
    for (let line = 0; line < lines; line++) {
      const queue = new Int32Array(len + 2 * r + 1),
        values = new Uint8ClampedArray(len + 2 * r + 1);
      let head = 0,
        tail = 0;
      for (let j = -r; j < len + r; j++) {
        const value =
          j < 0 || j >= len
            ? 0
            : source[vertical ? j * w + line : line * w + j];
        while (
          tail > head &&
          (erode ? values[tail - 1] >= value : values[tail - 1] <= value)
        )
          tail--;
        queue[tail] = j;
        values[tail++] = value;
        while (tail > head && queue[head] < j - 2 * r) head++;
        const at = j - r;
        if (at >= 0 && at < len)
          out[vertical ? at * w + line : line * w + at] = values[head];
      }
    }
    source = out;
  }
  const result = new Uint8ClampedArray(input.length);
  for (let i = 0; i < source.length; i++)
    result.set([255, 255, 255, source[i]], i * 4);
  return result;
}
export function renderLayerStyle(l: DesignLayer, image?: HTMLImageElement) {
  const padding = Math.ceil(
      Math.max(
        2,
        stylePadding(l),
        ...effectsOf(l)
          .filter((e) => e.visible && e.type === "inner")
          .map(
            (e) =>
              e.blur * 3 +
              Math.max(Math.abs(e.x), Math.abs(e.y)) +
              Math.abs(e.spread) +
              2,
          ),
      ),
    ),
    scale = Math.min(1, 4096 / (Math.max(l.width, l.height) + padding * 2));
  const w = Math.max(1, Math.ceil((l.width + padding * 2) * scale)),
    h = Math.max(1, Math.ceil((l.height + padding * 2) * scale));
  const blank = () => surface(w, h),
    mask = blank(),
    m = mask.getContext("2d")!;
  let node: Konva.Shape;
  if (l.type === "text")
    node = new Konva.Text({
      text: l.text,
      wrap: l.textSizing === "fixed" ? "word" : "none",
      width: l.width,
      height: l.height,
      fontFamily: l.fontFamily,
      fontSize: l.fontSize,
      fontStyle: String(l.fontWeight),
      lineHeight: l.lineHeight,
      letterSpacing: l.letterSpacing,
      align: l.align,
      fill: "#fff",
    });
  else if (l.type === "icon")
    node = new Konva.Path({
      data: iconPath(l.icon),
      scaleX: l.width / 100,
      scaleY: l.height / 100,
      fill: "#fff",
    });
  else if (l.type === "shape" && l.shape === "circle")
    node = new Konva.Ellipse({
      x: l.width / 2,
      y: l.height / 2,
      radiusX: l.width / 2,
      radiusY: l.height / 2,
      fill: "#fff",
    });
  else
    node = new Konva.Rect({
      width: l.width,
      height: l.height,
      cornerRadius: l.cornerRadius ?? (l.type === "shape" ? l.radius : 0),
      fill: "#fff",
    });
  m.drawImage(
    node.toCanvas({
      x: -padding,
      y: -padding,
      width: l.width + padding * 2,
      height: l.height + padding * 2,
      pixelRatio: scale,
    }),
    0,
    0,
  );
  node.destroy();
  const base = blank(),
    b = base.getContext("2d")!;
  if (l.type === "image" && image) {
    const painted=l.paletteMap?paletteImage(image,l.paletteMap):image;
    const crop = l.crop ?? { x: 0, y: 0, width: 1, height: 1 };
    b.save();
    b.translate(
      (padding + (l.flipX ? l.width : 0)) * scale,
      (padding + (l.flipY ? l.height : 0)) * scale,
    );
    b.scale(l.flipX ? -1 : 1, l.flipY ? -1 : 1);
    b.drawImage(
      painted,
      crop.x * painted.width,
      crop.y * painted.height,
      crop.width * painted.width,
      crop.height * painted.height,
      0,
      0,
      l.width * scale,
      l.height * scale,
    );
    b.restore();
    b.globalCompositeOperation = "destination-in";
    b.drawImage(mask, 0, 0);
    b.globalCompositeOperation = "source-over";
  } else
    for (const fill of fillsOf(l).filter((f) => f.visible)) {
      const c = blank(),
        ctx = c.getContext("2d")!;
      ctx.drawImage(mask, 0, 0);
      ctx.globalCompositeOperation = "source-in";
      ctx.fillStyle = fill.color;
      ctx.globalAlpha = fill.opacity;
      ctx.fillRect(0, 0, w, h);
      b.drawImage(c, 0, 0);
    }
  const raw = m.getImageData(0, 0, w, h).data;
  for (const stroke of strokesOf(l).filter((s) => s.visible && s.width > 0)) {
    const outside =
      stroke.position === "inside"
        ? raw
        : morphAlpha(
            raw,
            w,
            h,
            (stroke.width * scale) / (stroke.position === "center" ? 2 : 1),
          );
    const inside =
      stroke.position === "outside"
        ? raw
        : morphAlpha(
            raw,
            w,
            h,
            (stroke.width * scale) / (stroke.position === "center" ? 2 : 1),
            true,
          );
    const pixels = new Uint8ClampedArray(raw.length);
    for (let i = 3; i < pixels.length; i += 4)
      pixels[i] = Math.max(0, outside[i] - inside[i]);
    const c = blank(),
      ctx = c.getContext("2d")!;
    ctx.putImageData(new ImageData(pixels, w, h), 0, 0);
    ctx.globalCompositeOperation = "source-in";
    ctx.globalAlpha = stroke.opacity;
    ctx.fillStyle = stroke.color;
    ctx.fillRect(0, 0, w, h);
    b.drawImage(c, 0, 0);
  }
  const result = blank(),
    ctx = result.getContext("2d")!;
  const silhouette = b.getImageData(0, 0, w, h).data;
  for (const effect of effectsOf(l).filter(
    (e) => e.visible && e.type !== "blur" && e.type !== "inner",
  )) {
    const c = blank(),
      cc = c.getContext("2d")!;
    cc.putImageData(
      new ImageData(
        morphAlpha(
          silhouette,
          w,
          h,
          Math.abs(effect.spread) * scale,
          effect.spread < 0,
        ),
        w,
        h,
      ),
      0,
      0,
    );
    cc.globalCompositeOperation = "source-in";
    cc.fillStyle = effect.color;
    cc.fillRect(0, 0, w, h);
    ctx.save();
    ctx.globalAlpha = effect.opacity;
    ctx.filter = `blur(${(effect.blur * scale) / 2}px)`;
    ctx.drawImage(c, effect.x * scale, effect.y * scale);
    ctx.restore();
  }
  ctx.drawImage(base, 0, 0);
  for (const effect of effectsOf(l).filter(
    (e) => e.visible && e.type === "inner",
  )) {
    const inverse = new Uint8ClampedArray(silhouette);
    for (let i = 3; i < inverse.length; i += 4) inverse[i] = 255 - inverse[i];
    const c = blank(),
      cc = c.getContext("2d")!;
    cc.putImageData(
      new ImageData(
        morphAlpha(
          inverse,
          w,
          h,
          Math.abs(effect.spread) * scale,
          effect.spread < 0,
        ),
        w,
        h,
      ),
      0,
      0,
    );
    cc.globalCompositeOperation = "source-in";
    cc.fillStyle = effect.color;
    cc.fillRect(0, 0, w, h);
    const shadow = blank(),
      sc = shadow.getContext("2d")!;
    sc.filter = `blur(${(effect.blur * scale) / 2}px)`;
    sc.drawImage(c, effect.x * scale, effect.y * scale);
    sc.filter = "none";
    sc.globalCompositeOperation = "destination-in";
    sc.drawImage(base, 0, 0);
    ctx.globalAlpha = effect.opacity;
    ctx.drawImage(shadow, 0, 0);
    ctx.globalAlpha = 1;
  }
  const blur = effectsOf(l)
    .filter((e) => e.visible && e.type === "blur")
    .reduce((n, e) => n + e.blur, 0);
  if (blur) {
    const c = blank(),
      cc = c.getContext("2d")!;
    cc.filter = `blur(${(blur * scale) / 2}px)`;
    cc.drawImage(result, 0, 0);
    return { canvas: c, padding, scale };
  }
  return { canvas: result, padding, scale };
}
