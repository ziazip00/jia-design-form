import type { DesignDocument } from "../types/design";
export const HISTORY_LIMIT = 80;
export const remember = (past: DesignDocument[], doc: DesignDocument) =>
  [...past, doc].slice(-HISTORY_LIMIT);
export const normalize = (doc: DesignDocument): DesignDocument => ({
  ...doc,
  layers: doc.layers.map((l, zIndex) => ({ ...l, zIndex })),
});
