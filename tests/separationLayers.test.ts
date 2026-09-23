import { test } from "node:test";
import assert from "node:assert/strict";
import { separationLayers } from "../lib/imageSeparation";
import { makeLayer } from "../lib/designParser";
import type { ImageLayer } from "../types/design";
test("extracted text and cropped subjects retain scaled and rotated placement", () => {
  const source = makeLayer("image", {
    x: 100,
    y: 200,
    width: 200,
    height: 100,
    rotation: 90,
    opacity: 0.7,
  }) as ImageLayer;
  const result = separationLayers(source, {
    background: "background",
    subject: "subject",
    subjectRect: { x: 50, y: 20, width: 80, height: 100 },
    width: 400,
    height: 200,
    preview: "",
    texts: [
      {
        id: "ocr-1",
        text: "Hello",
        x: 20,
        y: 40,
        width: 80,
        height: 20,
        fontSize: 24,
        enabled: true,
        confidence: 90,
        color: "#000000",
      },
    ],
  });
  assert.equal(result.length, 3);
  assert.equal(result[1].width, 40);
  assert.equal(result[1].x, 90);
  assert.equal(result[1].y, 225);
  assert.equal(result[2].x, 80);
  assert.equal(result[2].y, 210);
  assert.equal(result[2].type, "text");
  if (result[2].type === "text") assert.equal(result[2].fontSize, 12);
  assert.ok(result.every((l) => l.opacity === 0.7 && l.rotation === 90));
  assert.equal(new Set(result.map((l) => l.id)).size, 3);
});
