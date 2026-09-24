import test from "node:test";
import assert from "node:assert/strict";
import { makeLayer, blankDocument } from "../lib/designParser";
import {
  applyPalette,
  captureOrigins,
  originalDocument,
  designColors,
} from "../lib/paletteDocument";
import {
  contrast,
  dominantColors,
  recolorPixels,
  recommendPalettes,
} from "../lib/paletteColors";
import { useEditorStore } from "../store/editorStore";
import { parseExchange } from "../lib/designExchange";
const empty = () => ({ canvas: {}, layers: {} });
test("palette preserves geometry, text, typography, opacity, layer IDs and original restoration after multiple palettes", () => {
  const doc = {
    ...blankDocument(),
    layers: [
      makeLayer("shape", { fill: "#ffffff", width: 500, height: 500 }),
      makeLayer("text", {
        color: "#222222",
        text: "실제 텍스트",
        x: 30,
        y: 40,
        rotation: 12,
        opacity: 1,
      }),
    ],
  };
  const origins = captureOrigins(doc, empty()),
    source = designColors(doc);
  const palettes = recommendPalettes(source);
  let next = doc;
  for (const p of palettes)
    next = applyPalette(next, origins, source, p.colors, p.id, {}).document;
  next.layers.forEach((l, i) => {
    for (const k of [
      "id",
      "x",
      "y",
      "width",
      "height",
      "rotation",
      "opacity",
      "type",
    ] as const)
      assert.equal(l[k], doc.layers[i][k]);
  });
  assert.equal(
    next.layers[1].type === "text" && next.layers[1].text,
    "실제 텍스트",
  );
  const restored = originalDocument(next, origins);
  assert.equal(
    restored.layers[0].type === "shape" && restored.layers[0].fill,
    "#ffffff",
  );
  assert.equal(
    restored.layers[1].type === "text" && restored.layers[1].color,
    "#222222",
  );
  assert.ok(
    contrast(
      next.layers[1].type === "text" ? next.layers[1].color : "",
      next.layers[0].type === "shape" ? next.layers[0].fill : "",
    ) >= 4.5,
  );
});
test("hover never mutates document/history; applying, undo and redo are single transactions", () => {
  const doc = { ...blankDocument(), layers: [makeLayer("shape")] };
  useEditorStore.setState({
    document: doc,
    colorOrigins: empty(),
    past: [],
    future: [],
    palettePreview: null,
  });
  const s = useEditorStore.getState(),
    source = designColors(doc),
    p = recommendPalettes(source)[6],
    next = applyPalette(
      doc,
      captureOrigins(doc, empty()),
      source,
      p.colors,
      p.id,
      {},
    ).document;
  s.previewPalette(next);
  assert.equal(useEditorStore.getState().document, doc);
  assert.equal(useEditorStore.getState().past.length, 0);
  s.previewPalette(null);
  s.commit(next);
  assert.equal(useEditorStore.getState().past.length, 1);
  s.undo();
  assert.deepEqual(useEditorStore.getState().document, doc);
  s.redo();
  assert.deepEqual(useEditorStore.getState().document, next);
});
test("raster recoloring preserves alpha, transparent pixels and texture, maps distinct clusters independently", () => {
  const pixels = new Uint8ClampedArray([
    220, 40, 40, 255, 180, 30, 30, 128, 40, 40, 220, 255, 10, 20, 30, 0,
  ]);
  const result = recolorPixels(
    pixels,
    ["#dc2828", "#2828dc"],
    ["#28dc28", "#dc28dc"],
  );
  assert.deepEqual(
    [result[3], result[7], result[11], result[15]],
    [255, 128, 255, 0],
  );
  assert.deepEqual([...result.slice(12)], [10, 20, 30, 0]);
  assert.ok(result[1] > result[0]);
  assert.ok(result[8] > result[9]);
  assert.notEqual(result[1], result[5]);
  assert.equal(pixels[0], 220);
});
test("quantization ignores transparency and recommends five chips; locked layers remain untouched", () => {
  const colors = dominantColors(
    new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 0]),
  );
  assert.equal(colors.length, 5);
  assert.ok(colors.includes("#ff0000"));
  assert.ok(recommendPalettes(colors).every((p) => p.colors.length === 5));
  const l = makeLayer("shape", { locked: true });
  const doc = { ...blankDocument(), layers: [l] };
  assert.equal(
    applyPalette(
      doc,
      captureOrigins(doc, empty()),
      colors,
      recommendPalettes(colors)[6].colors,
      "test",
      {},
    ).document.layers[0],
    l,
  );
});
test("image source remains intact and imported invalid palette maps are rejected", () => {
  const l = makeLayer("image", { src: "data:image/png;base64,AA==" });
  const doc = { ...blankDocument(), layers: [l] },
    origins = captureOrigins(doc, empty());
  const next = applyPalette(
    doc,
    origins,
    ["#ffffff", "#000000"],
    ["#ffff00", "#0000ff"],
    "test",
    { [l.id]: { colors: ["#ffffff", "#000000"], grid: [] } },
  ).document;
  assert.equal(
    next.layers[0].type === "image" && next.layers[0].src,
    l.type === "image" && l.src,
  );
  assert.equal(
    originalDocument(next, origins).layers[0].type === "image" &&
      (originalDocument(next, origins).layers[0] as any).paletteMap,
    undefined,
  );
  assert.throws(
    () =>
      parseExchange({
        ...doc,
        layers: [{ ...l, paletteMap: { source: [], target: ["#ffffff"] } }],
      }),
    /팔레트/,
  );
});
