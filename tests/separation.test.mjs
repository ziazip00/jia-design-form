import { test } from "node:test";
import assert from "node:assert/strict";
import { repairPixels } from "../public/image-tools/repair.mjs";
test("surrounding fill removes a dark region while preserving all unmasked pixels", () => {
  const pixels = new Uint8ClampedArray(5 * 5 * 4).fill(255),
    mask = new Uint8Array(25);
  for (const i of [6, 7, 11, 12]) {
    mask[i] = 1;
    pixels.set([0, 0, 0, 255], i * 4);
  }
  const output = repairPixels(pixels, mask, 5, 5);
  assert.ok([...output].every((n) => n === 255));
  assert.equal(pixels[24], 0, "input remains unchanged");
});
test("transparent unmasked pixels and row edges are preserved", () => {
  const pixels = new Uint8ClampedArray([
    20, 30, 40, 255, 20, 30, 40, 255, 99, 99, 99, 255, 20, 30, 40, 255, 0, 0, 0,
    0, 20, 30, 40, 255,
  ]);
  const output = repairPixels(pixels, new Uint8Array([0, 0, 1, 0, 0, 0]), 3, 2);
  assert.deepEqual([...output.slice(8, 12)], [20, 30, 40, 255]);
  assert.deepEqual([...output.slice(16, 20)], [0, 0, 0, 0]);
});
test("full mask requires an explicit solid fill; empty mask is a no-op", () => {
  const pixels = new Uint8ClampedArray(16).fill(80);
  assert.throws(() => repairPixels(pixels, new Uint8Array(4).fill(1), 2, 2));
  assert.deepEqual(
    [...repairPixels(pixels, new Uint8Array(4), 2, 2)],
    [...pixels],
  );
  const solid = repairPixels(
    pixels,
    new Uint8Array(4).fill(1),
    2,
    2,
    [11, 22, 33],
  );
  assert.deepEqual([...solid.slice(0, 4)], [11, 22, 33, 255]);
});
