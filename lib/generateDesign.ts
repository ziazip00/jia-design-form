import type { DesignDocument } from "@/types/design";
import type { PromptAttachment } from "./promptAttachments";
import { useFontStore } from "@/store/fontStore";
async function preview(src: string) {
  const image = new Image();
  image.src = src;
  await image.decode();
  const scale = Math.min(1, 900 / image.width, 900 / image.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("사진을 준비할 수 없습니다.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.72);
}
export async function generateDesign(
  prompt: string,
  document: DesignDocument,
  photos: PromptAttachment[],
  mode: "new" | "edit",
  signal: AbortSignal,
) {
  const sources = [
    ...new Set([
      ...document.layers
        .filter((l) => l.type === "image")
        .map((l) => (l.type === "image" ? l.src : "")),
      ...photos.map((p) => p.src),
    ]),
  ];
  if (sources.length > 12)
    throw new Error(
      "한 번에 참고할 수 있는 사진은 기존 이미지 포함 12장입니다.",
    );
  const assets = await Promise.all(
    sources.map(async (src, i) => ({
      id: `asset_${i}`,
      preview: await preview(src),
    })),
  );
  const input = {
    ...document,
    layers: document.layers.map((l) =>
      l.type === "image" ? { ...l, src: `asset_${sources.indexOf(l.src)}` } : l,
    ),
  };
  const used = document.layers.flatMap((l) =>
    l.type === "text" ? [l.fontFamily] : [],
  );
  const fonts = [
    ...new Set([
      ...used,
      ...useFontStore
        .getState()
        .fonts.filter((f) => f.source === "default" || f.loaded)
        .map((f) => f.family),
    ]),
  ].slice(0, 200);
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, document: input, assets, fonts, mode }),
    signal,
  });
  const result = await response
    .json()
    .catch(() => ({
      error: "AI 서버에 연결할 수 없습니다. 서버 설정을 확인하세요.",
    }));
  if (!response.ok) throw new Error(result.error || "생성 실패");
  if (!result.document || !Array.isArray(result.document.layers))
    throw new Error("유효하지 않은 생성 결과입니다.");
  const generated = result.document as DesignDocument;
  generated.layers = generated.layers.map((l) => {
    if (l.type !== "image") return l;
    const index = assets.findIndex((a) => a.id === l.src);
    if (index < 0) throw new Error("생성 결과에 알 수 없는 이미지가 있습니다.");
    return { ...l, src: sources[index] };
  });
  return {
    document: generated,
    summary: String(result.summary || "디자인을 적용했습니다."),
  };
}
