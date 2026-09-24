import { useEffect, useMemo, useRef, useState } from "react";
import {
  Palette as PaletteIcon,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import {
  applyPalette,
  captureOrigins,
  designColors,
  originalDocument,
  type ImageAnalyses,
} from "@/lib/paletteDocument";
import { analyzeImage } from "@/lib/paletteImage";
import { recommendPalettes, type Palette } from "@/lib/paletteColors";
import PaletteExplorer from "./PaletteExplorer";
import { ColorField } from "./properties/Fields";
export default function ColorPalette({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const doc = useEditorStore((s) => s.document),
    origins = useEditorStore((s) => s.colorOrigins),
    selected = useEditorStore((s) => s.selectedId);
  const [exploring, setExploring] = useState(false);
  const [analyses, setAnalyses] = useState<ImageAnalyses>({}),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [includeImages, setIncludeImages] = useState(true),
    [editing, setEditing] = useState<{ id: string; index: number } | null>(
      null,
    ),
    [hover, setHover] = useState<string | null>(null),
    [overrides, setOverrides] = useState<Record<string, string[]>>({});
  const row = useRef<HTMLDivElement>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    previous = useRef<{ id: string; src: string }[]>([]),
    generation = useRef(0);
  useEffect(() => {
    const images = doc.layers
      .filter((l) => l.type === "image" && l.visible && !l.locked)
      .map((l) => ({ id: l.id, src: l.type === "image" ? l.src : "" }));
    if (
      images.length === previous.current.length &&
      images.every(
        (l, i) =>
          l.id === previous.current[i].id && l.src === previous.current[i].src,
      )
    )
      return;
    previous.current = images;
    const version = ++generation.current;
    setLoading(images.length > 0);
    setError("");
    void Promise.allSettled(
      images.map(async (l) => [l.id, await analyzeImage(l.src)] as const),
    ).then((results) => {
      if (version !== generation.current) return;
      const next: ImageAnalyses = {};
      let failed = false;
      results.forEach((r) => {
        if (r.status === "fulfilled") next[r.value[0]] = r.value[1];
        else {
          failed = true;
          console.error("[palette-analysis]", r.reason);
        }
      });
      setAnalyses(next);
      setLoading(false);
      if (failed)
        setError(
          "일부 이미지를 분석하지 못했습니다. 이미지 적용을 끄면 다른 레이어는 변경할 수 있습니다.",
        );
    });
  }, [doc.layers]);
  useEffect(() => {
    return () => {
      generation.current++;
      previous.current = [];
      if (timer.current) clearTimeout(timer.current);
      useEditorStore.getState().previewPalette(null);
    };
  }, []);
  useEffect(() => {
    setEditing(null);
    setOverrides({});
    setNotice("");
  }, [doc.id]);
  const original = useMemo(
    () => originalDocument(doc, captureOrigins(doc, origins)),
    [doc, origins],
  );
  const images = doc.layers.filter(
      (l) => l.type === "image" && l.visible && !l.locked,
    ),
    sourceImage = images.find((l) => l.id === selected) ?? images.at(-1);
  const source = useMemo(
    () =>
      sourceImage && analyses[sourceImage.id]
        ? analyses[sourceImage.id].colors
        : designColors(original),
    [sourceImage?.id, analyses, original],
  );
  const palettes = recommendPalettes(source).map((p) => ({
    ...p,
    name: p.id === "source" && !sourceImage ? "원본 디자인 기반" : p.name,
    colors:
      doc.palette?.id === p.id
        ? doc.palette.colors
        : (overrides[p.id] ?? p.colors),
  }));
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setHover(null);
    useEditorStore.getState().previewPalette(null);
  };
  const blocked =
    disabled || !doc.layers.length || (includeImages && (loading || !!error));
  const result = (p: Palette) => {
    const state = useEditorStore.getState();
    return applyPalette(
      state.document,
      captureOrigins(state.document, state.colorOrigins),
      source,
      p.colors,
      p.id,
      analyses,
      includeImages,
    );
  };
  const apply = (p: Palette) => {
    if (blocked) return;
    stop();
    const r = result(p);
    useEditorStore.getState().commit(r.document);
    setNotice(
      r.warnings
        ? `${p.name} 적용 · 복잡한 배경/낮은 불투명도의 텍스트 ${r.warnings}개는 대비를 확인하세요.`
        : `${p.name} 적용 · 텍스트 대비를 조정했습니다.`,
    );
  };
  const preview = (p: Palette) => {
    if (blocked || editing) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setHover(p.id);
      useEditorStore.getState().previewPalette(result(p).document);
    }, 100);
  };
  const restore = () => {
    stop();
    const s = useEditorStore.getState();
    s.commit(
      originalDocument(s.document, captureOrigins(s.document, s.colorOrigins)),
    );
    setNotice("원본 색상으로 복원했습니다.");
    setEditing(null);
  };
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setHover(null);
    useEditorStore.getState().previewPalette(null);
  }, [doc, disabled]);
  const palette = palettes.find((p) => p.id === editing?.id);
  return (
    <section
      className="color-palette"
      aria-label="컬러 팔레트"
      onPointerLeave={() => {
        if (!exploring) stop();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setEditing(null);
          stop();
        }
      }}
    >
      <div className="palette-heading">
        <h3>
          <PaletteIcon size={15} />
          컬러 팔레트
        </h3>
        <div>
          <button
            type="button"
            disabled={disabled || !doc.layers.length}
            title="레이어 위치·내용을 유지하고 처음 색상으로 복원"
            onClick={restore}
          >
            {" "}
            <RotateCcw size={12} /> 원본 색상
          </button>
          <button
            type="button"
            aria-label="이전 팔레트"
            onClick={() =>
              row.current?.scrollBy({ left: -300, behavior: "smooth" })
            }
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            aria-label="다음 팔레트"
            onClick={() =>
              row.current?.scrollBy({ left: 300, behavior: "smooth" })
            }
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
      <div ref={row} className="palette-list">
        {palettes.slice(0, 5).map((p) => (
          <div
            className={`palette-card ${doc.palette?.id === p.id ? "active" : ""} ${hover === p.id ? "previewing" : ""}`}
            key={p.id}
            onPointerEnter={() => preview(p)}
            onPointerLeave={stop}
          >
            <button
              type="button"
              className="palette-apply"
              disabled={blocked}
              aria-pressed={doc.palette?.id === p.id}
              aria-label={`${p.name} 팔레트 적용`}
              onFocus={() => preview(p)}
              onBlur={stop}
              onClick={() => apply(p)}
            >
              <span>{p.name}</span>
              <span>{doc.palette?.id === p.id ? "✓" : "↗"}</span>
            </button>
            <div className="palette-chips">
              {p.colors.map((color, index) => (
                <button
                  type="button"
                  key={index}
                  disabled={blocked}
                  style={{ background: color }}
                  title={`${color.toUpperCase()} · 색상 수정`}
                  aria-label={`${p.name} 색상 ${index + 1} 수정`}
                  onClick={() => {
                    stop();
                    setEditing({ id: p.id, index });
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="palette-explore-open"
        onClick={() => {
          stop();
          setEditing(null);
          setExploring(true);
        }}
      >
        더 많은 팔레트 보기 <ChevronRight size={14} />
      </button>
      {exploring && (
        <PaletteExplorer
          recommendations={palettes}
          source={source}
          blocked={blocked}
          notice={notice}
          onPreview={preview}
          onStop={stop}
          onApply={apply}
          onOriginal={restore}
          onClose={() => {
            stop();
            setExploring(false);
          }}
        />
      )}
      {editing && palette && (
        <div className="palette-chip-editor">
          <span>
            {palette.name} · 색상 {editing.index + 1}
          </span>
          <ColorField
            label="팔레트 색상"
            value={palette.colors[editing.index]}
            onChange={(color) => {
              const colors = palette.colors.map((c, i) =>
                i === editing.index ? color : c,
              );
              setOverrides((v) => ({ ...v, [palette.id]: colors }));
              apply({ ...palette, colors });
            }}
          />
          <button
            type="button"
            aria-label="컬러피커 닫기"
            onClick={() => setEditing(null)}
          >
            <X size={15} />
          </button>
        </div>
      )}
      <div className="palette-caption">
        <span>
          {loading
            ? "이미지 주요 색상 분석 중…"
            : hover
              ? "캔버스 미리보기 · 클릭하면 적용"
              : "이름 클릭: 적용 · 컬러칩 클릭: 색상 수정"}
        </span>
        {images.length > 0 && (
          <label>
            <input
              type="checkbox"
              checked={includeImages}
              disabled={disabled}
              onChange={(e) => {
                stop();
                setIncludeImages(e.target.checked);
              }}
            />
            이미지 색상 영역도 적용
          </label>
        )}
      </div>
      {images.length > 0 && (
        <p className="palette-help">
          이미지는 색상 영역별로 재배색합니다. 사진 속 인물·글자는 별도 객체로
          분리되지 않으므로 피부색과 가독성을 확인하세요.
        </p>
      )}
      {doc.layers.some((l) => l.locked || !l.visible) && (
        <p className="palette-help">잠긴 레이어와 숨긴 원본은 유지합니다.</p>
      )}
      {error && (
        <p role="alert" className="palette-error">
          {error}
        </p>
      )}
      <span className="palette-status" role="status" aria-live="polite">
        {notice}
      </span>
    </section>
  );
}
