export type Point = { x: number; y: number };
export function apiMaskPixels(selection: Uint8ClampedArray) {
  const mask = new Uint8ClampedArray(selection.length);
  for (let i = 0; i < mask.length; i += 4) {
    mask[i] = mask[i + 1] = mask[i + 2] = 255;
    mask[i + 3] = selection[i + 3] >= 128 ? 0 : 255;
  }
  return mask;
}
export function imagePoint(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  width: number,
  height: number,
): Point {
  if (rect.width <= 0 || rect.height <= 0)
    throw new Error("이미지 표시 크기가 유효하지 않습니다.");
  return {
    x: Math.max(
      0,
      Math.min(width, ((clientX - rect.left) * width) / rect.width),
    ),
    y: Math.max(
      0,
      Math.min(height, ((clientY - rect.top) * height) / rect.height),
    ),
  };
}
export function polygonArea(points: Point[]) {
  return (
    Math.abs(
      points.reduce((sum, p, i) => {
        const q = points[(i + 1) % points.length];
        return sum + p.x * q.y - q.x * p.y;
      }, 0),
    ) / 2
  );
}
// No pixels outside the exact rasterized selection may change, including alpha.
export function compositeSelection(
  original: Uint8ClampedArray,
  restored: Uint8ClampedArray,
  mask: Uint8ClampedArray,
) {
  if (original.length !== restored.length || mask.length !== original.length)
    throw new Error("선택 영역과 이미지 크기가 다릅니다.");
  const output = new Uint8ClampedArray(original);
  for (let i = 0; i < output.length; i += 4)
    if (mask[i + 3] >= 128) {
      output[i] = restored[i];
      output[i + 1] = restored[i + 1];
      output[i + 2] = restored[i + 2];
      output[i + 3] = 255;
    }
  return output;
}
