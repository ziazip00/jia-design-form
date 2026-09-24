import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "@/store/editorStore";
import { mockDocument } from "@/lib/designParser";
import ColorPalette from './ColorPalette';
import {prepareImage} from '@/lib/imageSeparation';
type Result = { id: string; src: string; size: string };
export default function AIComposer({
  onSeparate,
  onApply,
}: {
  onSeparate: () => void;
  onApply: (src: string, separate: boolean) => Promise<void>;
}) {
  const file = useRef<HTMLInputElement>(null),
    pending = useRef(false),
    resultPanel = useRef<HTMLDivElement>(null);
  const [prompt, setPrompt] = useState(""),
    [reference, setReference] = useState<string | null>(null),
    [results, setResults] = useState<Result[]>([]),
    [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false),
    [preparing, setPreparing] = useState(false),
    [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [ready, setReady] = useState<boolean | null>(null);
  const [size, setSize] = useState("1024x1024"),
    [quality, setQuality] = useState("low"),
    [mode, setMode] = useState<"new" | "edit">("new");
  const selected = useEditorStore((s) =>
    s.document.layers.find((l) => l.id === s.selectedId),
  );
  useEffect(() => {
    if (result)
      resultPanel.current?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
  }, [result]);
  useEffect(() => {
    let alive = true;
    fetch("/api/images")
      .then((r) => r.json())
      .then((v) => {
        if (alive) setReady(v.ready === true);
      })
      .catch(() => {
        if (alive) setReady(false);
      });
    return () => {
      alive = false;
    };
  }, []);
  async function prepare(src: string) {
    setPreparing(true);
    setError("");
    try {
      const image = new Image();
      image.src = src;
      await image.decode();
      if (image.naturalWidth * image.naturalHeight > 40_000_000)
        throw new Error("4천만 픽셀 이하의 사진을 선택하세요.");
      const ratio = Math.min(
        1,
        1536 / Math.max(image.naturalWidth, image.naturalHeight),
      );
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.naturalWidth * ratio);
      canvas.height = Math.round(image.naturalHeight * ratio);
      canvas
        .getContext("2d")!
        .drawImage(image, 0, 0, canvas.width, canvas.height);
      let data = canvas.toDataURL("image/png");
      if (data.length > 5_000_000) data = canvas.toDataURL("image/jpeg", 0.9);
      if (data.length > 5_000_000) throw new Error("사진 용량을 줄여 주세요.");
      setReference(data);
      setMode("edit");
      setStatus("바꾸고 싶은 내용을 입력하세요.");
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : "사진을 읽지 못했습니다.");
    } finally {
      setPreparing(false);
    }
  }
  async function attach(f: File) {
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(f.type) ||
      f.size > 20 * 1024 * 1024
    ) {
      setError("20MB 이하의 PNG, JPG, WEBP를 선택하세요.");
      return;
    }
    const url = URL.createObjectURL(f);
    try {
      const data = await prepare(url);
      if (data) await onApply(data, false);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  async function submit() {
    if (pending.current || preparing || !prompt.trim()) return;
    if (mode === "edit" && !reference) {
      setError("사진을 첨부하거나 선택 사진을 가져오세요.");
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    setStatus("이미지를 만들고 있습니다. 최대 3분 정도 걸릴 수 있습니다.");
    try {
      const response = await fetch("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          mode,
          size,
          quality,
          image: reference || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "이미지 생성에 실패했습니다.");
      if (
        typeof data.src !== "string" ||
        !data.src.startsWith("data:image/png;base64,")
      )
        throw new Error("결과 이미지를 읽지 못했습니다.");
      const next = data as Result;
      setResults((old) => [next, ...old].slice(0, 3));
      setResult(next);
      setReference(next.src);
      setMode("edit");
      setStatus(
        "완성되었습니다. 추가 수정 내용을 입력하거나 캔버스에 적용하세요.",
      );
      await onApply(next.src,false);
      setStatus('완성 이미지를 캔버스에 추가했습니다. 컬러 팔레트로 색상을 바꿔 보세요.');
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "연결에 실패했습니다. 자동 재시도하지 않았습니다.",
      );
      setStatus("");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function apply(src: string, separate: boolean) {
    try {
      await onApply(src, separate);
      setStatus("캔버스에 추가했습니다.");
    } catch {
      setError("캔버스 적용에 실패했습니다.");
    }
  }
  return (
    <section
      className="prompt-bar ai-composer"
      aria-label="AI 이미지 생성 및 수정"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (!busy && !preparing && e.dataTransfer.files[0])
          void attach(e.dataTransfer.files[0]);
      }}
      onPaste={(e) => {
        const f = [...e.clipboardData.items]
          .find((i) => i.type.startsWith("image/"))
          ?.getAsFile();
        if (f) {
          e.preventDefault();
          if (!busy && !preparing) void attach(f);
        }
      }}
    >
      <div className="prompt-label">
        <strong>어떤 이미지를 만들거나 수정할까요?</strong>
      </div>
      <fieldset disabled={busy || preparing} className="composer-controls">
        <div className="composer-options">
          <select
            aria-label="작업 방식"
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as "new" | "edit");
              if (e.target.value === "new") setReference(null);
            }}
          >
            <option value="new">새 이미지 생성</option>
            <option value="edit">이미지 수정</option>
          </select>
          <select
            aria-label="생성 이미지 크기"
            value={size}
            onChange={(e) => setSize(e.target.value)}
          >
            <option value="1024x1024">정사각형</option>
            <option value="1024x1536">세로형</option>
            <option value="1536x1024">가로형</option>
          </select>
          <select
            aria-label="생성 품질"
            value={quality}
            onChange={(e) => setQuality(e.target.value)}
          >
            <option value="low">빠른 초안</option>
            <option value="medium">표준 품질</option>
          </select>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <textarea
            aria-label="이미지 프롬프트"
            placeholder="예: 하늘색 배경의 피부과 이벤트 포스터를 만들어줘. / 제목을 더 크게 바꿔줘."
            value={prompt}
            maxLength={4000}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                void submit();
              }
            }}
          />
          <button
            className="primary"
            disabled={!prompt.trim() || ready !== true}
            type="submit"
          >
            {busy
              ? "생성 중…"
              : mode === "edit"
                ? "이미지 수정"
                : "이미지 생성"}
          </button>
        </form>
        <ColorPalette disabled={busy||preparing}/>
        <div className="composer-actions">
          <button type="button" onClick={() => file.current?.click()}>
            ＋ 사진 첨부
          </button>
          {selected?.type === "image" && (
            <button type="button" onClick={() => {void prepareImage(selected,1536).then(c=>prepare(c.toDataURL('image/png'))).catch(()=>setError('선택 이미지를 읽지 못했습니다.'));}}>
              선택 사진 가져오기
            </button>
          )}
          <button type="button" onClick={onSeparate}>
            레이어 분리
          </button>
          <button
            type="button"
            onClick={() => useEditorStore.getState().commit(mockDocument())}
          >
            샘플 디자인
          </button>
        </div>
        <input
          ref={file}
          hidden
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => {
            if (e.target.files?.[0]) void attach(e.target.files[0]);
            e.target.value = "";
          }}
        />
        {reference && (
          <div className="reference-image">
            <img src={reference} alt="수정에 사용할 이미지" />
            <span>수정할 이미지</span>
            <button
              type="button"
              onClick={() => {
                setReference(null);
                setMode("new");
              }}
            >
              첨부 해제
            </button>
            <button type="button" onClick={() => void apply(reference, true)}>
              이 이미지 분리
            </button>
          </div>
        )}
      </fieldset>
      <p className="generation-notice">
        생성·수정 버튼을 누를 때 API 비용이 발생합니다. 요청당 1장 · 자동 재시도
        없음
      </p>
      {ready === false && (
        <p role="alert" className="generation-error">
          생성 연결이 준비되지 않았습니다. 배포 완료 후 새로고침해 주세요.
        </p>
      )}
      {error && (
        <p role="alert" className="generation-error">
          {error}
        </p>
      )}
      <p role="status" aria-live="polite" className="generation-status">
        {preparing ? "사진을 준비하고 있습니다…" : status}
      </p>
      {result && (
        <div ref={resultPanel} className="generation-result">
          <img
            className="finished-image"
            src={result.src}
            alt="AI가 생성한 완성 이미지"
          />
          <div className="result-actions">
            <strong>완성 이미지</strong>
            <span>새로고침 전 다운로드해 주세요.</span>
            <button
              disabled={busy || preparing}
              onClick={() => void prepare(result.src)}
            >
              이 결과로 계속 수정
            </button>
            <button
              disabled={busy || preparing}
              onClick={() => void apply(result.src, false)}
            >
              캔버스에 추가
            </button>
            <button
              disabled={busy || preparing}
              onClick={() => void apply(result.src, true)}
            >
              텍스트·피사체 분리
            </button>
            <a href={result.src} download="jia-generated.png">
              PNG 다운로드
            </a>
            <div className="result-history">
              {results.map((r, i) => (
                <button
                  key={r.id}
                  aria-label={`최근 결과 ${i + 1} 보기`}
                  onClick={() => setResult(r)}
                >
                  <img src={r.src} alt="" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
