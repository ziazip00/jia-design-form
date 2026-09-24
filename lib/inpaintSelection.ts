import { canvas, loadImage } from "./imageSeparation";
import {
  compositeSelection,
  polygonArea,
  apiMaskPixels,
  type Point,
} from "./regionSelection";
export function selectionMask(width: number, height: number, points: Point[]) {
  if (points.length < 3 || polygonArea(points) < 4)
    throw new Error("외곽선을 닫아 충분한 크기의 영역을 선택하세요.");
  const mask = canvas(width, height),
    ctx = mask.getContext("2d")!;
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.fill("evenodd");
  const pixels = ctx.getImageData(0, 0, width, height);
  let count = 0;
  for (let i = 3; i < pixels.data.length; i += 4) {
    pixels.data[i] = pixels.data[i] >= 128 ? 255 : 0;
    if (pixels.data[i]) count++;
  }
  if (count < 4 || count === width * height)
    throw new Error("주변 배경이 남도록 일부 영역을 선택하세요.");
  ctx.putImageData(pixels, 0, 0);
  return mask;
}
export async function inpaintSelection(
  source: HTMLCanvasElement,
  points: Point[],
  signal: AbortSignal,
) {
  const mask = selectionMask(source.width, source.height, points);
  // Send the actual source dimensions. Do not shrink small selections or add padding.
  const apiMask = canvas(source.width, source.height),
    mc = apiMask.getContext("2d")!;
  const selectionPixels = mask
    .getContext("2d")!
    .getImageData(0, 0, source.width, source.height).data;
  mc.putImageData(
    new ImageData(apiMaskPixels(selectionPixels), source.width, source.height),
    0,
    0,
  );
  const image = source.toDataURL("image/png"),
    maskData = apiMask.toDataURL("image/png");
  if (image.length + maskData.length > 15_900_000)
    throw new Error(
      "이미지가 너무 복잡합니다. 이미지 크기를 줄여 다시 시도하세요.",
    );
  const response = await fetch("/api/images", {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "edit",
      image,
      mask: maskData,
      size:
        source.width / source.height > 1.2
          ? "1536x1024"
          : source.width / source.height < 0.83
            ? "1024x1536"
            : "1024x1024",
      quality: "medium",
      prompt:
        "Remove ALL content inside the transparent area of the supplied mask, including any letters, text, logos or objects there. Reconstruct the missing background as if the selected content had never been there, using surrounding texture, perspective and lighting. Do not leave a hole, blur patch, solid color block, outline or replacement object. Preserve the full original composition edge-to-edge without cropping, stretching, shifting or adding padding. Return an opaque fully restored image.",
    }),
  });
  const data = await response.json().catch(() => {
    throw Object.assign(
      new Error(
        `서버가 이미지 응답을 반환하지 않았습니다 (HTTP ${response.status}).`,
      ),
      { diagnostic: { stage: "http-response", httpStatus: response.status } },
    );
  });
  if (!response.ok || data.error)
    throw Object.assign(
      new Error(data.error || "자동 자리 채우기에 실패했습니다."),
      {
        diagnostic: {
          httpStatus: response.status,
          code: data.code,
          retryAfter: data.retryAfter,
          ...data.diagnostic,
        },
      },
    );
  if (
    typeof data.src !== "string" ||
    !/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(data.src)
  )
    throw Object.assign(
      new Error("서버 응답에 유효한 PNG 이미지가 없습니다."),
      { diagnostic: { stage: "decode-image" } },
    );
  const generated = await loadImage(data.src);
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  const restored = canvas(source.width, source.height),
    rc = restored.getContext("2d")!;
  rc.drawImage(
    generated,
    0,
    0,
    generated.width,
    generated.height,
    0,
    0,
    source.width,
    source.height,
  );
  const original = source
    .getContext("2d")!
    .getImageData(0, 0, source.width, source.height);
  const merged = compositeSelection(
    original.data,
    rc.getImageData(0, 0, source.width, source.height).data,
    selectionPixels,
  );
  rc.putImageData(new ImageData(merged, source.width, source.height), 0, 0);
  return restored.toDataURL("image/png");
}
