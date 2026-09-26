import type Konva from "konva";
import type { DesignDocument } from "@/types/design";
export async function exportDesign(
  stage: Konva.Stage,
  doc: DesignDocument,
  format: "png" | "jpeg",
) {
  const url = await renderDesign(stage, doc, format);
  const a = document.createElement("a");
  a.download = `${doc.name.replace(/[<>:"/\\|?*]/g, "_")}.${format === "jpeg" ? "jpg" : "png"}`;
  a.href = url;
  a.click();
}
export async function renderDesign(
  stage: Konva.Stage,
  doc: DesignDocument,
  format: "png" | "jpeg" = "png",
) {
  await document.fonts.ready;
  for(const node of stage.find('.styled-layer'))if(!node.getAttr('styleReady'))throw new Error('이미지 로딩 중');
  for (const node of stage.find("Image")) {
    if (!node.getAttr("image")) throw new Error("이미지 로딩 중");
  }
  const artboard = doc.artboards.find((a) => a.id === doc.selectedArtboardId) || doc.artboards[0];
  const copy = stage.clone({
    container: document.createElement("div"),
    width: artboard.width,
    height: artboard.height,
    scaleX: 1,
    scaleY: 1,
  }) as Konva.Stage;
  copy.findOne(".controls")?.destroy();
  try {
    const url = copy.toDataURL({
      pixelRatio: 1,
      mimeType: `image/${format}`,
      quality: 0.95,
    });
    return url;
  } finally {
    copy.destroy();
  }
}
