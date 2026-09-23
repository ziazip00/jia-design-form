import type { DesignDocument } from "../types/design";
export function buildChatPrompt(
  prompt: string,
  document: DesignDocument,
  attachmentNames: string[],
) {
  const textLayers = document.layers
    .filter((l) => l.type === "text")
    .map((l) => (l.type === "text" ? `- ${l.name}: ${l.text}` : ""))
    .join("\n");
  return [
    `지아디자인폼에서 작업 중인 콘텐츠 디자인을 도와주세요.`,
    `요청: ${prompt.trim()}`,
    `캔버스: ${document.canvas.width} × ${document.canvas.height}px`,
    textLayers ? `현재 텍스트:\n${textLayers}` : "",
    attachmentNames.length
      ? `참고 사진 (이 대화에 별도로 첨부할 예정):\n${attachmentNames.map((name, i) => `${i + 1}. ${name}`).join("\n")}`
      : "",
    "텍스트, 이미지, 도형을 각각 독립적으로 편집할 수 있도록 배치, 문구, 색상과 글꼴 제안을 구체적으로 알려주세요.",
  ]
    .filter(Boolean)
    .join("\n\n");
}
