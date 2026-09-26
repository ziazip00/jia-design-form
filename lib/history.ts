import type { ProjectDocument } from "../types/design";
export const HISTORY_LIMIT = 80;
export const remember = (past: ProjectDocument[], doc: ProjectDocument) =>
  [...past, doc].slice(-HISTORY_LIMIT);
export const normalize = (doc: ProjectDocument): ProjectDocument => ({
  ...doc,
  layers: doc.layers.map((l, zIndex) => {
    const layer = l as typeof l & { zIndex: number };
    return { ...layer, zIndex };
  }),
});
