import { useRef, useState, useEffect } from "react";
import { Sparkles, Paperclip, X, Copy, ExternalLink, Plus } from "lucide-react";
import { mockDocument, makeLayer } from "@/lib/designParser";
import { useEditorStore } from "@/store/editorStore";
import {
  readAttachment,
  attachmentPng,
  type PromptAttachment,
} from "@/lib/promptAttachments";
import { buildChatPrompt } from "@/lib/chatgptHandoff";

function HandoffDialog({
  text,
  photos,
  onClose,
}: {
  text: string;
  photos: PromptAttachment[];
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
  }, []);
  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("프롬프트를 복사했습니다. ChatGPT 입력창에 붙여넣으세요.");
    } catch {
      setNotice(
        "자동 복사가 허용되지 않았습니다. 아래 텍스트를 선택해 직접 복사하세요.",
      );
    }
  }
  return (
    <dialog className="handoff-dialog" ref={dialog} onClose={onClose}>
      <div className="handoff-title">
        <h2>내 ChatGPT에서 이어서 대화하기</h2>
        <button
          aria-label="ChatGPT 안내 닫기"
          onClick={() => dialog.current?.close()}
        >
          <X size={18} />
        </button>
      </div>
      <p>1. 프롬프트를 복사하고, ChatGPT를 열어 붙여넣으세요.</p>
      <div className="handoff-actions">
        <button className="primary" onClick={() => void copyPrompt()}>
          <Copy size={15} />
          프롬프트 복사
        </button>
        <a
          className="outline-link"
          href="https://chatgpt.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink size={15} />내 ChatGPT 열기
        </a>
      </div>
      <textarea
        aria-label="ChatGPT 전달 프롬프트"
        readOnly
        value={text}
        onFocus={(e) => e.currentTarget.select()}
      />
      {photos.length > 0 && (
        <>
          <p>
            2. 아래 사진을 한 장씩 복사해 ChatGPT 입력창에 붙여넣으세요. 복사가
            안 되면 ChatGPT의 첨부 버튼으로 원본 사진을 선택하세요.
          </p>
          <div className="handoff-photos">
            {photos.map((photo) => (
              <div key={photo.id}>
                <img src={photo.src} alt={photo.name} />
                <span>{photo.name}</span>
                <button
                  onClick={async () => {
                    try {
                      if (
                        !navigator.clipboard?.write ||
                        typeof ClipboardItem === "undefined"
                      )
                        throw new Error();
                      await navigator.clipboard.write([
                        new ClipboardItem({
                          "image/png": attachmentPng(photo),
                        }),
                      ]);
                      setNotice(
                        `${photo.name} 복사 완료. ChatGPT에 붙여넣은 뒤 다음 사진을 복사하세요.`,
                      );
                    } catch {
                      setNotice(
                        "이 브라우저에서는 사진 복사가 허용되지 않습니다. ChatGPT에서 원본 사진을 직접 첨부하세요.",
                      );
                    }
                  }}
                >
                  <Copy size={13} />
                  사진 복사
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      {notice && (
        <p role="status" className="handoff-notice">
          {notice}
        </p>
      )}
      <p className="handoff-footnote">
        ChatGPT에 로그인된 계정으로 대화합니다. 프롬프트와 사진은 자동 전송되지
        않으며, ChatGPT 답변이 캔버스에 자동 적용되지는 않습니다.
      </p>
    </dialog>
  );
}

export default function PromptBar() {
  const [prompt, setPrompt] = useState(""),
    [photos, setPhotos] = useState<PromptAttachment[]>([]),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [handoff, setHandoff] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const uploading = useRef(false);
  const commit = useEditorStore((s) => s.commit);
  async function attach(files: File[]) {
    if (uploading.current) return;
    uploading.current = true;
    setBusy(true);
    const available = 4 - photos.length;
    const accepted: PromptAttachment[] = [];
    const errors: string[] = [];
    if (files.length > available)
      errors.push("사진은 최대 4장까지 첨부할 수 있습니다.");
    try {
      for (const file of files.slice(0, available)) {
        try {
          accepted.push(await readAttachment(file));
        } catch (error) {
          errors.push(
            error instanceof Error
              ? error.message
              : "사진을 불러오지 못했습니다.",
          );
        }
      }
      setPhotos((old) => [...old, ...accepted].slice(0, 4));
      setStatus(
        errors.join(" ") ||
          (accepted.length
            ? `${accepted.length}장 첨부됨. ChatGPT로 가져가거나 캔버스에 추가할 수 있습니다.`
            : ""),
      );
    } finally {
      uploading.current = false;
      setBusy(false);
    }
  }
  function sample() {
    const doc = mockDocument();
    photos.forEach((photo, i) => {
      if (i === 0) {
        doc.layers = doc.layers.map((l) =>
          l.type === "image"
            ? {
                ...l,
                src: photo.src,
                name: photo.name,
                height: (l.width * photo.height) / photo.width,
              }
            : l,
        );
      } else
        doc.layers.push(
          makeLayer("image", {
            name: photo.name,
            src: photo.src,
            x: 100 + i * 50,
            y: 550 + i * 50,
            width: 300,
            height: (300 * photo.height) / photo.width,
          }),
        );
    });
    commit(doc);
    setStatus(
      "편집 가능한 예시 디자인을 만들었습니다. 입력한 요청은 ChatGPT에서 이어서 대화할 수 있습니다.",
    );
  }
  return (
    <footer
      className="prompt-bar"
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        void attach(Array.from(e.dataTransfer.files));
      }}
    >
      <div className="prompt-label">
        <Sparkles size={18} />
        <strong>아이디어를 디자인으로</strong>
        <span>ChatGPT로 이어가기</span>
      </div>
      {photos.length > 0 && (
        <div className="attachment-strip">
          {photos.map((photo) => (
            <div className="attachment" key={photo.id}>
              <img src={photo.src} alt={photo.name} />
              <div>
                <span title={photo.name}>{photo.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    const s = useEditorStore.getState();
                    const scale = Math.min(
                      1,
                      (s.document.canvas.width * 0.6) / photo.width,
                      (s.document.canvas.height * 0.6) / photo.height,
                    );
                    s.add(
                      makeLayer("image", {
                        name: photo.name,
                        src: photo.src,
                        width: Math.round(photo.width * scale),
                        height: Math.round(photo.height * scale),
                      }),
                    );
                    setStatus(`${photo.name}을 캔버스에 추가했습니다.`);
                  }}
                >
                  <Plus size={12} />
                  캔버스에 추가
                </button>
              </div>
              <button
                aria-label={`${photo.name} 첨부 삭제`}
                disabled={busy}
                onClick={() =>
                  setPhotos((old) => old.filter((p) => p.id !== photo.id))
                }
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (prompt.trim())
            setHandoff(
              buildChatPrompt(
                prompt,
                useEditorStore.getState().document,
                photos.map((p) => p.name),
              ),
            );
        }}
      >
        <button
          type="button"
          className="attach-button"
          aria-label="참고 사진 첨부"
          title="참고 사진 첨부 (최대 4장)"
          disabled={busy || photos.length >= 4}
          onClick={() => input.current?.click()}
        >
          <Paperclip size={18} />
        </button>
        <input
          aria-label="디자인 프롬프트"
          placeholder="어떤 디자인을 만들까요? 사진도 첨부해 보세요."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onPaste={(e) => {
            const files = Array.from(e.clipboardData.files);
            if (files.length) {
              e.preventDefault();
              void attach(files);
            }
          }}
        />
        <button
          type="submit"
          className="primary"
          disabled={!prompt.trim() || busy}
        >
          ChatGPT로 가져가기 <ExternalLink size={15} />
        </button>
      </form>
      <input
        ref={input}
        aria-label="참고 사진 파일"
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          void attach(Array.from(e.target.files || []));
          e.target.value = "";
        }}
      />
      <div className="prompt-bottom">
        <p>
          {busy
            ? "사진을 불러오는 중…"
            : "사진 첨부 · 끌어놓기 · 붙여넣기 / 최대 4장, 각 10MB"}
        </p>
        <button type="button" disabled={busy} onClick={sample}>
          예시 디자인 생성
        </button>
      </div>
      {status && (
        <p role="status" className="prompt-status">
          {status}
        </p>
      )}
      {handoff !== null && (
        <HandoffDialog
          text={handoff}
          photos={photos}
          onClose={() => setHandoff(null)}
        />
      )}
    </footer>
  );
}
