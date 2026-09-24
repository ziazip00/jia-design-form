import type { ImageLayer } from "../types/design";
import { prepareImage, recognizeSubject, loadImage } from "./imageSeparation";
export async function removeBackground(
  layer: ImageLayer,
  signal: AbortSignal,
  progress: (message: string) => void,
) {
  const source = await prepareImage(layer, Infinity),
    mask = await recognizeSubject(source, signal, progress);
  if (signal.aborted) throw new DOMException("취소", "AbortError");
  const ctx = source.getContext("2d")!;
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(mask, 0, 0);
  return source.toDataURL("image/png");
}
export async function promptEditImage(
  layer: ImageLayer,
  prompt: string,
  signal: AbortSignal,
) {
  const source = await prepareImage(layer, Infinity),
    image = source.toDataURL("image/png");
  if (image.length > 15_900_000) throw new Error("이미지 크기를 줄여 주세요.");
  const ratio = source.width / source.height;
  const response = await fetch("/api/images", {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "edit",
      image,
      prompt: prompt + " Preserve the full original framing and aspect ratio.",
      size:
        ratio > 1.2 ? "1536x1024" : ratio < 0.83 ? "1024x1536" : "1024x1024",
      quality: "medium",
    }),
  });
  const data = await response.json().catch(() => {
    throw new Error(`서버 응답 오류 (HTTP ${response.status})`);
  });
  if (!response.ok || data.error)
    throw Object.assign(
      new Error(data.error || `이미지 편집 실패 (HTTP ${response.status})`),
      { diagnostic: data.diagnostic },
    );
  if (
    typeof data.src !== "string" ||
    !/^data:image\/png;base64,/.test(data.src)
  )
    throw new Error("유효한 이미지 응답이 없습니다.");
  const output = await loadImage(data.src);
  if (signal.aborted) throw new DOMException("취소", "AbortError");
  source.getContext("2d")!.clearRect(0, 0, source.width, source.height);
  source.getContext("2d")!.drawImage(output, 0, 0, source.width, source.height);
  return source.toDataURL("image/png");
}
export function cropPatch(
  layer: ImageLayer,
  crop: NonNullable<ImageLayer["crop"]>,
) {
  const old = layer.crop ?? { x: 0, y: 0, width: 1, height: 1 },
    sx = layer.width / old.width,
    sy = layer.height / old.height;
  const dx =
      (layer.flipX ? old.x + old.width - crop.x - crop.width : crop.x - old.x) *
      sx,
    dy =
      (layer.flipY
        ? old.y + old.height - crop.y - crop.height
        : crop.y - old.y) * sy,
    a = (layer.rotation * Math.PI) / 180;
  return {
    crop,
    width: crop.width * sx,
    height: crop.height * sy,
    x: layer.x + dx * Math.cos(a) - dy * Math.sin(a),
    y: layer.y + dx * Math.sin(a) + dy * Math.cos(a),
  };
}
