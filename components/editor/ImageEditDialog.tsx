import { useEffect, useRef, useState } from "react";
import type { ImageLayer } from "@/types/design";
import { removeBackground, promptEditImage } from "@/lib/imageEditing";
import { applyImageResult } from "@/lib/applyImageResult";
import { useEditorStore } from "@/store/editorStore";
export default function ImageEditDialog({
  layer,
  mode,
  onClose,
  onRegion,
}: {
  layer: ImageLayer;
  mode: "background" | "prompt";
  onClose: () => void;
  onRegion: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    controller = useRef<AbortController | null>(null);
  const [prompt, setPrompt] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [done, setDone] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
    return () => controller.current?.abort();
  }, []);
  const run = async () => {
    if (controller.current) return;
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setMessage("처리 중입니다. 결과를 기다려 주세요.");
    try {
      const src =
        mode === "background"
          ? await removeBackground(layer, abort.signal, setMessage)
          : await promptEditImage(layer, prompt, abort.signal);
      if (abort.signal.aborted) return;
      const s = useEditorStore.getState();
      s.commit(applyImageResult(s.document, layer, src, crypto.randomUUID()));
      s.select(layer.id);
      setDone(true);
      setMessage("이미지에 적용했습니다. Ctrl Z로 되돌릴 수 있습니다.");
    } catch (e) {
      console.error("[image-edit]", {
        message: e instanceof Error ? e.message : String(e),
        diagnostic: (e as { diagnostic?: unknown }).diagnostic,
      });
      setMessage(
        abort.signal.aborted
          ? "작업을 취소했습니다."
          : `편집에 실패했습니다. ${e instanceof Error ? e.message : ""}`,
      );
    } finally {
      controller.current = null;
      setBusy(false);
    }
  };
  return (
    <dialog
      ref={dialog}
      className="image-edit-dialog compact"
      onCancel={(e) => {
        e.preventDefault();
        if (busy) controller.current?.abort();
        else onClose();
      }}
    >
      <header>
        <h2>{mode === "background" ? "배경 제거" : "프롬프트로 편집하기"}</h2>
        <button disabled={busy} aria-label="이미지 편집 닫기" onClick={onClose}>
          ×
        </button>
      </header>
      {mode === "prompt" ? (
        <>
          <textarea
            aria-label="이미지 편집 프롬프트"
            autoFocus
            placeholder="예: 배경을 병원 내부로 변경해줘"
            value={prompt}
            disabled={busy || done}
            maxLength={3500}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <p>
            현재 이미지 전체를 편집합니다. 일부만 수정하려면 영역을 선택하세요.
            실행 시 API 사용료가 발생합니다.
          </p>
          <button disabled={busy || done} onClick={onRegion}>
            영역을 선택해서 편집
          </button>
        </>
      ) : (
        <p>
          브라우저에서 주요 피사체를 분석해 배경을 투명하게 만듭니다. 복잡한
          배경이나 가는 머리카락의 경계는 정확하지 않을 수 있습니다.
        </p>
      )}
      <p role="status">{message}</p>
      <footer>
        {busy ? (
          <button onClick={() => controller.current?.abort()}>작업 취소</button>
        ) : (
          <button onClick={onClose}>{done ? "완료 · 닫기" : "취소"}</button>
        )}
        {!done && (
          <button
            className="primary"
            disabled={busy || (mode === "prompt" && !prompt.trim())}
            onClick={run}
          >
            {busy ? "처리 중…" : "실행"}
          </button>
        )}
      </footer>
    </dialog>
  );
}
