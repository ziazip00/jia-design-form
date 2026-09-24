import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Heart,
  Search,
  X,
  SlidersHorizontal,
  Shuffle,
  Plus,
  RotateCcw,
} from "lucide-react";
import {
  paletteCatalog,
  browsePalettes,
  filterGroups,
  customTags,
  fourColors,
  type CatalogPalette,
  type PaletteTab,
} from "@/lib/paletteCatalog";
import type { Palette } from "@/lib/paletteColors";
import { usePaletteLibrary } from "./usePaletteLibrary";
import { ColorField } from "./properties/Fields";
import { useEditorStore } from "@/store/editorStore";
const tabs: { id: PaletteTab; label: string }[] = [
  { id: "recommended", label: "추천" },
  { id: "popular", label: "인기" },
  { id: "new", label: "신규" },
  { id: "random", label: "랜덤" },
  { id: "saved", label: "저장된 팔레트" },
];
export default function PaletteExplorer({
  recommendations,
  source,
  blocked,
  notice,
  onPreview,
  onStop,
  onApply,
  onOriginal,
  onClose,
}: {
  recommendations: Palette[];
  source: string[];
  blocked: boolean;
  notice: string;
  onPreview: (p: Palette) => void;
  onStop: () => void;
  onApply: (p: Palette) => void;
  onOriginal: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<PaletteTab>("recommended"),
    [query, setQuery] = useState(""),
    [filters, setFilters] = useState<string[]>([]),
    [showFilters, setShowFilters] = useState(false),
    [count, setCount] = useState(32),
    [seed, setSeed] = useState(1),
    [creating, setCreating] = useState(false),
    [name, setName] = useState("나의 팔레트"),
    [colors, setColors] = useState([
      "#28cbe9",
      "#ffffff",
      "#dff7fa",
      "#e8622c",
    ]),
    [message, setMessage] = useState("");
  const panel = useRef<HTMLElement>(null),
    search = useRef<HTMLInputElement>(null),
    scroll = useRef<HTMLDivElement>(null),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  const { library, error, ready, toggle, save, record } = usePaletteLibrary();
  const active = useEditorStore((s) => s.document.palette?.id),
    previewId = useEditorStore((s) => s.palettePreview?.palette?.id);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    search.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeRef.current();
      }
    };
    window.addEventListener("keydown", key, true);
    return () => {
      window.removeEventListener("keydown", key, true);
      previous?.focus();
    };
  }, []);
  const recommended = useMemo(
    () =>
      recommendations.map((p, i) => ({
        ...p,
        id: `explore-${p.id}-${fourColors(p.colors).join("").replaceAll("#", "")}`,
        colors: fourColors(p.colors),
        tags: customTags(fourColors(p.colors)),
        order: 100000 + i,
      })),
    [recommendations],
  );
  const all = useMemo(
    () => [
      ...new Map(
        [...recommended, ...paletteCatalog, ...library.saved].map((p) => [
          p.id,
          p,
        ]),
      ).values(),
    ],
    [recommended, library.saved],
  );
  const results = useMemo(
    () =>
      browsePalettes(all, {
        query,
        filters,
        tab,
        saved: library.saved.map((p) => p.id),
        uses: library.uses,
        seed,
        source,
      }),
    [all, query, filters, tab, library, seed, source],
  );
  const reset = () => {
    onStop();
    setCount(32);
    scroll.current?.scrollTo({ top: 0 });
  };
  const draft: CatalogPalette = {
    id: "custom-preview",
    name: name.trim() || "나의 팔레트",
    colors,
    tags: customTags(colors),
    order: Date.now(),
    custom: true,
  };
  const apply = (p: CatalogPalette) => {
    if (blocked) return;
    onApply(p);
    record(p);
  };
  return createPortal(
    <aside
      ref={panel}
      className="palette-explorer"
      role="dialog"
      aria-modal="false"
      aria-label="팔레트 탐색"
      onPointerLeave={onStop}
      onKeyDown={(e) => {
        if (
          e.key === "Delete" ||
          e.key === "Backspace" ||
          e.key.startsWith("Arrow")
        )
          e.stopPropagation();
      }}
    >
      <header className="explorer-header">
        <div>
          <span>COLOR LIBRARY</span>
          <h2>컬러 팔레트 탐색</h2>
        </div>
        <button type="button" aria-label="팔레트 탐색 닫기" onClick={onClose}>
          <X size={18} />
        </button>
      </header>
      <div className="explorer-tools">
        <button
          type="button"
          disabled={blocked}
          onClick={() => {
            onOriginal();
            setMessage("원본 컬러로 복원했습니다.");
          }}
        >
          <RotateCcw size={13} />
          원본 컬러
        </button>
        <button
          type="button"
          onClick={() => {
            onStop();
            setCreating((v) => !v);
          }}
        >
          <Plus size={14} />
          나만의 팔레트 만들기
        </button>
      </div>
      <label className="explorer-search">
        <Search size={16} />
        <input
          ref={search}
          aria-label="팔레트 검색"
          placeholder="blue pastel, mint, medical blue…"
          value={query}
          onChange={(e) => {
            reset();
            setQuery(e.target.value);
          }}
        />
        {query && (
          <button
            type="button"
            aria-label="검색어 지우기"
            onClick={() => {
              reset();
              setQuery("");
            }}
          >
            <X size={13} />
          </button>
        )}
      </label>
      <nav className="explorer-tabs" aria-label="팔레트 탐색 메뉴">
        {tabs.map((t) => (
          <button
            type="button"
            key={t.id}
            aria-pressed={tab === t.id}
            onClick={() => {
              reset();
              setTab(t.id);
              if (t.id === "random") setSeed((s) => s + 1);
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div className="explorer-filterbar">
        <button
          type="button"
          aria-expanded={showFilters}
          onClick={() => {
            onStop();
            setShowFilters((v) => !v);
          }}
        >
          <SlidersHorizontal size={13} />
          색상·분위기 필터 {filters.length > 0 && `(${filters.length})`}
        </button>
        {filters.length > 0 && (
          <button
            type="button"
            onClick={() => {
              reset();
              setFilters([]);
            }}
          >
            필터 초기화
          </button>
        )}
        {tab === "random" && (
          <button
            type="button"
            aria-label="다시 섞기"
            onClick={() => {
              reset();
              setSeed((s) => s + 1);
            }}
          >
            <Shuffle size={14} />
          </button>
        )}
      </div>
      {showFilters && (
        <div className="explorer-filters">
          {Object.entries(filterGroups).map(([group, values]) => (
            <div key={group}>
              <strong>{group}</strong>
              <div>
                {values.map((value) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={filters.includes(value.toLowerCase())}
                    onClick={() => {
                      reset();
                      const tag = value.toLowerCase();
                      setFilters((v) =>
                        v.includes(tag)
                          ? v.filter((t) => t !== tag)
                          : [...v, tag],
                      );
                    }}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {filters.length > 0 && (
        <div className="explorer-selected">
          {filters.map((f) => (
            <button
              type="button"
              key={f}
              aria-label={`${f} 필터 제거`}
              onClick={() => {
                reset();
                setFilters((v) => v.filter((t) => t !== f));
              }}
            >
              {f} ×
            </button>
          ))}
        </div>
      )}
      <div ref={scroll} className="explorer-scroll">
        {creating && (
          <section
            className="palette-creator"
            aria-label="나만의 팔레트 만들기"
          >
            <label>
              팔레트 이름
              <input
                aria-label="새 팔레트 이름"
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <div className="creator-colors">
              {colors.map((c, i) => (
                <ColorField
                  key={i}
                  label={`새 팔레트 색상 ${i + 1}`}
                  value={c}
                  onChange={(color) => {
                    const next = colors.map((v, n) => (n === i ? color : v));
                    setColors(next);
                    onPreview({ ...draft, colors: next });
                  }}
                />
              ))}
            </div>
            <div className="creator-actions">
              <button
                type="button"
                disabled={blocked}
                onPointerEnter={() => onPreview(draft)}
                onPointerLeave={onStop}
                onFocus={() => onPreview(draft)}
                onBlur={onStop}
                onClick={() => {
                  const p = { ...draft, id: `custom-${crypto.randomUUID()}` };
                  if (save(p)) {
                    apply(p);
                    setMessage("나만의 팔레트를 저장하고 적용했습니다.");
                    setCreating(false);
                  }
                }}
              >
                저장하고 적용
              </button>
              <button
                type="button"
                disabled={!ready}
                onClick={() => {
                  if (save({ ...draft, id: `custom-${crypto.randomUUID()}` })) {
                    onStop();
                    setMessage("저장된 팔레트에 추가했습니다.");
                    setCreating(false);
                  }
                }}
              >
                저장
              </button>
              <button
                type="button"
                onClick={() => {
                  onStop();
                  setCreating(false);
                }}
              >
                취소
              </button>
            </div>
          </section>
        )}
        <div className="explorer-results-info">
          <span>{results.length.toLocaleString()}개 팔레트</span>
          <span>
            {tab === "popular"
              ? "이 브라우저 적용 횟수순"
              : tab === "new"
                ? "컬렉션 등록순"
                : tab === "saved"
                  ? "이 브라우저에 저장됨"
                  : "마우스를 올리면 캔버스 미리보기"}
          </span>
        </div>
        <div className="explorer-grid">
          {results.slice(0, count).map((p) => (
            <article
              key={p.id}
              className={`explorer-card ${active === p.id ? "is-applied" : ""} ${previewId === p.id ? "is-preview" : ""}`}
              onPointerEnter={() => onPreview(p)}
              onPointerLeave={onStop}
            >
              <button
                type="button"
                className="explorer-swatches"
                aria-label={`${p.name} 적용`}
                aria-pressed={active === p.id}
                disabled={blocked}
                onFocus={() => onPreview(p)}
                onBlur={onStop}
                onClick={() => apply(p)}
              >
                {p.colors.map((c, i) => (
                  <span
                    key={i}
                    style={{ background: c }}
                    title={c.toUpperCase()}
                  >
                    <small>{c.toUpperCase()}</small>
                  </span>
                ))}
              </button>
              <div className="explorer-card-meta">
                <span title={p.name}>{p.name}</span>
                <button
                  type="button"
                  disabled={!ready}
                  aria-label={`${p.name} 즐겨찾기`}
                  aria-pressed={library.saved.some((v) => v.id === p.id)}
                  onClick={() => {
                    onStop();
                    toggle(p);
                  }}
                >
                  <Heart
                    size={15}
                    fill={
                      library.saved.some((v) => v.id === p.id)
                        ? "currentColor"
                        : "none"
                    }
                  />
                </button>
              </div>
              <div className="explorer-card-tags">
                {p.tags.slice(0, 3).join(" · ")}
                {tab === "popular" && ` · ${library.uses[p.id] ?? 0}회`}
              </div>
            </article>
          ))}
        </div>
        {!results.length && (
          <div className="explorer-empty">
            {tab === "saved"
              ? "아직 저장된 팔레트가 없거나 검색 조건에 맞는 항목이 없습니다. ♡로 저장해 보세요."
              : "조건에 맞는 팔레트가 없습니다. 검색어나 필터를 줄여 보세요."}
            <button
              type="button"
              onClick={() => {
                reset();
                setQuery("");
                setFilters([]);
              }}
            >
              검색·필터 초기화
            </button>
          </div>
        )}
        {results.length > count ? (
          <button
            type="button"
            className="explorer-load"
            onClick={() => {
              onStop();
              setCount((c) => c + 32);
            }}
          >
            팔레트 더 보기 ({Math.min(count, results.length)} / {results.length}
            )
          </button>
        ) : (
          results.length > 0 && (
            <p className="explorer-end">
              현재 컬렉션의 모든 팔레트를 확인했습니다.
            </p>
          )
        )}
      </div>
      <footer className="explorer-footer">
        <span>
          {previewId
            ? "미리보기 중 · 클릭하면 최종 적용"
            : "레이아웃은 유지하고 컬러만 변경합니다."}
        </span>
        <span role="status">
          {message} {notice}
        </span>
        {blocked && (
          <span>
            디자인을 추가하거나 이미지 분석이 끝나면 적용할 수 있습니다.
          </span>
        )}
        {error && <span role="alert">{error}</span>}
      </footer>
    </aside>,
    document.body,
  );
}
