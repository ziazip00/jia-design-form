import { create } from "zustand";

export interface LocalFontData {
  family: string;
  fullName: string;
  postscriptName: string;
  style: string;
  blob: () => Promise<Blob>;
}
export interface EditorFont {
  family: string;
  label: string;
  source: "default" | "local" | "file";
  local?: LocalFontData;
  loaded?: boolean;
}
export const defaultFonts: EditorFont[] = [
  "Arial",
  "sans-serif",
  "serif",
  "Georgia",
  "monospace",
  "Malgun Gothic",
].map((family) => ({ family, label: family, source: "default" }));

export const useFontStore = create<{
  fonts: EditorFont[];
  add: (fonts: EditorFont[]) => void;
  loaded: (family: string) => void;
}>((set) => ({
  fonts: defaultFonts,
  add: (fonts) =>
    set((s) => ({
      fonts: [
        ...s.fonts,
        ...fonts.filter((f) => !s.fonts.some((old) => old.family === f.family)),
      ],
    })),
  loaded: (family) =>
    set((s) => ({
      fonts: s.fonts.map((f) =>
        f.family === family ? { ...f, loaded: true } : f,
      ),
    })),
}));

export async function listLocalFonts() {
  const api = window as unknown as {
    queryLocalFonts?: () => Promise<LocalFontData[]>;
  };
  if (!api.queryLocalFonts)
    throw new Error(
      "이 브라우저는 PC 글꼴 목록을 지원하지 않습니다. Chrome/Edge에서 사이트를 직접 열거나 글꼴 파일을 추가해 주세요.",
    );
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let fonts: LocalFontData[];
  try {
    fonts = await Promise.race([
      api.queryLocalFonts(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () =>
            reject(
              new Error(
                "글꼴 권한 응답을 받지 못했습니다. Chrome/Edge에서 사이트를 직접 열고 권한을 허용하거나 글꼴 파일을 추가해 주세요.",
              ),
            ),
          15000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
  const entries: EditorFont[] = fonts.map((local) => ({
    family: `jia-local-${local.postscriptName}`,
    label: local.fullName,
    source: "local",
    local,
  }));
  useFontStore.getState().add(entries);
  return entries.length;
}

export async function loadEditorFont(font: EditorFont) {
  if (font.source !== "local" || font.loaded) return;
  if (!font.local) throw new Error("PC 글꼴을 다시 불러와 주세요.");
  const data = await (await font.local.blob()).arrayBuffer();
  const face = await new FontFace(font.family, data).load();
  document.fonts.add(face);
  useFontStore.getState().loaded(font.family);
}

export async function addFontFile(file: File) {
  if (!/\.(ttf|otf|woff2?)$/i.test(file.name))
    throw new Error("TTF, OTF, WOFF, WOFF2 파일을 선택해 주세요.");
  if (file.size > 30 * 1024 * 1024)
    throw new Error("30MB 이하의 글꼴 파일을 선택해 주세요.");
  const family = `jia-file-${crypto.randomUUID()}`;
  const face = await new FontFace(family, await file.arrayBuffer()).load();
  document.fonts.add(face);
  const font: EditorFont = {
    family,
    label: file.name.replace(/\.[^.]+$/, ""),
    source: "file",
    loaded: true,
  };
  useFontStore.getState().add([font]);
  return font;
}
