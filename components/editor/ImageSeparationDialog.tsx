import { useEffect, useRef, useState } from "react";
import {
  X,
  ScanText,
  Scissors,
  Brush,
  Eraser,
  Undo2,
  Plus,
  Eye,
  Layers,
} from "lucide-react";
import type { ImageLayer } from "@/types/design";
import { useEditorStore } from "@/store/editorStore";
import {
  canvas,
  prepareImage,
  recognizeText,
  renderSeparation,
  separationLayers,
  type TextRegion,
  type SeparationResult,
} from "@/lib/imageSeparation";
import { removeImageText } from "@/lib/removeImageText";

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
    preview = useRef<HTMLCanvasElement>(null);
  const source = useRef<HTMLCanvasElement | null>(null),
    mask = useRef<HTMLCanvasElement | null>(null);
  const controller = useRef<AbortController | null>(null),
    running = useRef(false);
  const previousMasks = useRef<ImageData[]>([]),
    stroke = useRef<{ x: number; y: number } | null>(null);
  const [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState("이미지를 준비하고 있습니다…");
  const [texts, setTexts] = useState<TextRegion[]>([]),
    [selected, setSelected] = useState<string | null>(null);
  const [maskVersion, setMaskVersion] = useState(0),
    [hasMask, setHasMask] = useState(false);
  const [tool, setTool] = useState<"view" | "add" | "erase">("view"),
    [brush, setBrush] = useState(30);
  const [view, setView] = useState<"regions" | "original" | "result" | "cutout">(
    "regions",
  );
  const [fill, setFill] = useState<"surround" | "solid" | "transparent">(
      "surround",
    ),
    [color, setColor] = useState("#ffffff");
  const [result, setResult] = useState<SeparationResult | null>(null);
  const activeText = texts.find((t) => t.id === selected);
  const close = () => {
    controller.current?.abort();
    onClose();
  };
  useEffect(() => {
    dialog.current?.showModal();
    let active = true;
    void prepareImage(layer)
      .then((c) => {
        if (!active) return;
        source.current = c;
        mask.current = canvas(c.width, c.height);
        setLoaded(true);
        setStatus("글자 추출 또는 직접 오려내기로 시작하세요.");
      })
      .catch((e) => {
        if (active) setStatus(e.message);
      });
    return () => {
      active = false;
      controller.current?.abort();
      dialog.current?.close();
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
      const i = new Image();
      i.onload = () => {
        if (active) ctx.drawImage(i, 0, 0);
      };
      i.src = result.preview;
    } else {
      ctx.drawImage(image, 0, 0);
      if (view === "cutout" && mask.current) {
        ctx.globalCompositeOperation = "destination-in";
        ctx.drawImage(mask.current, 0, 0);
        ctx.globalCompositeOperation = "source-over";
      }
      if (view === "regions") {
        if (mask.current && hasMask) {
          const tint = canvas(image.width, image.height),
            tc = tint.getContext("2d")!;
          tc.drawImage(mask.current, 0, 0);
          tc.globalCompositeOperation = "source-in";
          tc.fillStyle = "#1da8c4";
          tc.fillRect(0, 0, image.width, image.height);
          ctx.globalAlpha = 0.4;
          ctx.drawImage(tint, 0, 0);
          ctx.globalAlpha = 1;
        }
        ctx.lineWidth = Math.max(2, image.width / 500);
        for (const t of texts.filter((t) => t.enabled)) {
          ctx.strokeStyle = t.id === selected ? "#e78622" : "#3079c8";
          ctx.strokeRect(t.x, t.y, t.width, t.height);
        }
      }
    }
    return () => {
      active = false;
    };
  }, [loaded, texts, selected, hasMask, maskVersion, view, result]);
  function dirty() {
    setResult(null);
    setView("regions");
  }
  async function run(task: (signal: AbortSignal) => Promise<void>) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    const abort = new AbortController();
    controller.current = abort;
    try {
      await task(abort.signal);
    } catch (error) {
      setStatus(
        abort.signal.aborted
          ? "작업을 취소했습니다. 다시 시도할 수 있습니다."
          : error instanceof Error
            ? error.message
            : "처리에 실패했습니다.",
      );
    } finally {
      running.current = false;
      setBusy(false);
      controller.current = null;
    }
  }
  function patchText(values: Partial<TextRegion>) {
    setTexts((prev) =>
      prev.map((t) => (t.id === selected ? { ...t, ...values } : t)),
    );
    dirty();
  }
  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(
        0,
        Math.min(
          e.currentTarget.width - 1,
          ((e.clientX - r.left) * e.currentTarget.width) / r.width,
        ),
      ),
      y: Math.max(
        0,
        Math.min(
          e.currentTarget.height - 1,
          ((e.clientY - r.top) * e.currentTarget.height) / r.height,
        ),
      ),
    };
  }
  function paint(p: { x: number; y: number }) {
    const c = mask.current,
      before = stroke.current;
    if (!c || !before) return;
    const ctx = c.getContext("2d")!;
    ctx.globalCompositeOperation =
      tool === "erase" ? "destination-out" : "source-over";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = brush;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(before.x, before.y);
    ctx.lineTo(p.x + 0.01, p.y + 0.01);
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
    stroke.current = p;
    setHasMask(true);
    setMaskVersion((v) => v + 1);
    dirty();
  }
  function rememberMask() {
    const c = mask.current;
    if (c) {
      previousMasks.current.push(
        c.getContext("2d")!.getImageData(0, 0, c.width, c.height),
      );
      if (previousMasks.current.length > 5) previousMasks.current.shift();
    }
  }
  function apply() {
    if (!result || busy) return;
    const s = useEditorStore.getState(),
      current = s.document.layers.find((l) => l.id === layer.id);
    if (!current || JSON.stringify(current) !== JSON.stringify(layer)) {
      setStatus("원본 레이어가 변경됐습니다. 창을 닫고 다시 분리해 주세요.");
      return;
    }
    const extracted = separationLayers(layer, result),
      index = s.document.layers.findIndex((l) => l.id === layer.id);
    const layers = [...s.document.layers];
    layers.splice(
      index,
      1,
      {
        ...layer,
        name: layer.name + " · 원본 보관",
        visible: false,
        locked: true,
      },
      ...extracted,
    );
    s.commit({ ...s.document, layers });
    s.select(extracted.at(-1)!.id);
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
        close();
      }}
    >
      <header>
        <div>
          <h2 id="separation-title">
            <Layers size={20} /> 이미지 → 편집 레이어
          </h2>
          <p>글자는 텍스트로, 피사체는 투명 이미지로 분리합니다.</p>
        </div>
        <button aria-label="분리 창 닫기" onClick={close}>
          <X />
        </button>
      </header>
      <div className="separation-body">
        <div className="separation-preview">
          <div
            className="separation-tabs"
            role="group"
            aria-label="분리 미리보기"
          >
            {(
              [
                ["original", "원본"],
                ["regions", "선택 영역"],
                ["cutout", "오려낼 부분"],
                ["result", "분리 결과"],
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
              aria-label="이미지 분리 미리보기 및 피사체 브러시"
              style={{
                cursor:
                  tool === "view" || view !== "regions"
                    ? "default"
                    : "crosshair",
              }}
              onPointerDown={(e) => {
                if (busy || !loaded || tool === "view" || view !== "regions")
                  return;
                e.currentTarget.setPointerCapture(e.pointerId);
                rememberMask();
                stroke.current = point(e);
                paint(stroke.current);
              }}
              onPointerMove={(e) => {
                if (stroke.current) paint(point(e));
              }}
              onPointerUp={() => {
                stroke.current = null;
              }}
              onPointerCancel={() => {
                stroke.current = null;
              }}
            />
          </div>
          <p className="separation-caption">
            파란 테두리: 추출할 글자 · 청록색: 분리할 피사체
            {loaded &&
              ` · 처리 크기 ${source.current?.width} × ${source.current?.height}`}
          </p>
        </div>
        <div className="separation-controls">
          <fieldset disabled={!loaded || busy}>
            <section>
              <h3>1. 글자 추출</h3>
              <button
                className="separation-action"
                onClick={() =>
                  void run(async (signal) => {
                    const found = await recognizeText(
                      source.current!,
                      signal,
                      setStatus,
                    );
                    if (signal.aborted) return;
                    setTexts(found);
                    setSelected(found[0]?.id || null);
                    dirty();
                    setStatus(
                      found.length
                        ? `${found.length}개 글자 영역을 찾았습니다. 오타와 위치를 확인해 주세요.`
                        : "글자를 찾지 못했습니다. 글자 영역을 직접 추가할 수 있습니다.",
                    );
                  })
                }
              >
                <ScanText size={17} />
                {texts.length
                  ? "다시 인식 (수정 내용 초기화)"
                  : "글자 추출 · 한글·영문"}
              </button>
              <button className="separation-action" onClick={() => void run(async (signal) => {
                setStatus("모든 글자를 제거하고 배경을 복원하고 있습니다…");
                const src = await removeImageText(source.current!, signal);
                if (signal.aborted) return;
                setResult({background: src, preview: src, texts: [], width: source.current!.width, height: source.current!.height});
                setView("result");
                setStatus("글자 제거 결과를 확인하세요. AI 복원은 글자 외 세부 이미지도 바꿀 수 있습니다. 적용 전 원본과 비교해 주세요.");
              })}>글자 모두 제거 · AI 배경 복원</button>
              <p>이 버튼은 이미지를 OpenAI에 보내며 API 사용료가 발생합니다. 결과 확인 후 새 이미지 레이어로 적용합니다.</p>
              <div className="text-region-list">
                {texts.map((t, i) => (
                  <div key={t.id} className={selected === t.id ? "chosen" : ""}>
                    <input
                      type="checkbox"
                      aria-label={`글자 ${i + 1} 추출`}
                      checked={t.enabled}
                      onChange={(e) => {
                        setTexts((v) =>
                          v.map((x) =>
                            x.id === t.id
                              ? { ...x, enabled: e.target.checked }
                              : x,
                          ),
                        );
                        dirty();
                      }}
                    />
                    <button
                      onClick={() => {
                        setSelected(t.id);
                        setView("regions");
                      }}
                    >
                      {t.text || "(빈 글자)"}
                    </button>
                    <span title="인식 신뢰도">{Math.round(t.confidence)}%</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  const c = source.current!;
                  const t: TextRegion = {
                    id: crypto.randomUUID(),
                    text: "새 텍스트",
                    x: Math.round(c.width * 0.1),
                    y: Math.round(c.height * 0.1),
                    width: Math.round(c.width * 0.5),
                    height: 50,
                    fontSize: 40,
                    color: "#172f47",
                    confidence: 100,
                    enabled: true,
                  };
                  setTexts((v) => [...v, t]);
                  setSelected(t.id);
                  dirty();
                }}
              >
                <Plus size={15} /> 글자 영역 직접 추가
              </button>
              {activeText && (
                <div className="region-fields">
                  <label>
                    추출 글자
                    <textarea
                      aria-label="추출 글자 수정"
                      value={activeText.text}
                      onChange={(e) => patchText({ text: e.target.value })}
                    />
                  </label>
                  <div className="two">
                    {(["x", "y", "width", "height", "fontSize"] as const).map(
                      (k) => (
                        <label key={k}>
                          {
                            {
                              x: "영역 X",
                              y: "영역 Y",
                              width: "영역 너비",
                              height: "영역 높이",
                              fontSize: "글자 크기",
                            }[k]
                          }
                          <input
                            type="number"
                            aria-label={`추출 ${k}`}
                            value={activeText[k]}
                            min={k === "x" || k === "y" ? 0 : 1}
                            max={
                              k === "x" || k === "width"
                                ? source.current!.width
                                : k === "fontSize"
                                  ? 500
                                  : source.current!.height
                            }
                            onChange={(e) => {
                              const max =
                                k === "x" || k === "width"
                                  ? source.current!.width
                                  : k === "fontSize"
                                    ? 500
                                    : source.current!.height;
                              patchText({
                                [k]: Math.max(
                                  k === "x" || k === "y" ? 0 : 1,
                                  Math.min(max, Number(e.target.value)),
                                ),
                              });
                            }}
                          />
                        </label>
                      ),
                    )}
                    <label>
                      글자 색
                      <input
                        type="color"
                        aria-label="추출 글자 색"
                        value={activeText.color}
                        onChange={(e) => patchText({ color: e.target.value })}
                      />
                    </label>
                  </div>
                </div>
              )}
              <p>
                글꼴은 적용 후 속성에서 내 PC·산돌폰트로 변경할 수 있습니다.
                영역은 기존 글자가 지워질 범위입니다.
              </p>
            </section>
            <section>
              <h3>2. 피사체 분리</h3>
              <button
                className="separation-action"
                onClick={() => { setTool("add"); setView("regions"); setStatus("남길 부분을 포함 브러시로 칠하고 제외 브러시로 다듬으세요."); }}
              >
                <Scissors size={17} /> 직접 오려내기
              </button>
              <div className="brush-tools">
                {(
                  [
                    ["view", Eye, "보기"],
                    ["add", Brush, "포함"],
                    ["erase", Eraser, "제외"],
                  ] as const
                ).map(([v, Icon, label]) => (
                  <button
                    key={v}
                    aria-pressed={tool === v}
                    onClick={() => {
                      setTool(v);
                      setView("regions");
                    }}
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                ))}
                <button
                  aria-label="브러시 실행 취소"
                  disabled={!previousMasks.current.length}
                  onClick={() => {
                    const old = previousMasks.current.pop();
                    if (old) {
                      mask.current!.getContext("2d")!.putImageData(old, 0, 0);
                      setHasMask(old.data.some((value, index) => index % 4 === 3 && value > 0));
                      setMaskVersion((v) => v + 1);
                      dirty();
                    }
                  }}
                >
                  <Undo2 size={16} />
                </button>
              </div>
              <label className="brush-size">
                브러시 크기 {brush}px
                <input
                  aria-label="브러시 크기"
                  type="range"
                  min="3"
                  max="180"
                  value={brush}
                  onChange={(e) => setBrush(Number(e.target.value))}
                />
              </label>
              <button
                disabled={!hasMask}
                onClick={() => {
                  rememberMask();
                  mask
                    .current!.getContext("2d")!
                    .clearRect(
                      0,
                      0,
                      source.current!.width,
                      source.current!.height,
                    );
                  setHasMask(false);
                  setMaskVersion((v) => v + 1);
                  dirty();
                }}
              >
                피사체 선택 지우기
              </button>
              <p>
                남길 부분 전체를 칠해 주세요. ‘오려낼 부분’에서 투명 배경으로 확인한 후 결과 미리보기 → 레이어로 적용을 누르세요.
              </p>
            </section>
            <section>
              <h3>3. 지워진 자리 채우기</h3>
              <select
                aria-label="배경 채우기 방식"
                value={fill}
                onChange={(e) => {
                  setFill(e.target.value as typeof fill);
                  dirty();
                }}
              >
                <option value="surround">주변색 채우기 · 단순 배경용</option>
                <option value="solid">선택한 단색으로 채우기</option>
                <option value="transparent">투명하게 비우기</option>
              </select>
              {fill === "solid" && (
                <label className="fill-color">
                  채우기 색
                  <input
                    type="color"
                    value={color}
                    aria-label="배경 채우기 색"
                    onChange={(e) => {
                      setColor(e.target.value);
                      dirty();
                    }}
                  />
                </label>
              )}
              <p>
                주변색 채우기는 무늬·사진 배경에서 번짐이 생길 수 있습니다.
                원본에 합쳐진 효과는 자동 복원되지 않습니다.
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
            글자 추출·직접 오려내기는 기기에서 처리합니다. AI 글자 제거만 OpenAI로 전송합니다. 원본은 숨긴 레이어로 보관됩니다.
          </small>
        </div>
        <div className="separation-footer-actions">
          {busy ? (
            <button onClick={() => controller.current?.abort()}>
              처리 취소
            </button>
          ) : (
            <>
              <button
                disabled={
                  !loaded ||
                  (!hasMask && !texts.some((t) => t.enabled && t.text.trim()))
                }
                onClick={() =>
                  void run(async (signal) => {
                    const output = await renderSeparation(
                      source.current!,
                      hasMask ? mask.current : null,
                      texts,
                      fill,
                      color,
                      signal,
                      setStatus,
                    );
                    if (signal.aborted) return;
                    setResult(output);
                    setView("result");
                    setStatus(
                      "결과를 확인한 뒤 레이어로 적용하세요. 글꼴과 세부 효과는 적용 후 수정할 수 있습니다.",
                    );
                  })
                }
              >
                <Eye size={17} /> 결과 미리보기
              </button>
              <button className="primary" disabled={!result} onClick={apply}>
                <Layers size={17} /> 레이어로 적용
              </button>
            </>
          )}
        </div>
      </footer>
    </dialog>
  );
}
