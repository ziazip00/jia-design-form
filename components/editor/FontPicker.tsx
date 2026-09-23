import { useRef, useState } from "react";
import { FolderOpen, Monitor, Search } from "lucide-react";
import {
  useFontStore,
  listLocalFonts,
  loadEditorFont,
  addFontFile,
} from "@/store/fontStore";

export default function FontPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const fonts = useFontStore((s) => s.fonts);
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const filtered = fonts.filter(
    (f) =>
      f.family === value ||
      f.label.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  async function choose(family: string) {
    const font = fonts.find((f) => f.family === family);
    if (!font) return;
    setBusy(true);
    try {
      await loadEditorFont(font);
      onChange(font.family);
      setStatus(`${font.label} 적용됨`);
    } catch {
      setStatus(
        "글꼴을 읽을 수 없습니다. 산돌구름에서 활성화한 후 다시 불러오거나 파일을 추가해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="font-picker">
      <label className="field">
        Font Family
        <select
          aria-label="Font Family"
          value={value}
          disabled={busy}
          onChange={(e) => void choose(e.target.value)}
        >
          {!fonts.some((f) => f.family === value) && (
            <option value={value}>{value}</option>
          )}
          {(["default", "local", "file"] as const).map((source) => (
            <optgroup
              key={source}
              label={
                {
                  default: "기본 글꼴",
                  local: "내 PC · 산돌 글꼴",
                  file: "추가한 글꼴",
                }[source]
              }
            >
              {filtered
                .filter((f) => f.source === source)
                .map((f) => (
                  <option key={f.family} value={f.family}>
                    {f.label}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label className="font-search">
        <Search size={14} />
        <input
          aria-label="글꼴 검색"
          placeholder="산돌 / Sandoll / 글꼴 이름 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <div className="font-actions">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const count = await listLocalFonts();
              setStatus(
                count
                  ? `${count}개 글꼴을 불러왔습니다. 목록에서 선택하세요.`
                  : "활성화된 글꼴이 없습니다.",
              );
            } catch (error) {
              setStatus(
                error instanceof Error && error.name === "NotAllowedError"
                  ? "글꼴 접근이 허용되지 않았습니다. 사이트 권한을 확인하거나 글꼴 파일을 추가해 주세요."
                  : error instanceof Error
                    ? error.message
                    : "글꼴을 불러오지 못했습니다.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <Monitor size={14} />내 PC 글꼴
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => file.current?.click()}
        >
          <FolderOpen size={14} />
          글꼴 파일
        </button>
      </div>
      <input
        className="hidden"
        ref={file}
        type="file"
        accept=".ttf,.otf,.woff,.woff2"
        aria-label="글꼴 파일 추가"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setBusy(true);
          try {
            const font = await addFontFile(f);
            onChange(font.family);
            setStatus(`${font.label} 적용됨`);
          } catch (error) {
            setStatus(
              error instanceof Error
                ? error.message
                : "유효한 글꼴 파일이 아닙니다.",
            );
          } finally {
            setBusy(false);
          }
        }}
      />
      {status && (
        <p className="font-status" role="status">
          {status}
        </p>
      )}
      <p className="font-help">
        산돌구름에서 글꼴을 활성화한 뒤 ‘내 PC 글꼴’을 누르세요. 글꼴은 이
        브라우저에서만 사용하며 서버에 업로드하지 않습니다.
      </p>
    </div>
  );
}
