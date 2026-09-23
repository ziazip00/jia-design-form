export interface PromptAttachment {
  id: string;
  name: string;
  src: string;
  width: number;
  height: number;
  file: File;
}
export async function readAttachment(file: File): Promise<PromptAttachment> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new Error(`${file.name}: PNG, JPG, WEBP만 첨부할 수 있습니다.`);
  if (file.size > 10 * 1024 * 1024)
    throw new Error(`${file.name}: 사진은 한 장당 10MB 이하로 선택하세요.`);
  const src = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("사진을 읽을 수 없습니다."));
    reader.readAsDataURL(file);
  });
  const image = new Image();
  image.src = src;
  await image.decode();
  if (image.naturalWidth * image.naturalHeight > 40_000_000)
    throw new Error("사진은 4천만 픽셀 이하로 선택해 주세요.");
  return {
    id: crypto.randomUUID(),
    name: file.name,
    src,
    width: image.naturalWidth,
    height: image.naturalHeight,
    file,
  };
}
export async function attachmentPng(
  attachment: PromptAttachment,
): Promise<Blob> {
  if (attachment.file.type === "image/png") return attachment.file;
  const image = new Image();
  image.src = attachment.src;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = attachment.width;
  canvas.height = attachment.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("사진을 복사할 수 없습니다.");
  context.drawImage(image, 0, 0);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("사진 변환 실패"))),
      "image/png",
    ),
  );
}
