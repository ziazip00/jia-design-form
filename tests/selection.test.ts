import { test } from "node:test";
import assert from "node:assert/strict";
import {
  compositeSelection,
  polygonArea,
  imagePoint,
  apiMaskPixels,
} from "../lib/regionSelection";
test("API mask makes only selected pixels fully transparent", () => {
  const mask = apiMaskPixels(
    new Uint8ClampedArray([
      0, 0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 127, 255, 255, 255, 128,
    ]),
  );
  assert.deepEqual(
    [...mask],
    [
      255, 255, 255, 255, 255, 255, 255, 0, 255, 255, 255, 255, 255, 255, 255,
      0,
    ],
  );
});
import { applyImageResult } from "../lib/applyImageResult";
import { blankDocument, makeLayer } from "../lib/designParser";
import type { ImageLayer } from "../types/design";
import { useEditorStore } from "../store/editorStore";
test("selection coordinates map to original pixels at different zoom scales", () => {
  assert.deepEqual(
    imagePoint(
      125,
      100,
      { left: 25, top: 50, width: 200, height: 100 },
      4000,
      2000,
    ),
    { x: 2000, y: 1000 },
  );
  assert.deepEqual(
    imagePoint(
      425,
      250,
      { left: 25, top: 50, width: 800, height: 400 },
      4000,
      2000,
    ),
    { x: 2000, y: 1000 },
  );
});
test("successful restoration replaces the current layer once and undo restores original", () => {
  const original = makeLayer("image", {
    src: "original",
    flipX: true,
    rotation: 37,
  }) as ImageLayer;
  const doc = { ...blankDocument(), layers: [original] };
  useEditorStore.setState({
    document: doc,
    past: [],
    future: [],
    selectedId: original.id,
  });
  const state = useEditorStore.getState();
  state.commit(applyImageResult(doc, original, "result", "backup"));
  const after = useEditorStore.getState().document;
  assert.equal(after.layers.length, 2);
  assert.equal((after.layers[1] as ImageLayer).src, "result");
  assert.equal(after.layers[1].id, original.id);
  assert.equal(after.layers[1].rotation, 37);
  assert.equal((after.layers[0] as ImageLayer).src, "original");
  assert.equal(after.layers[0].visible, false);
  assert.throws(() => applyImageResult(after, original, "stale", "backup"));
  state.undo();
  assert.equal(
    (useEditorStore.getState().document.layers[0] as ImageLayer).src,
    "original",
  );
  assert.equal(useEditorStore.getState().document.layers.length, 1);
});
test("inpainting changes only selected pixels and fills their alpha", () => {
  const source = new Uint8ClampedArray([
    10, 20, 30, 255, 40, 50, 60, 0, 70, 80, 90, 180,
  ]);
  const generated = new Uint8ClampedArray([
    200, 201, 202, 0, 210, 211, 212, 0, 220, 221, 222, 0,
  ]);
  const mask = new Uint8ClampedArray([
    255, 255, 255, 0, 255, 255, 255, 255, 255, 255, 255, 127,
  ]);
  const result = compositeSelection(source, generated, mask);
  assert.deepEqual(
    [...result],
    [10, 20, 30, 255, 210, 211, 212, 255, 70, 80, 90, 180],
  );
  assert.equal(source[4], 40);
  assert.throws(() =>
    compositeSelection(source, new Uint8ClampedArray(1), mask),
  );
});
test("polygon area detects degenerate selection independent of winding", () => {
  const points = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 50 },
    { x: 0, y: 50 },
  ];
  assert.equal(polygonArea(points), 5000);
  assert.equal(polygonArea([...points].reverse()), 5000);
  assert.equal(
    polygonArea([
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
    ]),
    0,
  );
});
