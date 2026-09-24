export type RGB = [number, number, number];
export const clamp = (v: number, min = 0, max = 1) =>
  Math.max(min, Math.min(max, v));
export const rgb = (hex: string): RGB =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
export const hex = (c: RGB) =>
  "#" +
  c
    .map((v) =>
      Math.round(clamp(v, 0, 255))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
export function hsl(c: RGB): RGB {
  const [r, g, b] = c.map((v) => v / 255),
    hi = Math.max(r, g, b),
    lo = Math.min(r, g, b),
    d = hi - lo,
    l = (hi + lo) / 2;
  let h = 0;
  if (d)
    h =
      hi === r
        ? ((g - b) / d + 6) % 6
        : hi === g
          ? (b - r) / d + 2
          : (r - g) / d + 4;
  return [h * 60, d ? d / (1 - Math.abs(2 * l - 1)) : 0, l];
}
export function fromHsl([h, s, l]: RGB): RGB {
  h = ((h % 360) + 360) % 360;
  s = clamp(s);
  l = clamp(l);
  const a = s * Math.min(l, 1 - l);
  return [0, 8, 4].map((n) => {
    const k = (n + h / 30) % 12;
    return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
  }) as RGB;
}
export function luminance(color: string) {
  const c = rgb(color).map((v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
}
export function contrast(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function mix(a: string, b: string, opacity: number) {
  const x = rgb(a),
    y = rgb(b);
  return hex(x.map((v, i) => v * opacity + y[i] * (1 - opacity)) as RGB);
}
export const distance = (a: RGB, b: RGB) =>
  2 * (a[0] - b[0]) ** 2 + 4 * (a[1] - b[1]) ** 2 + 3 * (a[2] - b[2]) ** 2;
export function nearest(color: string, colors: string[]) {
  const c = rgb(color);
  let best = Infinity,
    index = 0;
  colors.forEach((v, i) => {
    const d = distance(c, rgb(v));
    if (d < best) {
      best = d;
      index = i;
    }
  });
  return index;
}
export function mapColor(color: string, source: string[], target: string[]) {
  if (!source.length || !target.length) return color;
  return target[
    Math.round(
      (nearest(color, source) * (target.length - 1)) /
        Math.max(1, source.length - 1),
    )
  ];
}
export function readableColor(
  color: string,
  backgrounds: string[],
  opacity = 1,
) {
  const score = (c: string) =>
    Math.min(...backgrounds.map((bg) => contrast(mix(c, bg, opacity), bg)));
  if (score(color) >= 4.5) return { color, warning: false };
  const [h, s, l] = hsl(rgb(color));
  let best = color,
    bestScore = score(color),
    bestDistance = Infinity,
    found = false;
  for (let i = 0; i <= 100; i++) {
    const c = hex(fromHsl([h, s, i / 100])),
      value = score(c),
      delta = Math.abs(i / 100 - l);
    if (value >= 4.5 && delta < bestDistance) {
      best = c;
      bestDistance = delta;
      found = true;
    } else if (!found && value > bestScore) {
      best = c;
      bestScore = value;
    }
  }
  return { color: best, warning: score(best) < 4.5 };
}
// Weighted color quantization, independent of pixel position. Transparent pixels never vote.
export function dominantColors(pixels: Uint8ClampedArray, count = 5) {
  const bins = new Map<number, { sum: RGB; weight: number }>();
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 24) continue;
    const key =
        (pixels[i] >> 4) * 256 +
        (pixels[i + 1] >> 4) * 16 +
        (pixels[i + 2] >> 4),
      weight = pixels[i + 3] / 255,
      b = bins.get(key) ?? { sum: [0, 0, 0] as RGB, weight: 0 };
    for (let c = 0; c < 3; c++) b.sum[c] += pixels[i + c] * weight;
    b.weight += weight;
    bins.set(key, b);
  }
  const points = [...bins.values()]
    .map((b) => ({
      color: b.sum.map((v) => v / b.weight) as RGB,
      weight: b.weight,
    }))
    .sort((a, b) => b.weight - a.weight);
  if (!points.length)
    return ["#ffffff", "#dcecf4", "#7fa5b8", "#456775", "#172f47"];
  const centers: RGB[] = [points[0].color];
  while (centers.length < Math.min(count, points.length)) {
    let best = points[0],
      score = 0;
    for (const p of points) {
      const d =
        Math.min(...centers.map((c) => distance(c, p.color))) *
        Math.sqrt(p.weight);
      if (d > score) {
        score = d;
        best = p;
      }
    }
    if (score < 100) break;
    centers.push(best.color);
  }
  for (let k = 0; k < 6; k++) {
    const groups = centers.map(() => ({ sum: [0, 0, 0] as RGB, weight: 0 }));
    for (const p of points) {
      let at = 0,
        d = Infinity;
      centers.forEach((c, i) => {
        const n = distance(c, p.color);
        if (n < d) {
          d = n;
          at = i;
        }
      });
      const g = groups[at];
      g.weight += p.weight;
      p.color.forEach((v, i) => (g.sum[i] += v * p.weight));
    }
    groups.forEach((g, i) => {
      if (g.weight) centers[i] = g.sum.map((v) => v / g.weight) as RGB;
    });
  }
  const colors = centers.map(hex);
  while (colors.length < count) {
    const base = hsl(rgb(colors[0]));
    colors.push(hex(fromHsl([base[0], base[1] * 0.7, colors.length / count])));
  }
  return colors.sort((a, b) => luminance(b) - luminance(a));
}
export interface Palette {
  id: string;
  name: string;
  colors: string[];
}
export function recommendPalettes(source: string[]): Palette[] {
  const base = source.slice(0, 5);
  while (base.length < 5) base.push("#172f47");
  const change = (fn: (v: RGB, i: number) => RGB) =>
    base.map((c, i) => hex(fromHsl(fn(hsl(rgb(c)), i))));
  return [
    { id: "source", name: "원본 이미지 기반", colors: base },
    {
      id: "analogous",
      name: "유사 색상",
      colors: change(([h, s, l], i) => [h + 25, s, l]),
    },
    {
      id: "accent",
      name: "보색 · 포인트",
      colors: change(([h, s, l], i) => [
        h + (i === 2 || i === 3 ? 180 : 0),
        Math.max(s, i === 2 ? 0.65 : 0.12),
        l,
      ]),
    },
    {
      id: "light",
      name: "밝은 팔레트",
      colors: change(([h, s, l], i) => [
        h,
        s * 0.75,
        i === 4 ? Math.min(l, 0.22) : Math.min(0.97, l * 0.65 + 0.3),
      ]),
    },
    {
      id: "calm",
      name: "차분한 팔레트",
      colors: change(([h, s, l]) => [h, s * 0.35, l]),
    },
    {
      id: "ocean",
      name: "하늘과 바다",
      colors: ["#f2f8fa", "#c5e8ed", "#28cbe9", "#337e9b", "#123b50"],
    },
    {
      id: "terra",
      name: "따뜻한 테라코타",
      colors: ["#fff5eb", "#e8d8c3", "#e8622c", "#8d664b", "#302c29"],
    },
  ];
}
// A separate replacement for each color cluster; retain intra-region shading and texture.
export function recolorPixels(
  pixels: Uint8ClampedArray,
  source: string[],
  target: string[],
) {
  if (!source.length || !target.length) return new Uint8ClampedArray(pixels);
  const output = new Uint8ClampedArray(pixels),
    cache = new Map<number, RGB>();
  for (let i = 0; i < pixels.length; i += 4) {
    if (!pixels[i + 3]) continue;
    const key =
      (pixels[i] >> 3) * 1024 +
      (pixels[i + 1] >> 3) * 32 +
      (pixels[i + 2] >> 3);
    let delta = cache.get(key);
    if (!delta) {
      const c: RGB = [
          (pixels[i] >> 3) * 8 + 4,
          (pixels[i + 1] >> 3) * 8 + 4,
          (pixels[i + 2] >> 3) * 8 + 4,
        ],
        at = nearest(hex(c), source),
        old = hsl(rgb(source[at])),
        to = hsl(
          rgb(
            target[
              Math.round(
                (at * (target.length - 1)) / Math.max(1, source.length - 1),
              )
            ],
          ),
        ),
        current = hsl(c);
      let light = clamp(to[2] + (current[2] - old[2]) * 0.85);
      if (current[2] < 0.12) light = Math.min(light, current[2] + 0.025);
      const mapped = fromHsl([
        to[0],
        clamp(to[1] * (old[1] > 0.05 ? current[1] / old[1] : 1), 0, 1),
        light,
      ]);
      delta = mapped.map((v, j) => v - c[j]) as RGB;
      cache.set(key, delta);
    }
    for (let j = 0; j < 3; j++)
      output[i + j] = clamp(pixels[i + j] + delta[j], 0, 255);
  }
  return output;
}
