import { test } from "node:test";
import assert from "node:assert/strict";
import { compositeSelection, polygonArea } from "../lib/regionSelection";
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
