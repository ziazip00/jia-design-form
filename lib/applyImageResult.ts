import type { DesignDocument, ImageLayer } from "../types/design";
export function applyImageResult(
  document: DesignDocument,
  expected: ImageLayer,
  src: string,
  backupId: string,
): DesignDocument {
  const index = document.layers.findIndex((l) => l.id === expected.id),
    current = document.layers[index];
  if (
    index < 0 ||
    JSON.stringify(current) !== JSON.stringify(expected) ||
    current.locked
  )
    throw new Error(
      "처리 중 원본 레이어가 변경됐습니다. 창을 닫고 다시 선택하세요.",
    );
  const layers = [...document.layers];
  const restored: ImageLayer = {
    ...expected,
    src,
    flipX: false,
    flipY: false,
    crop: undefined,
    paletteMap: undefined,
  };
  layers.splice(
    index,
    1,
    ...(layers.some((l) => l.id === backupId)
      ? []
      : [
          {
            ...expected,
            id: backupId,
            name: expected.name + " · 원본 보관",
            visible: false,
            locked: true,
          },
        ]),
    restored,
  );
  return { ...document, layers };
}
