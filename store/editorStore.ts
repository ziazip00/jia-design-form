import { create } from "zustand";
import type { ProjectDocument, ProjectLayer, DesignLayer, Artboard, GroupData } from "../types/design";
import { blankDocument, uniqueName } from "../lib/designParser";
import { remember, normalize } from "../lib/history";
import { captureOrigins, type ColorOrigins } from "../lib/paletteDocument";
import { fitDocumentText, textResizeMode } from "../lib/textSizing";
interface EditorState {
  reflowText: () => void;
  document: ProjectDocument;
  selectedArtboardId: string;
  selectedLayerIds: string[];
  past: ProjectDocument[];
  future: ProjectDocument[];
  colorOrigins: ColorOrigins;
  palettePreview: ProjectDocument | null;
  previewPalette: (doc: ProjectDocument | null) => void;
  preview: { id: string; values: Record<string, number> } | null;
  previewTransform: (id: string, values: Record<string, number>) => void;
  clearPreview: () => void;
  selectArtboard: (id: string) => void;
  selectLayer: (id: string | null) => void;
  selectLayers: (ids: string[]) => void;
  commit: (doc: ProjectDocument) => void;
  patch: (id: string, patch: Record<string, unknown>) => void;
  patchLayers: (ids: string[], patch: Record<string, unknown>) => void;
  add: (layer: DesignLayer) => void;
  addArtboard: (artboard?: Partial<Artboard>) => void;
  removeArtboard: (id: string) => void;
  duplicateArtboard: (id: string) => void;
  remove: () => void;
  removeLayers: (ids: string[]) => void;
  duplicate: () => void;
  duplicateLayers: (ids: string[]) => void;
  reorder: (id: string, index: number) => void;
  reorderArtboard: (id: string, index: number) => void;
  groupLayers: (ids: string[]) => void;
  ungroupLayers: (groupId: string) => void;
  undo: () => void;
  redo: () => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
}
export const useEditorStore = create<EditorState>((set, get) => ({
  document: blankDocument(),
  selectedArtboardId: "",
  selectedLayerIds: [],
  reflowText: () => {
    const doc = get().document;
    const next = fitDocumentText(doc, undefined, true);
    if (next !== doc) set({ document: next });
  },
  past: [],
  future: [],
  colorOrigins: { canvas: {}, layers: {} },
  palettePreview: null,
  previewPalette: (palettePreview) => set({ palettePreview }),
  preview: null,
  previewTransform: (id, values) => set({ preview: { id, values } }),
  clearPreview: () => set({ preview: null }),
  selectArtboard: (id) =>
    set({ selectedArtboardId: id, selectedLayerIds: [], preview: null, palettePreview: null }),
  selectLayer: (id) =>
    set({
      selectedLayerIds: id ? [id] : [],
      preview: null,
      palettePreview: null,
    }),
  selectLayers: (ids) =>
    set({ selectedLayerIds: ids, preview: null, palettePreview: null }),
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
      selectedLayerIds: s.selectedLayerIds.filter((id) =>
        next.layers.some((l) => l.id === id),
      ),
    });
  },
  patch: (id, patch) => {
    const s = get();
    const old = s.document.layers.find((l) => l.id === id) as DesignLayer | undefined;
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
        l.id === id ? ({ ...l, ...patch } as ProjectLayer) : l,
      ),
    });
  },
  patchLayers: (ids, patch) => {
    const s = get();
    s.commit({
      ...s.document,
      layers: s.document.layers.map((l) =>
        ids.includes(l.id)
          ? (({ ...l, ...patch } as unknown) as ProjectLayer)
          : l,
      ),
    });
  },
  add: (layer) => {
    const s = get();
    const artboardId = s.selectedArtboardId || s.document.artboards[0]?.id || "";
    const sameArtboardLayers = s.document.layers.filter(
      (l) => (l as DesignLayer).artboardId === artboardId,
    );
    const sameNames = sameArtboardLayers.map((l) => (l as DesignLayer).name);
    const newLayer: ProjectLayer = {
      ...layer,
      artboardId,
      name: uniqueName(layer.name, sameNames),
    };
    s.commit({ ...s.document, layers: [...s.document.layers, newLayer] });
    set({ selectedLayerIds: [newLayer.id] });
  },
  addArtboard: (artboard) => {
    const s = get();
    const existing = s.document.artboards;
    const lastX = existing.length === 0
      ? 0
      : Math.max(...existing.map((a) => a.x + a.width));
    const newArtboard: Artboard = {
      id: crypto.randomUUID(),
      name: artboard?.name || `아트보드 ${existing.length + 1}`,
      width: artboard?.width || 1080,
      height: artboard?.height || 1350,
      background: artboard?.background || "#ffffff",
      x: artboard?.x ?? lastX + 20,
      y: artboard?.y ?? 0,
      visible: true,
      locked: false,
    };
    s.commit({
      ...s.document,
      artboards: [...s.document.artboards, newArtboard],
      selectedArtboardId: newArtboard.id,
    });
  },
  removeArtboard: (id) => {
    const s = get();
    if (s.document.artboards.length <= 1) return;
    const artboardLayers = s.document.layers.filter((l) =>
      (l as DesignLayer).artboardId === id,
    );
    s.commit({
      ...s.document,
      artboards: s.document.artboards.filter((a) => a.id !== id),
      layers: s.document.layers.filter((l) =>
        (l as DesignLayer).artboardId !== id,
      ),
      selectedArtboardId:
        s.selectedArtboardId === id
          ? s.document.artboards.find((a) => a.id !== id)?.id || ""
          : s.selectedArtboardId,
    });
  },
  duplicateArtboard: (id) => {
    const s = get();
    const artboard = s.document.artboards.find((a) => a.id === id);
    if (!artboard) return;
    const newArtboard: Artboard = {
      ...artboard,
      id: crypto.randomUUID(),
      name: artboard.name + " 복사",
      x: artboard.x + artboard.width + 20,
      y: artboard.y,
    };
    const artboardLayers = s.document.layers
      .filter((l) => (l as DesignLayer).artboardId === id)
      .map((l) => ({
        ...l,
        id: crypto.randomUUID(),
        name: (l as DesignLayer).name + " 복사",
        artboardId: newArtboard.id,
        x: (l as DesignLayer).x + newArtboard.x - artboard.x,
        y: (l as DesignLayer).y + newArtboard.y - artboard.y,
      } as ProjectLayer));
    s.commit({
      ...s.document,
      artboards: [...s.document.artboards, newArtboard],
      layers: [...s.document.layers, ...artboardLayers],
      selectedArtboardId: newArtboard.id,
    });
  },
  remove: () => {
    const s = get();
    const toRemove = s.selectedLayerIds.filter((id) => {
      const l = s.document.layers.find((li) => li.id === id);
      return l && !l.locked;
    });
    if (!toRemove.length) return;
    s.commit({
      ...s.document,
      layers: s.document.layers.filter((l) => !toRemove.includes(l.id)),
    });
    set({ selectedLayerIds: [] });
  },
  removeLayers: (ids) => {
    const s = get();
    const toRemove = ids.filter((id) => {
      const l = s.document.layers.find((li) => li.id === id);
      return l && !l.locked;
    });
    if (!toRemove.length) return;
    s.commit({
      ...s.document,
      layers: s.document.layers.filter((l) => !toRemove.includes(l.id)),
    });
    set({ selectedLayerIds: [] });
  },
  duplicate: () => {
    const s = get();
    const l = s.document.layers.find((l) => l.id === s.selectedLayerIds[0]);
    if (l && !l.locked) {
      const dl = l as DesignLayer;
      s.add({
        ...dl,
        id: crypto.randomUUID(),
        name: dl.name + " 복사",
        x: dl.x + 24,
        y: dl.y + 24,
      } as DesignLayer);
    }
  },
  duplicateLayers: (ids) => {
    const s = get();
    const layers = s.document.layers.filter((l) => ids.includes(l.id));
    const newLayers: ProjectLayer[] = [];
    layers.forEach((l) => {
      if ((l as DesignLayer).locked) return;
      const newLayer = {
        ...l,
        id: crypto.randomUUID(),
        name: (l as DesignLayer).name + " 복사",
        x: (l as DesignLayer).x + 24,
        y: (l as DesignLayer).y + 24,
      };
      newLayers.push(newLayer);
    });
    if (newLayers.length) {
      s.commit({ ...s.document, layers: [...s.document.layers, ...newLayers] });
      set({ selectedLayerIds: newLayers.map((l) => l.id) });
    }
  },
  reorder: (id, index) => {
    const s = get();
    const layers = [...s.document.layers];
    const from = layers.findIndex((l) => l.id === id);
    if (from < 0) return;
    const [l] = layers.splice(from, 1);
    const targetIndex = Math.max(0, Math.min(index, layers.length));
    const artboardId = (l as DesignLayer).artboardId;
    const artboardLayers = layers.filter(
      (ll) => (ll as DesignLayer).artboardId === artboardId,
    );
    const localIndex = artboardLayers.findIndex((ll) => ll.id === id);
    const insertAt = Math.max(
      0,
      Math.min(targetIndex, artboardLayers.length),
    );
    const otherLayers = layers.filter((ll) => (ll as DesignLayer).artboardId !== artboardId);
    const newArtboardLayers = [...artboardLayers];
    newArtboardLayers.splice(
      from - otherLayers.filter((ll) => ll.id === id).length > 0 ? 0 : from,
      0,
    );
    layers.splice(Math.max(0, Math.min(index, layers.length)), 0, l);
    s.commit({ ...s.document, layers });
  },
  reorderArtboard: (id, index) => {
    const s = get();
    const artboards = [...s.document.artboards];
    const from = artboards.findIndex((a) => a.id === id);
    if (from < 0) return;
    const [a] = artboards.splice(from, 1);
    artboards.splice(Math.max(0, Math.min(index, artboards.length)), 0, a);
    s.commit({ ...s.document, artboards });
  },
  groupLayers: (ids) => {
    const s = get();
    if (ids.length < 2) return;
    const groupId = crypto.randomUUID();
    const group: GroupData = {
      id: groupId,
      name: `그룹 ${s.document.groups.length + 1}`,
      artboardId: s.selectedArtboardId || s.document.artboards[0]?.id || "",
      layerIds: ids,
      visible: true,
      locked: false,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      opacity: 1,
    };
    const groupedLayers = s.document.layers.map((l) =>
      ids.includes(l.id) ? { ...l, groupId } : l,
    );
    s.commit({
      ...s.document,
      groups: [...s.document.groups, group],
      layers: groupedLayers,
    });
    set({ selectedLayerIds: ids });
  },
  ungroupLayers: (groupId) => {
    const s = get();
    const group = s.document.groups.find((g) => g.id === groupId);
    if (!group) return;
    const ungroupedLayers = s.document.layers.map((l) =>
      (l as DesignLayer).groupId === groupId
        ? { ...l, groupId: null }
        : l,
    );
    s.commit({
      ...s.document,
      groups: s.document.groups.filter((g) => g.id !== groupId),
      layers: ungroupedLayers,
    });
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
      selectedLayerIds: [],
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
      selectedLayerIds: [],
    });
  },
  setZoom: (zoom) => set({ document: { ...get().document, zoom } }),
  setPan: (pan) => set({ document: { ...get().document, pan } }),
}));
