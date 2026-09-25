import { makeLayer } from "./designParser";
import type { DesignDocument } from "../types/design";
export function parseExchange(input: unknown): DesignDocument {
  const d = input as DesignDocument;
  const finite = (n: unknown) =>
    typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= 100000;
  const color = (s: unknown) =>
    typeof s === "string" && /^#[0-9a-f]{6}$/i.test(s);
  if (
    !d ||
    !d.canvas ||
    !finite(d.canvas.width) ||
    !finite(d.canvas.height) ||
    d.canvas.width < 1 ||
    d.canvas.height < 1 ||
    d.canvas.width > 8192 ||
    d.canvas.height > 8192 ||
    !color(d.canvas.background) ||
    !Array.isArray(d.layers) ||
    d.layers.length > 500
  )
    throw new Error(
      "지원하지 않는 디자인 문서입니다 (최대 8192px, 500레이어).",
    );
  const layers = d.layers.map((l, i) => {
    if (
      !l ||
      !["text", "shape", "image", "icon"].includes(l.type) ||
      !["x", "y", "width", "height", "rotation", "opacity"].every((k) =>
        finite(l[k as keyof typeof l]),
      ) ||
      l.width <= 0 ||
      l.height <= 0 ||
      l.opacity < 0 ||
      l.opacity > 1
    )
      throw new Error(`레이어 ${i + 1}의 크기 또는 형식이 잘못되었습니다.`);
    if (
      l.type === "image" &&
      (typeof l.src !== "string" ||
        !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(l.src))
    )
      throw new Error(
        "이미지는 PNG/JPG/WEBP 내장 데이터만 가져올 수 있습니다.",
      );
    if (
      l.type === "text" &&
      l.textSizing !== undefined &&
      !["auto", "fixed"].includes(l.textSizing)
    )
      throw new Error("텍스트 크기 모드가 잘못되었습니다.");
    if (
      l.type === "text" &&
      (typeof l.text !== "string" ||
        l.text.length > 50000 ||
        typeof l.fontFamily !== "string" ||
        !finite(l.fontSize) ||
        l.fontSize < 1 ||
        !finite(l.fontWeight) ||
        !finite(l.lineHeight) ||
        l.lineHeight <= 0 ||
        !finite(l.letterSpacing) ||
        !color(l.color) ||
        !["left", "center", "right"].includes(l.align))
    )
      throw new Error("텍스트 속성이 잘못되었습니다.");
    if (
      l.type === "shape" &&
      (!["rectangle", "rounded", "circle"].includes(l.shape) ||
        !color(l.fill) ||
        !color(l.stroke) ||
        !finite(l.strokeWidth) ||
        !finite(l.radius))
    )
      throw new Error("도형 속성이 잘못되었습니다.");
    if (
      l.type === "icon" &&
      (!["sparkle", "heart", "star"].includes(l.icon) || !color(l.fill))
    )
      throw new Error("아이콘 속성이 잘못되었습니다.");
    const effects: Record<string, unknown> = {};
    for (const key of ["fills", "strokes", "effects"] as const) {
      const entries = l[key];
      if (entries === undefined) continue;
      if (!Array.isArray(entries) || entries.length > 32)
        throw new Error("스타일 목록이 잘못되었습니다.");
      for (const entry of entries) {
        if (
          !entry ||
          typeof entry.id !== "string" ||
          !color(entry.color) ||
          !finite(entry.opacity) ||
          entry.opacity < 0 ||
          entry.opacity > 1 ||
          typeof entry.visible !== "boolean"
        )
          throw new Error("스타일 색상 또는 불투명도가 잘못되었습니다.");
        const e = entry as unknown as Record<string, unknown>;
        if (
          key === "strokes" &&
          (!finite(e.width) ||
            Number(e.width) < 0 ||
            Number(e.width) > 100 ||
            !["inside", "center", "outside"].includes(String(e.position)))
        )
          throw new Error("외곽선 속성이 잘못되었습니다.");
        if (
          key === "effects" &&
          (!["shadow", "inner", "blur", "glow"].includes(String(e.type)) ||
            !["x", "y", "blur", "spread"].every(
              (k) => finite(e[k]) && Math.abs(Number(e[k])) <= 200,
            ) ||
            Number(e.blur) < 0)
        )
          throw new Error("효과 속성이 잘못되었습니다.");
      }
    }
    if (
      l.cornerRadius !== undefined &&
      (!finite(l.cornerRadius) || l.cornerRadius < 0)
    )
      throw new Error("모서리 반경이 잘못되었습니다.");
    if (l.type === "image" && l.crop) {
      const c = l.crop;
      if (
        ![c.x, c.y, c.width, c.height].every(finite) ||
        c.x < 0 ||
        c.y < 0 ||
        c.width <= 0 ||
        c.height <= 0 ||
        c.x + c.width > 1.000001 ||
        c.y + c.height > 1.000001
      )
        throw new Error("자르기 영역이 잘못되었습니다.");
    }
    if (
      l.type === "image" &&
      l.paletteMap &&
      (!Array.isArray(l.paletteMap.source) ||
        !Array.isArray(l.paletteMap.target) ||
        l.paletteMap.source.length < 1 ||
        l.paletteMap.source.length > 5 ||
        l.paletteMap.target.length < 1 ||
        l.paletteMap.target.length > 5 ||
        !l.paletteMap.source.every(color) ||
        !l.paletteMap.target.every(color))
    )
      throw new Error("이미지 팔레트 색상이 잘못되었습니다.");
    for (const key of [
      "shadowBlur",
      "shadowOffsetX",
      "shadowOffsetY",
      "shadowOpacity",
      "outlineWidth",
      "glowOpacity",
      "glowBlur",
    ])
      if (finite((l as unknown as Record<string, unknown>)[key]))
        effects[key] = (l as unknown as Record<string, unknown>)[key];
    for (const key of ["shadowColor", "outlineColor", "glowColor"])
      if (color((l as unknown as Record<string, unknown>)[key]))
        effects[key] = (l as unknown as Record<string, unknown>)[key];
    for (const key of ["shadowEnabled", "outlineEnabled", "glowEnabled"])
      effects[key] = (l as unknown as Record<string, unknown>)[key] === true;
    return makeLayer(l.type, {
      ...l,
      ...effects,
      id: crypto.randomUUID(),
      name: String(l.name || l.type).slice(0, 200),
      zIndex: i,
      visible: l.visible !== false,
      locked: l.locked === true,
    });
  });
  return {
    id: crypto.randomUUID(),
    name: String(d.name || "Figma 디자인").slice(0, 200),
    canvas: { ...d.canvas },
    layers,
  };
}
export async function exchangeDocument(document: DesignDocument) {
  const copy = structuredClone(document);
  for (const l of copy.layers) {
    if (l.type === "image" && l.paletteMap) {
      const { prepareImage } = await import("./imageSeparation");
      l.src = (await prepareImage(l, Infinity)).toDataURL("image/png");
      l.paletteMap = undefined;
      l.crop = undefined;
      l.flipX = false;
      l.flipY = false;
    }
  }
  // Rasterize SVG image assets for the native Figma image API, keep other layers editable.
  for (const l of copy.layers)
    if (
      l.type === "image" &&
      !l.src.startsWith("data:image/png;base64,") &&
      !l.src.startsWith("data:image/jpeg;base64,") &&
      !l.src.startsWith("data:image/webp;base64,")
    ) {
      const image = new Image();
      image.src = l.src;
      await image.decode();
      const c = window.document.createElement("canvas");
      c.width = image.naturalWidth;
      c.height = image.naturalHeight;
      c.getContext("2d")!.drawImage(image, 0, 0);
      l.src = c.toDataURL("image/png");
    }
  return copy;
}
export function downloadJSON(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
