import { useRef } from "react";
import { Scissors, Paperclip, Layers } from "lucide-react";
import { mockDocument } from "@/lib/designParser";
import { useEditorStore } from "@/store/editorStore";

export default function PromptBar({
  onSeparate,
  onUpload,
}: {
  onSeparate: () => void;
  onUpload: (file: File) => void;
}) {
  const file = useRef<HTMLInputElement>(null);
  return (
    <div
      className="prompt-bar image-workflow"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const image = e.dataTransfer.files[0];
        if (image) onUpload(image);
      }}
      onPaste={(e) => {
        const image = [...e.clipboardData.items]
          .find((i) => i.type.startsWith("image/"))
          ?.getAsFile();
        if (image) {
          e.preventDefault();
          onUpload(image);
        }
      }}
      tabIndex={0}
      aria-label="이미지 붙여넣기 또는 업로드"
    >
      <div className="prompt-label">
        <Layers size={17} />
        <strong>ChatGPT에서 만든 이미지, 여기서 자유롭게 편집하세요</strong>
      </div>
      <div className="image-workflow-actions">
        <button className="upload-button" onClick={() => file.current?.click()}>
          <Paperclip size={18} /> 이미지 첨부하고 분리
        </button>
        <button className="primary" onClick={onSeparate}>
          <Scissors size={17} /> 선택 이미지 분리
        </button>
      </div>
      <input
        hidden
        ref={file}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => {
          const image = e.target.files?.[0];
          if (image) onUpload(image);
          e.target.value = "";
        }}
      />
      <div className="prompt-bottom">
        <p>
          PNG · JPG · WEBP / 20MB 이하 · 이미지를 끌어놓거나 붙여넣을 수도
          있습니다.
        </p>
        <button
          onClick={() => useEditorStore.getState().commit(mockDocument())}
        >
          샘플 디자인 열기
        </button>
      </div>
    </div>
  );
}
