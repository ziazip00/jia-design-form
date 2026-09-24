import test from "node:test";
import assert from "node:assert/strict";
import {
  paletteCatalog,
  browsePalettes,
  matchesPalette,
  parseLibrary,
  emptyLibrary,
  fourColors,
  type CatalogPalette,
} from "../lib/paletteCatalog";
import { makeLayer, blankDocument } from "../lib/designParser";
import {
  applyPalette,
  captureOrigins,
  designColors,
} from "../lib/paletteDocument";
import { luminance } from "../lib/paletteColors";
const options = {
  query: "",
  filters: [],
  tab: "recommended" as const,
  saved: [],
  uses: {},
  seed: 1,
  source: ["#abcdef"],
};
test("catalog has over 900 stable distinct four-color palettes and valid tags", () => {
  assert.ok(paletteCatalog.length > 900);
  assert.equal(new Set(paletteCatalog.map((p) => p.id)).size, paletteCatalog.length);
  assert.equal(
    new Set(paletteCatalog.map((p) => p.colors.join(","))).size,
    paletteCatalog.length,
  );
  assert.ok(
    paletteCatalog.every(
      (p) =>
        p.colors.length === 4 &&
        p.colors.every((c) => /^#[\da-f]{6}$/i.test(c)),
    ),
  );
});
test("compound color, mood and search filters use AND, including aliases and empty results", () => {
  for (const query of [
    "blue pastel",
    "mint light",
    "warm beige",
    "navy gold",
    "medical blue",
    "christmas",
    "민트 밝은",
  ])
    assert.ok(
      browsePalettes(paletteCatalog, { ...options, query }).length > 0,
      query,
    );
  assert.ok(
    browsePalettes(paletteCatalog, {
      ...options,
      filters: ["blue", "pastel"],
    }).every((p) => p.tags.includes("blue") && p.tags.includes("pastel")),
  );
  assert.equal(
    browsePalettes(paletteCatalog, { ...options, query: "nonexistent" }).length,
    0,
  );
  assert.equal(matchesPalette(paletteCatalog[0], "blue purple", []), false);
});
test("sorting uses actual usage and stable random order; pages do not repeat IDs", () => {
  const p = paletteCatalog[31];
  assert.equal(
    browsePalettes(paletteCatalog, {
      ...options,
      tab: "popular",
      uses: { [p.id]: 2 },
    })[0].id,
    p.id,
  );
  const a = browsePalettes(paletteCatalog, { ...options, tab: "random" }),
    b = browsePalettes(paletteCatalog, { ...options, tab: "random", seed: 2 });
  assert.notDeepEqual(a.slice(0, 32), b.slice(0, 32));
  assert.deepEqual(
    a,
    browsePalettes(paletteCatalog, { ...options, tab: "random" }),
  );
  assert.equal(
    new Set([...a.slice(0, 32), ...a.slice(32, 64)].map((p) => p.id)).size,
    64,
  );
});
test("saved custom palettes round-trip and corrupted storage is not silently accepted", () => {
  const p: CatalogPalette = {
    id: "custom-test",
    name: "직접 만든 색",
    colors: ["#28cbe9", "#ffffff", "#dff7fa", "#e8622c"],
    tags: ["blue"],
    order: 1,
    custom: true,
  };
  const data = { ...emptyLibrary(), saved: [p], uses: { [p.id]: 3 } };
  assert.deepEqual(parseLibrary(JSON.stringify(data)), data);
  assert.deepEqual(
    browsePalettes([p, ...paletteCatalog], {
      ...options,
      tab: "saved",
      saved: [p.id],
    }),
    [p],
  );
  assert.throws(() => parseLibrary("{bad"));
  assert.throws(() =>
    parseLibrary(
      JSON.stringify({ ...data, saved: [{ ...p, colors: ["bad"] }] }),
    ),
  );
  assert.equal(
    fourColors(["#111111", "#222222", "#333333", "#444444", "#555555"]).length,
    4,
  );
});
test("unordered custom chips retain light-dark roles without changing palette order or geometry", () => {
  const image = makeLayer("image", { src: "original", x: 35, width: 444 });
  const doc = { ...blankDocument(), layers: [image] },
    origins = captureOrigins(doc, { canvas: {}, layers: {} }),
    colors = ["#28cbe9", "#ffffff", "#dff7fa", "#e8622c"];
  const next = applyPalette(
    doc,
    origins,
    designColors(doc),
    colors,
    "custom-test",
    { [image.id]: { colors: ["#ffffff", "#888888", "#000000"], grid: [] } },
  ).document;
  assert.deepEqual(next.palette?.colors, colors);
  const layer = next.layers[0];
  assert.equal(layer.x, 35);
  assert.equal(layer.width, 444);
  assert.equal(layer.type === "image" && layer.src, "original");
  if (layer.type === "image") {
    const target = layer.paletteMap!.target;
    assert.ok(
      target.every(
        (c, i) => i === 0 || luminance(c) <= luminance(target[i - 1]),
      ),
    );
  }
});
