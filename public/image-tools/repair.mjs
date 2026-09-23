// Boundary-colour propagation, not generative inpainting. Only masked pixels change.
export function repairPixels(pixels, mask, width, height, solid) {
  const result = new Uint8ClampedArray(pixels),
    count = width * height;
  const known = new Uint8Array(count),
    queue = new Int32Array(count);
  let head = 0,
    tail = 0,
    remaining = 0;
  const neighbors = (i) => [
    i % width ? i - 1 : -1,
    i % width < width - 1 ? i + 1 : -1,
    i >= width ? i - width : -1,
    i < count - width ? i + width : -1,
  ];
  for (let i = 0; i < count; i++) {
    known[i] = mask[i] ? 0 : 1;
    if (mask[i]) remaining++;
  }
  if (solid) {
    for (let i = 0; i < count; i++)
      if (mask[i]) result.set([...solid, 255], i * 4);
    return result;
  }
  if (remaining === count)
    throw new Error("남은 배경이 없습니다. 단색 채우기를 선택하세요.");
  for (let i = 0; i < count; i++)
    if (!known[i] && neighbors(i).some((j) => j >= 0 && known[j] === 1)) {
      queue[tail++] = i;
      known[i] = 2;
    }
  while (head < tail) {
    const i = queue[head++],
      near = neighbors(i).filter((j) => j >= 0 && known[j] === 1);
    for (let c = 0; c < 4; c++)
      result[i * 4 + c] =
        near.reduce((v, j) => v + result[j * 4 + c], 0) / near.length;
    known[i] = 1;
    for (const j of neighbors(i))
      if (j >= 0 && known[j] === 0) {
        known[j] = 2;
        queue[tail++] = j;
      }
  }
  // A few local passes soften seams without touching any unmasked pixels.
  for (let pass = 0; pass < 8; pass++)
    for (let k = 0; k < tail; k++) {
      const i = queue[pass % 2 ? tail - 1 - k : k],
        near = neighbors(i).filter((j) => j >= 0);
      for (let c = 0; c < 3; c++)
        result[i * 4 + c] =
          near.reduce((v, j) => v + result[j * 4 + c], 0) / near.length;
    }
  return result;
}
