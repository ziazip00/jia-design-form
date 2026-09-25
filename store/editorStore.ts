import { create } from "zustand";
import type { DesignDocument, DesignLayer } from "../types/design";
import { blankDocument } from "../lib/designParser";
import { remember, normalize } from "../lib/history";
import { captureOrigins, type ColorOrigins } from "../lib/paletteDocument";
import { fitDocumentText, textResizeMode } from "../lib/textSizing";
interface EditorState {
  reflowText: () => void;
  document: DesignDocument;
  selectedId: string | null;
  past: DesignDocument[];
  future: DesignDocument[];
  colorOrigins: ColorOrigins;
  palettePreview: DesignDocument | null;
  previewPalette: (doc: DesignDocument | null) => void;
  preview: { id: string; values: Record<string, number> } | null;
  previewTransform: (id: string, values: Record<string, number>) => void;
  clearPreview: () => void;
  select: (id: string | null) => void;
  commit: (doc: DesignDocument) => void;
  patch: (id: string, patch: Record<string, unknown>) => void;
  add: (layer: DesignLayer) => void;
  remove: () => void;
  duplicate: () => void;
  reorder: (id: string, index: number) => void;
  undo: () => void;
  redo: () => void;
}
export const useEditorStore = create<EditorState>((set, get) => ({
  document: blankDocument(),
  reflowText: () => {
    const doc = get().document;
    const next = fitDocumentText(doc, undefined, true);
    if (next !== doc) set({ document: next });
  },
  selectedId: null,
  past: [],
  future: [],
  colorOrigins: { canvas: {}, layers: {} },
  palettePreview: null,
  previewPalette: (palettePreview) => set({ palettePreview }),
  preview: null,
  previewTransform: (id, values) => set({ preview: { id, values } }),
  clearPreview: () => set({ preview: null }),
  select: (selectedId) =>
    set({ selectedId, preview: null, palettePreview: null }),
  commit: (doc) => {
    const s = get();
    const next = normalize(fitDocumentText(doc, s.document));
    const colorOrigins = captureOrigins(
      next,
      captureOrigins(s.document, s.colorOrigins),
    );
    if (JSON.stringify(next) === JSON.stringify(s.document)) return;
    set({
      document: next,
      colorOrigins,
      palettePreview: null,
      preview: null,
      past: remember(s.past, s.document),
      future: [],
      selectedId: next.layers.some((l) => l.id === s.selectedId)
        ? s.selectedId
        : null,
    });
  },
  patch: (id, patch) => {
    const s = get();
    const old = s.document.layers.find((l) => l.id === id);
    if (
      !old ||
      (old.locked &&
        Object.keys(patch).some((k) => !["locked", "visible"].includes(k)))
    )
      return;
    if (old.type === "text") patch = textResizeMode(old, patch);
    s.commit({
      ...s.document,
      layers: s.document.layers.map((l) =>
        l.id === id ? ({ ...l, ...patch } as DesignLayer) : l,
      ),
    });
  },
  add: (layer) => {
    const s = get();
    s.commit({ ...s.document, layers: [...s.document.layers, layer] });
    set({ selectedId: layer.id });
  },
  remove: () => {
    const s = get();
    if (s.document.layers.find((l) => l.id === s.selectedId)?.locked) return;
    s.commit({
      ...s.document,
      layers: s.document.layers.filter((l) => l.id !== s.selectedId),
    });
  },
  duplicate: () => {
    const s = get(),
      l = s.document.layers.find((l) => l.id === s.selectedId);
    if (l && !l.locked)
      s.add({
        ...l,
        id: crypto.randomUUID(),
        name: l.name + " 복사",
        x: l.x + 24,
        y: l.y + 24,
      });
  },
  reorder: (id, index) => {
    const s = get(),
      layers = [...s.document.layers],
      from = layers.findIndex((l) => l.id === id);
    if (from < 0 || layers[from].locked) return;
    const [l] = layers.splice(from, 1);
    layers.splice(Math.max(0, Math.min(index, layers.length)), 0, l);
    s.commit({ ...s.document, layers });
  },
  undo: () => {
    const s = get();
    if (!s.past.length) return;
    set({
      document: s.past.at(-1)!,
      palettePreview: null,
      preview: null,
      past: s.past.slice(0, -1),
      future: [s.document, ...s.future],
      selectedId: null,
    });
  },
  redo: () => {
    const s = get();
    if (!s.future.length) return;
    set({
      document: s.future[0],
      palettePreview: null,
      preview: null,
      past: remember(s.past, s.document),
      future: s.future.slice(1),
      selectedId: null,
    });
  },
}));
