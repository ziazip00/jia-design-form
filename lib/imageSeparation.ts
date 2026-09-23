import type { ImageLayer, DesignLayer } from "../types/design";
import { makeLayer } from "./designParser";

export interface TextRegion {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  fontSize: number;
  confidence: number;
  enabled: boolean;
}
export function canvas(width: number, height: number) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return c;
}
export async function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () =>
      reject(
        new Error(
          "이미지를 읽을 수 없습니다. PNG, JPG, WEBP 파일로 다시 넣어 주세요.",
        ),
      );
    i.src = src;
  });
}
export async function prepareImage(layer: ImageLayer) {
  const image = await loadImage(layer.src);
  if (image.width * image.height > 40_000_000)
    throw new Error("4천만 화소 이하의 이미지를 사용해 주세요.");
  const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
  const c = canvas(
    Math.max(1, Math.round(image.width * scale)),
    Math.max(1, Math.round(image.height * scale)),
  );
  const ctx = c.getContext("2d")!;
  ctx.translate(layer.flipX ? c.width : 0, layer.flipY ? c.height : 0);
  ctx.scale(layer.flipX ? -1 : 1, layer.flipY ? -1 : 1);
  ctx.drawImage(image, 0, 0, c.width, c.height);
  return c;
}
function cancelled() {
  return new DOMException("작업을 취소했습니다.", "AbortError");
}
export function workerTask<T>(
  path: string,
  data: unknown,
  signal: AbortSignal,
  progress: (message: string) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(cancelled());
      return;
    }
    const worker = new Worker(path, { type: "module" });
    const cleanup = () => {
      worker.terminate();
      clearTimeout(timeout);
      signal.removeEventListener("abort", abort);
    };
    const abort = () => {
      cleanup();
      reject(cancelled());
    };
    const timeout = setTimeout(() => {
      cleanup();
      reject(
        new Error(
          "처리 시간이 초과됐습니다. 더 작은 이미지로 다시 시도해 주세요.",
        ),
      );
    }, 120000);
    signal.addEventListener("abort", abort, { once: true });
    worker.onerror = () => {
      cleanup();
      reject(
        new Error(
          "처리 도구를 불러오지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.",
        ),
      );
    };
    worker.onmessage = ({ data: result }) => {
      if (result.status) {
        progress(result.status);
        return;
      }
      cleanup();
      if (result.error) reject(new Error(result.error));
      else resolve(result);
    };
    worker.postMessage(data);
  });
}
function estimateColor(
  c: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const data = c.getContext("2d")!.getImageData(x, y, width, height).data;
  const bins = new Map<string, { count: number; rgb: number[] }>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 80) continue;
    const key = `${data[i] >> 5},${data[i + 1] >> 5},${data[i + 2] >> 5}`;
    const bin = bins.get(key) || { count: 0, rgb: [0, 0, 0] };
    bin.count++;
    for (let k = 0; k < 3; k++) bin.rgb[k] += data[i + k];
    bins.set(key, bin);
  }
  const sorted = [...bins.values()].sort((a, b) => b.count - a.count);
  const base = sorted[0];
  if (!base) return "#172f47";
  const bg = base.rgb.map((v) => v / base.count);
  const best =
    sorted
      .filter((b) => b.count > width * height * 0.025)
      .sort((a, b) => {
        const score = (v: typeof a) =>
          v.rgb.reduce((s, n, k) => s + (n / v.count - bg[k]) ** 2, 0);
        return score(b) - score(a);
      })[0] || base;
  return (
    "#" +
    best.rgb
      .map((v) =>
        Math.round(v / best.count)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
export async function recognizeText(
  c: HTMLCanvasElement,
  signal: AbortSignal,
  progress: (message: string) => void,
): Promise<TextRegion[]> {
  const { createWorker, PSM } = await import("tesseract.js");
  let worker: Awaited<ReturnType<typeof createWorker>> | undefined;
  let stopped = false;
  let rejectAbort: (error: Error) => void = () => {};
  const aborted = new Promise<never>((_, reject) => {
    rejectAbort = reject;
  });
  const abort = () => {
    stopped = true;
    if (worker) void worker.terminate();
    rejectAbort(cancelled());
  };
  if (signal.aborted) throw cancelled();
  signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => {
    stopped = true;
    if (worker) void worker.terminate();
    rejectAbort(
      new Error(
        "글자 인식 시간이 초과됐습니다. 더 작은 이미지로 다시 시도해 주세요.",
      ),
    );
  }, 120000);
  try {
    const work = async () => {
      worker = await createWorker(["kor", "eng"], 1, {
        workerPath: "/image-tools/ocr/worker.min.js",
        corePath: "/image-tools/ocr",
        langPath: "/image-tools/languages",
        gzip: false,
        logger: (m) => {
          if (!signal.aborted)
            progress(
              m.status === "recognizing text"
                ? `글자를 읽고 있습니다… ${Math.round(m.progress * 100)}%`
                : "한글·영문 인식 도구를 준비하고 있습니다…",
            );
        },
      });
      if (signal.aborted || stopped) {
        await worker.terminate();
        throw cancelled();
      }
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT,
        preserve_interword_spaces: "1",
      });
      const { data } = await worker.recognize(
        c,
        {},
        { blocks: true, text: true },
      );
      const lines =
        data.blocks?.flatMap((b) => b.paragraphs.flatMap((p) => p.lines)) || [];
      return lines
        .filter((l) => l.text.trim())
        .slice(0, 80)
        .map((l) => {
          const x = Math.max(0, Math.floor(l.bbox.x0)),
            y = Math.max(0, Math.floor(l.bbox.y0));
          const width = Math.max(
            1,
            Math.min(c.width - x, Math.ceil(l.bbox.x1 - x)),
          );
          const height = Math.max(
            1,
            Math.min(c.height - y, Math.ceil(l.bbox.y1 - y)),
          );
          return {
            id: crypto.randomUUID(),
            text: l.text.trim(),
            x,
            y,
            width,
            height,
            color: estimateColor(c, x, y, width, height),
            fontSize: Math.max(6, Math.round(height * 1.15)),
            confidence: l.confidence,
            enabled: true,
          };
        });
    };
    return await Promise.race([work(), aborted]);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
    if (worker) await worker.terminate();
  }
}
export async function recognizeSubject(
  c: HTMLCanvasElement,
  signal: AbortSignal,
  progress: (message: string) => void,
) {
  const small = canvas(320, 320),
    ctx = small.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 320, 320);
  ctx.drawImage(c, 0, 0, 320, 320);
  const { mask } = await workerTask<{ mask: Uint8ClampedArray }>(
    "/image-tools/subject-worker.mjs",
    ctx.getImageData(0, 0, 320, 320).data,
    signal,
    progress,
  );
  const pixels = ctx.createImageData(320, 320);
  for (let i = 0; i < mask.length; i++) {
    pixels.data.set([255, 255, 255, mask[i]], i * 4);
  }
  ctx.putImageData(pixels, 0, 0);
  const large = canvas(c.width, c.height);
  large.getContext("2d")!.drawImage(small, 0, 0, c.width, c.height);
  return large;
}
export interface SeparationResult {
  background: string;
  subject?: string;
  subjectRect?: { x: number; y: number; width: number; height: number };
  texts: TextRegion[];
  preview: string;
  width: number;
  height: number;
}
export async function renderSeparation(
  source: HTMLCanvasElement,
  subjectMask: HTMLCanvasElement | null,
  texts: TextRegion[],
  fill: "surround" | "solid" | "transparent",
  color: string,
  signal: AbortSignal,
  progress: (message: string) => void,
): Promise<SeparationResult> {
  const { width, height } = source,
    count = width * height;
  const enabled = texts.filter((t) => t.enabled && t.text.trim());
  const removal = canvas(width, height),
    rctx = removal.getContext("2d")!;
  const foreground = canvas(width, height),
    fctx = foreground.getContext("2d")!;
  let hasSubject = false;
  if (subjectMask) {
    fctx.drawImage(source, 0, 0);
    fctx.globalCompositeOperation = "destination-in";
    fctx.drawImage(subjectMask, 0, 0);
    fctx.globalCompositeOperation = "source-over";
    rctx.filter = "blur(2px)";
    rctx.drawImage(subjectMask, 0, 0);
    rctx.filter = "none";
  }
  const pad = Math.max(2, Math.round(width / 500));
  for (const t of enabled) {
    rctx.fillStyle = "#fff";
    rctx.fillRect(t.x - pad, t.y - pad, t.width + pad * 2, t.height + pad * 2);
    fctx.clearRect(t.x - pad, t.y - pad, t.width + pad * 2, t.height + pad * 2);
  }
  const cut = fctx.getImageData(0, 0, width, height).data;
  let left = width,
    top = height,
    right = -1,
    bottom = -1;
  for (let i = 0; i < count; i++)
    if (cut[i * 4 + 3] > 10) {
      hasSubject = true;
      left = Math.min(left, i % width);
      right = Math.max(right, i % width);
      top = Math.min(top, Math.floor(i / width));
      bottom = Math.max(bottom, Math.floor(i / width));
    }
  if (!enabled.length && !hasSubject)
    throw new Error("분리할 글자나 피사체를 먼저 선택하세요.");
  const removalData = rctx.getImageData(0, 0, width, height).data,
    mask = new Uint8Array(count);
  for (let i = 0; i < count; i++) mask[i] = removalData[i * 4 + 3] > 10 ? 1 : 0;
  let pixels = source.getContext("2d")!.getImageData(0, 0, width, height).data;
  if (fill === "transparent") {
    for (let i = 0; i < count; i++) if (mask[i]) pixels[i * 4 + 3] = 0;
  } else {
    progress("선택한 자리의 배경을 채우고 있습니다…");
    const solid =
      fill === "solid"
        ? [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16))
        : undefined;
    pixels = (
      await workerTask<{ pixels: Uint8ClampedArray<ArrayBuffer> }>(
        "/image-tools/repair-worker.mjs",
        { pixels, mask, width, height, solid },
        signal,
        progress,
      )
    ).pixels;
  }
  if (signal.aborted) throw cancelled();
  const background = canvas(width, height);
  background
    .getContext("2d")!
    .putImageData(
      new ImageData(new Uint8ClampedArray(pixels), width, height),
      0,
      0,
    );
  const preview = canvas(width, height),
    p = preview.getContext("2d")!;
  p.drawImage(background, 0, 0);
  if (hasSubject) p.drawImage(foreground, 0, 0);
  p.textBaseline = "top";
  for (const t of enabled) {
    p.font = `${t.fontSize}px "Malgun Gothic", Arial, sans-serif`;
    p.fillStyle = t.color;
    p.fillText(t.text, t.x, t.y);
  }
  let subject: string | undefined, subjectRect: SeparationResult["subjectRect"];
  if (hasSubject) {
    subjectRect = {
      x: left,
      y: top,
      width: right - left + 1,
      height: bottom - top + 1,
    };
    const cropped = canvas(subjectRect.width, subjectRect.height);
    cropped
      .getContext("2d")!
      .drawImage(
        foreground,
        left,
        top,
        subjectRect.width,
        subjectRect.height,
        0,
        0,
        subjectRect.width,
        subjectRect.height,
      );
    subject = cropped.toDataURL("image/png");
  }
  return {
    background: background.toDataURL("image/png"),
    subject,
    subjectRect,
    texts: enabled,
    preview: preview.toDataURL("image/png"),
    width,
    height,
  };
}
export function separationLayers(
  source: ImageLayer,
  result: SeparationResult,
): DesignLayer[] {
  const shared = {
    x: source.x,
    y: source.y,
    width: source.width,
    height: source.height,
    rotation: source.rotation,
    opacity: source.opacity,
    flipX: false,
    flipY: false,
  };
  const layers: DesignLayer[] = [
    makeLayer("image", {
      ...shared,
      name: `${source.name} · 배경`,
      src: result.background,
    }),
  ];
  const sx = source.width / result.width,
    sy = source.height / result.height,
    a = (source.rotation * Math.PI) / 180;
  if (result.subject) {
    const r = result.subjectRect || {
      x: 0,
      y: 0,
      width: result.width,
      height: result.height,
    };
    layers.push(
      makeLayer("image", {
        ...shared,
        name: `${source.name} · 피사체`,
        src: result.subject,
        x: source.x + r.x * sx * Math.cos(a) - r.y * sy * Math.sin(a),
        y: source.y + r.x * sx * Math.sin(a) + r.y * sy * Math.cos(a),
        width: Math.max(1, r.width * sx),
        height: Math.max(1, r.height * sy),
      }),
    );
  }
  for (const t of result.texts)
    layers.push(
      makeLayer("text", {
        name: `추출 글자 · ${t.text.slice(0, 18)}`,
        text: t.text,
        x: source.x + t.x * sx * Math.cos(a) - t.y * sy * Math.sin(a),
        y: source.y + t.x * sx * Math.sin(a) + t.y * sy * Math.cos(a),
        width: Math.max(10, (t.width + t.fontSize) * sx),
        height: Math.max(10, t.fontSize * sy * 1.5),
        rotation: source.rotation,
        opacity: source.opacity,
        fontFamily: "Malgun Gothic",
        fontSize: Math.max(6, t.fontSize * sy),
        fontWeight: 400,
        lineHeight: 1,
        color: t.color,
      }),
    );
  return layers;
}
