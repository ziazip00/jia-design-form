import { useEffect, useRef, useState } from "react";
import {
  X,
  Scissors,
  Undo2,
  Layers,
  MousePointer2,
  PenLine,
} from "lucide-react";
import type { ImageLayer } from "@/types/design";
import { useEditorStore } from "@/store/editorStore";
import { makeLayer } from "@/lib/designParser";
import { prepareImage, loadImage } from "@/lib/imageSeparation";
import { inpaintSelection, selectionMask } from "@/lib/inpaintSelection";
import type { Point } from "@/lib/regionSelection";

type Selection = { points: Point[]; closed: boolean };
const empty = (): Selection => ({ points: [], closed: false });
export default function ImageSeparationDialog({
  layer,
  onClose,
  onDone,
}: {
  layer: ImageLayer;
  onClose: () => void;
  onDone: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    preview = useRef<HTMLCanvasElement>(null),
    source = useRef<HTMLCanvasElement | null>(null);
  const [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState("이미지를 준비하고 있습니다…");
  const [view, setView] = useState<"original" | "regions" | "result">(
    "regions",
  );
  const [mode, setMode] = useState<"polygon" | "freehand">("polygon");
  const [selection, setSelection] = useState<Selection>(empty),
    [confirmed, setConfirmed] = useState(false);
  const selectionRef = useRef(selection),
    history = useRef<Selection[]>([]);
  const [historyVersion, setHistoryVersion] = useState(0);
  const gesture = useRef<{
    vertex: number;
    freehand: boolean;
    before: Selection;
  } | null>(null);
  const [result, setResult] = useState<string | null>(null),
    controller = useRef<AbortController | null>(null),
    running = useRef(false);
  const change = (next: Selection) => {
    selectionRef.current = next;
    setSelection(next);
    setConfirmed(false);
    setResult(null);
  };
  const remember = () => {
    history.current.push(structuredClone(selectionRef.current));
    if (history.current.length > 30) history.current.shift();
    setHistoryVersion((v) => v + 1);
  };
  const close = () => {
    controller.current?.abort();
    onClose();
  };
  useEffect(() => {
    dialog.current?.showModal();
    let active = true;
    void prepareImage(layer, Infinity)
      .then((c) => {
        if (active) {
          source.current = c;
          setLoaded(true);
          setStatus(
            "외곽을 클릭하거나 드래그해 선택한 뒤 선택 확정을 누르세요.",
          );
        }
      })
      .catch((e) => {
        if (active) setStatus(e.message);
      });
    return () => {
      active = false;
      controller.current?.abort();
    };
  }, [layer]);
  useEffect(() => {
    const c = preview.current,
      image = source.current;
    if (!c || !image) return;
    c.width = image.width;
    c.height = image.height;
    const ctx = c.getContext("2d")!;
    let active = true;
    if (view === "result" && result) {
      void loadImage(result).then((i) => {
        if (active) ctx.drawImage(i, 0, 0);
      });
    } else {
      ctx.drawImage(image, 0, 0);
      if (view === "regions" && selection.points.length) {
        const unit = image.width / Math.max(1, c.getBoundingClientRect().width);
        ctx.beginPath();
        selection.points.forEach((p, i) =>
          i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
        );
        if (selection.closed) {
          ctx.closePath();
          ctx.fillStyle = "#2b87d51f";
          ctx.fill("evenodd");
        }
        ctx.lineWidth = 2 * unit;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
        ctx.setLineDash([6 * unit, 5 * unit]);
        ctx.strokeStyle = "#185b9b";
        ctx.stroke();
        ctx.setLineDash([]);
        if (!confirmed)
          for (const p of selection.points) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3.5 * unit, 0, Math.PI * 2);
            ctx.fillStyle = "#fff";
            ctx.fill();
            ctx.lineWidth = unit;
            ctx.strokeStyle = "#185b9b";
            ctx.stroke();
          }
      }
    }
    return () => {
      active = false;
    };
  }, [loaded, selection, confirmed, view, result]);
  function point(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(
        0,
        Math.min(
          e.currentTarget.width,
          ((e.clientX - r.left) * e.currentTarget.width) / r.width,
        ),
      ),
      y: Math.max(
        0,
        Math.min(
          e.currentTarget.height,
          ((e.clientY - r.top) * e.currentTarget.height) / r.height,
        ),
      ),
    };
  }
  function reset() {
    remember();
    change(empty());
    setView("regions");
    setStatus("선택을 취소했습니다. 새 외곽선을 지정하세요.");
  }
  function closePath() {
    if (selectionRef.current.points.length < 3) {
      setStatus("서로 다른 지점 3개 이상을 지정하세요.");
      return;
    }
    remember();
    change({ ...selectionRef.current, closed: true });
    setStatus("점을 드래그해 경계를 수정하거나 선택 확정을 누르세요.");
  }
  function confirm() {
    try {
      selectionMask(
        source.current!.width,
        source.current!.height,
        selectionRef.current.points,
      );
      if (!selectionRef.current.closed)
        throw Error("먼저 외곽선 닫기를 누르세요.");
      setConfirmed(true);
      setStatus(
        "선택 영역이 확정됐습니다. 선택 영역 삭제를 누르면 AI로 자동 자리 채우기를 실행합니다.",
      );
    } catch (e) {
      setStatus((e as Error).message);
    }
  }
  async function remove() {
    if (running.current || !confirmed || !source.current) return;
    running.current = true;
    setBusy(true);
    setResult(null);
    const abort = new AbortController();
    controller.current = abort;
    setStatus("선택 영역을 삭제하고 주변 배경으로 복원하고 있습니다…");
    try {
      const output = await inpaintSelection(
        source.current,
        selectionRef.current.points,
        abort.signal,
      );
      if (abort.signal.aborted) return;
      setResult(output);
      setView("result");
      setStatus(
        "자동 자리 채우기 완료. 원본과 비교한 뒤 이미지 레이어로 적용하세요.",
      );
    } catch (e) {
      setStatus(
        abort.signal.aborted
          ? "요청을 취소했습니다. 이미 처리 중인 API 요청은 비용이 발생할 수 있습니다."
          : e instanceof Error
            ? e.message
            : "자동 자리 채우기 실패",
      );
    } finally {
      running.current = false;
      setBusy(false);
      controller.current = null;
    }
  }
  function apply() {
    if (!result || busy) return;
    const s = useEditorStore.getState(),
      current = s.document.layers.find((l) => l.id === layer.id);
    if (!current || JSON.stringify(current) !== JSON.stringify(layer)) {
      setStatus("원본이 변경됐습니다. 창을 닫고 다시 편집하세요.");
      return;
    }
    const restored = makeLayer("image", {
      ...layer,
      id: crypto.randomUUID(),
      name: layer.name + " · 영역 삭제·복원",
      src: result,
      flipX: false,
      flipY: false,
      locked: false,
    });
    const layers = [...s.document.layers],
      i = layers.findIndex((l) => l.id === layer.id);
    layers.splice(
      i,
      1,
      {
        ...layer,
        name: layer.name + " · 원본 보관",
        visible: false,
        locked: true,
      },
      restored,
    );
    s.commit({ ...s.document, layers });
    s.select(restored.id);
    onDone();
    onClose();
  }
  return (
    <dialog
      ref={dialog}
      className="separation-dialog"
      aria-labelledby="separation-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy && selection.points.length) reset();
        else close();
      }}
    >
      <header>
        <div>
          <h2 id="separation-title">
            <Layers size={20} /> 이미지 → 편집 레이어
          </h2>
          <p>
            외곽선으로 영역을 선택하고, 삭제한 자리를 자연스럽게 복원합니다.
          </p>
        </div>
        <button aria-label="편집 창 닫기" onClick={close}>
          <X />
        </button>
      </header>
      <div className="separation-body">
        <div className="separation-preview">
          <div className="separation-tabs" role="group" aria-label="편집 단계">
            {(
              [
                ["original", "원본"],
                ["regions", "선택영역"],
                ["result", "분리결과"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                aria-pressed={view === v}
                disabled={v === "result" && !result}
                onClick={() => setView(v)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="separation-artboard">
            <canvas
              ref={preview}
              aria-label="외곽선 선택 캔버스"
              style={{
                cursor:
                  busy || confirmed || view !== "regions"
                    ? "default"
                    : "crosshair",
                touchAction: "none",
              }}
              onPointerDown={(e) => {
                if (
                  e.button !== 0 ||
                  busy ||
                  !loaded ||
                  confirmed ||
                  view !== "regions"
                )
                  return;
                const p = point(e),
                  s = selectionRef.current,
                  unit =
                    e.currentTarget.width /
                    e.currentTarget.getBoundingClientRect().width;
                const vertex = s.points.findIndex(
                  (q) => Math.hypot(q.x - p.x, q.y - p.y) < 9 * unit,
                );
                e.currentTarget.setPointerCapture(e.pointerId);
                if (s.closed) {
                  if (vertex >= 0) {
                    remember();
                    gesture.current = {
                      vertex,
                      freehand: false,
                      before: structuredClone(s),
                    };
                  }
                  return;
                }
                if (mode === "polygon") {
                  if (vertex === 0 && s.points.length >= 3) {
                    closePath();
                    return;
                  }
                  if (s.points.length >= 2000) {
                    setStatus(
                      "선택 지점이 너무 많습니다. 외곽선을 닫아 주세요.",
                    );
                    return;
                  }
                  remember();
                  change({ points: [...s.points, p], closed: false });
                } else {
                  remember();
                  gesture.current = {
                    vertex: -1,
                    freehand: true,
                    before: structuredClone(s),
                  };
                  change({ points: [p], closed: false });
                }
              }}
              onPointerMove={(e) => {
                const g = gesture.current;
                if (!g) return;
                const p = point(e),
                  s = selectionRef.current;
                if (g.freehand) {
                  const last = s.points.at(-1)!;
                  const unit =
                    e.currentTarget.width /
                    e.currentTarget.getBoundingClientRect().width;
                  if (
                    Math.hypot(p.x - last.x, p.y - last.y) > 4 * unit &&
                    s.points.length < 2000
                  )
                    change({ points: [...s.points, p], closed: false });
                } else
                  change({
                    ...s,
                    points: s.points.map((q, i) => (i === g.vertex ? p : q)),
                  });
              }}
              onPointerUp={(e) => {
                const g = gesture.current;
                gesture.current = null;
                if (e.currentTarget.hasPointerCapture(e.pointerId))
                  e.currentTarget.releasePointerCapture(e.pointerId);
                if (g?.freehand) {
                  const s = selectionRef.current;
                  if (s.points.length >= 3) change({ ...s, closed: true });
                  else {
                    change(g.before);
                    setStatus("외곽선을 따라 길게 드래그해 주세요.");
                  }
                }
              }}
              onPointerCancel={() => {
                const g = gesture.current;
                gesture.current = null;
                if (g) change(g.before);
              }}
            />
          </div>
          <p className="separation-caption">
            점선 안쪽: 삭제할 영역 · 경계점 드래그로 수정{" "}
            {loaded &&
              `· 원본 ${source.current?.width} × ${source.current?.height}`}
          </p>
        </div>
        <div className="separation-controls">
          <fieldset disabled={!loaded || busy}>
            <section>
              <h3>영역 선택</h3>
              <div className="brush-tools">
                <button
                  aria-pressed={mode === "polygon"}
                  disabled={confirmed || selection.closed}
                  onClick={() => {
                    setMode("polygon");
                    setView("regions");
                  }}
                >
                  <MousePointer2 size={15} /> 클릭으로 외곽 지정
                </button>
                <button
                  aria-pressed={mode === "freehand"}
                  disabled={confirmed || selection.closed}
                  onClick={() => {
                    setMode("freehand");
                    setView("regions");
                  }}
                >
                  <PenLine size={15} /> 드래그로 외곽 지정
                </button>
              </div>
              <p>
                클릭으로 점을 이어 첫 점을 누르거나 ‘외곽선 닫기’를 선택하세요.
                드래그 방식은 마우스를 놓으면 닫힙니다. 닫힌 경계의 점은 확정
                전까지 이동할 수 있습니다.
              </p>
              <button
                disabled={
                  confirmed || selection.closed || selection.points.length < 3
                }
                onClick={closePath}
              >
                외곽선 닫기
              </button>
              <button
                disabled={!history.current.length}
                data-history={historyVersion}
                onClick={() => {
                  const old = history.current.pop();
                  if (old) {
                    change(old);
                    setView("regions");
                    setHistoryVersion((v) => v + 1);
                  }
                }}
              >
                <Undo2 size={15} /> 선택 실행 취소
              </button>
              <button disabled={!selection.points.length} onClick={reset}>
                선택 취소
              </button>
              {confirmed ? (
                <button
                  onClick={() => {
                    setConfirmed(false);
                    setResult(null);
                    setView("regions");
                  }}
                >
                  선택 다시 수정
                </button>
              ) : (
                <button
                  className="separation-action"
                  disabled={!selection.closed}
                  onClick={confirm}
                >
                  선택 확정
                </button>
              )}
            </section>
            <section>
              <h3>선택 영역 삭제</h3>
              <p>
                선택 안쪽만 삭제하고 주변 이미지의 배경·질감을 분석하여 자동
                자리 채우기를 실행합니다. 선택 밖의 원본 픽셀은 유지합니다.
              </p>
              <button
                className="separation-action"
                disabled={!confirmed}
                onClick={() => void remove()}
              >
                <Scissors size={17} /> 선택 영역 삭제 · 자동 자리 채우기
              </button>
              <p>
                OpenAI로 이미지와 선택 마스크를 전송하며 API 비용이 발생합니다.
                복원 품질은 배경에 따라 달라집니다. 단색·투명 채우기로 대체하지
                않습니다.
              </p>
            </section>
          </fieldset>
        </div>
      </div>
      <footer>
        <div>
          <p role="status" aria-live="polite">
            {status}
          </p>
          <small>
            원본은 숨긴 레이어로 보관합니다. 적용 후 Ctrl+Z로 되돌릴 수
            있습니다.
          </small>
        </div>
        <div className="separation-footer-actions">
          {busy ? (
            <button onClick={() => controller.current?.abort()}>
              처리 취소
            </button>
          ) : (
            <button className="primary" disabled={!result} onClick={apply}>
              <Layers size={17} /> 이미지 레이어로 적용
            </button>
          )}
        </div>
      </footer>
    </dialog>
  );
}
