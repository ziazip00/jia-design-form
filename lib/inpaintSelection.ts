import { canvas, loadImage } from "./imageSeparation";
import { compositeSelection, polygonArea, type Point } from "./regionSelection";
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
  const size = 1024,
    scale = Math.min(size / source.width, size / source.height);
  const sw = Math.round(source.width * scale),
    sh = Math.round(source.height * scale),
    x = Math.floor((size - sw) / 2),
    y = Math.floor((size - sh) / 2);
  const input = canvas(size, size),
    ctx = input.getContext("2d")!;
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(source, x, y, sw, sh);
  const apiMask = canvas(size, size),
    mc = apiMask.getContext("2d")!;
  mc.fillStyle = "#ffffff";
  mc.fillRect(0, 0, size, size);
  mc.globalCompositeOperation = "destination-out";
  mc.imageSmoothingEnabled = false;
  mc.drawImage(mask, x, y, sw, sh);
  const image = input.toDataURL("image/png"),
    maskData = apiMask.toDataURL("image/png");
  if (image.length + maskData.length > 5_900_000)
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
      size: "1024x1024",
      quality: "medium",
      prompt:
        "Remove the object or content ONLY inside the transparent area of the supplied mask. Reconstruct the missing background as if that object had never been there, using the surrounding scene, texture, perspective and lighting. Do not leave a hole, blur patch, solid color block, outline or replacement object. Preserve all unmasked content and exact image alignment, scale and gray padding. Return an opaque fully restored image.",
    }),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "자동 자리 채우기에 실패했습니다.");
  const generated = await loadImage(data.src);
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  const restored = canvas(source.width, source.height),
    rc = restored.getContext("2d")!;
  rc.drawImage(
    generated,
    (x * generated.width) / size,
    (y * generated.height) / size,
    (sw * generated.width) / size,
    (sh * generated.height) / size,
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
    mask.getContext("2d")!.getImageData(0, 0, source.width, source.height).data,
  );
  rc.putImageData(new ImageData(merged, source.width, source.height), 0, 0);
  return restored.toDataURL("image/png");
}
