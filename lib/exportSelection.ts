import Konva from "konva";
import type { DesignLayer, ProjectDocument } from "../types/design";
import { effectsOf, fillsOf, strokesOf, stylePadding } from "./layerStyles";
import { iconPath } from "./renderLayerStyle";
export function supportsSVG(l: DesignLayer) {
  return (
    (l.type === "shape" || l.type === "icon") &&
    !effectsOf(l).some((e) => e.visible) &&
    !strokesOf(l).some(
      (s) => s.visible && (s.position !== "center" || l.type === "icon"),
    )
  );
}
export function selectionSVG(l: DesignLayer, scale = 1) {
  if (!supportsSVG(l))
    throw new Error(
      "이 객체는 PNG/JPG로 내보내세요. SVG는 효과 없는 도형·아이콘을 지원합니다.",
    );
  const a = (l.rotation * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a),
    pad = stylePadding(l),
    w = l.width,
    h = l.height;
  const xs = [0, w * c, -h * s, w * c - h * s],
    ys = [0, w * s, h * c, w * s + h * c],
    left = Math.min(...xs) - pad,
    top = Math.min(...ys) - pad,
    width = Math.max(...xs) - left + pad,
    height = Math.max(...ys) - top + pad;
  const shape = (attrs: string) =>
    l.type === "icon"
      ? `<path d="${iconPath(l.icon)}" transform="scale(${w / 100} ${h / 100})" ${attrs}/>`
      : l.type === "shape" && l.shape === "circle"
        ? `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}" ${attrs}/>`
        : `<rect width="${w}" height="${h}" rx="${Math.min(w / 2, h / 2, l.cornerRadius ?? (l.type === "shape" ? l.radius : 0))}" ${attrs}/>`;
  const body =
    fillsOf(l)
      .filter((f) => f.visible)
      .map((f) => shape(`fill="${f.color}" opacity="${f.opacity}"`))
      .join("") +
    strokesOf(l)
      .filter((s) => s.visible)
      .map((s) =>
        shape(
          `fill="none" stroke="${s.color}" stroke-width="${s.width}" opacity="${s.opacity}"`,
        ),
      )
      .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width * scale}" height="${height * scale}" viewBox="${left} ${top} ${width} ${height}"><g transform="rotate(${l.rotation})" opacity="${l.opacity}">${body}</g></svg>`;
}
export async function exportSelection(
  stage: Konva.Stage,
  l: DesignLayer,
  format: "png" | "jpeg" | "svg",
  scale: number,
  doc: ProjectDocument,
) {
  await document.fonts.ready;
  let url: string;
  if (format === "svg")
    url = URL.createObjectURL(
      new Blob([selectionSVG(l, scale)], { type: "image/svg+xml" }),
    );
  else {
    const source = stage.findOne("#" + l.id) as Konva.Group | undefined;
    if (!source) throw new Error("표시된 객체를 선택하세요.");
    for (const n of source.find("Image"))
      if (!n.getAttr("image")) throw new Error("이미지를 불러오는 중입니다.");
    for (const n of source.find(".styled-layer"))
      if (!n.getAttr("styleReady"))
        throw new Error("이미지를 불러오는 중입니다.");
    const container = document.createElement("div"),
      copy = new Konva.Stage({ container, width: 1, height: 1 }),
      layer = new Konva.Layer();
    copy.add(layer);
    const node = source.clone({ x: 0, y: 0, visible: true });
    layer.add(node);
    const bounds = node.getClientRect({
        relativeTo: layer,
        skipShadow: true,
        skipStroke: true,
      }),
      angle = (l.rotation * Math.PI) / 180,
      pad = Math.ceil(
        stylePadding(l) *
          (Math.abs(Math.cos(angle)) + Math.abs(Math.sin(angle))),
      );
    const width = Math.ceil(bounds.width + pad * 2),
      height = Math.ceil(bounds.height + pad * 2);
    if (width * height * scale * scale > 64_000_000) {
      copy.destroy();
      throw new Error("내보내기가 너무 큽니다. 배율을 낮춰 주세요.");
    }
    copy.size({ width, height });
    node.position({ x: -bounds.x + pad, y: -bounds.y + pad });
    if (format === "jpeg") {
      const bg = new Konva.Rect({ width, height, fill: "#ffffff" });
      layer.add(bg);
      bg.moveToBottom();
    }
    try {
      url = copy.toDataURL({
        pixelRatio: scale,
        mimeType: `image/${format}`,
        quality: 0.95,
      });
    } finally {
      copy.destroy();
    }
  }
  const a = document.createElement("a");
  a.href = url;
  a.download = `${l.name.replace(/[<>:"/\\|?*]/g, "_")}@${scale}x.${format === "jpeg" ? "jpg" : format}`;
  a.click();
  if (format === "svg") setTimeout(() => URL.revokeObjectURL(url), 1000);
}
