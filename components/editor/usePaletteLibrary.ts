import { useEffect, useState } from "react";
import {
  emptyLibrary,
  parseLibrary,
  type CatalogPalette,
  type PaletteLibrary,
} from "@/lib/paletteCatalog";
const KEY = "jia.palette-library.v1";
export function usePaletteLibrary() {
  const [library, setLibrary] = useState<PaletteLibrary>(emptyLibrary),
    [error, setError] = useState(""),
    [ready, setReady] = useState(false);
  useEffect(() => {
    const read = () => {
      try {
        setLibrary(parseLibrary(localStorage.getItem(KEY)));
        setError("");
        setReady(true);
      } catch (e) {
        setError(
          "저장된 팔레트를 읽지 못했습니다. 브라우저 저장 공간을 확인하세요.",
        );
        setReady(false);
        console.error("[palette-library]", e);
      }
    };
    read();
    const sync = (e: StorageEvent) => {
      if (e.key === KEY || e.key === null) read();
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const update = (fn: (v: PaletteLibrary) => PaletteLibrary) => {
    if (!ready) return false;
    try {
      const next = fn(parseLibrary(localStorage.getItem(KEY)));
      localStorage.setItem(KEY, JSON.stringify(next));
      setLibrary(next);
      setError("");
      return true;
    } catch (e) {
      setError(
        "팔레트를 저장하지 못했습니다. 브라우저 저장 공간 또는 개인정보 보호 설정을 확인하세요.",
      );
      console.error("[palette-library]", e);
      return false;
    }
  };
  return {
    library,
    error,
    ready,
    toggle: (p: CatalogPalette) =>
      update((v) => ({
        ...v,
        saved: v.saved.some((x) => x.id === p.id)
          ? v.saved.filter((x) => x.id !== p.id)
          : [...v.saved, p],
      })),
    save: (p: CatalogPalette) =>
      update((v) => ({
        ...v,
        saved: [...v.saved.filter((x) => x.id !== p.id), p],
      })),
    record: (p: CatalogPalette) =>
      update((v) => ({
        ...v,
        uses: { ...v.uses, [p.id]: (v.uses[p.id] ?? 0) + 1 },
      })),
  };
}
