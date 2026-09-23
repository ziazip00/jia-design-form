import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { useEditorStore as store } from "../store/editorStore";
import { blankDocument, makeLayer, mockDocument } from "../lib/designParser";
beforeEach(() =>
  store.setState({
    document: blankDocument(),
    past: [],
    future: [],
    selectedId: null,
  }),
);
test("movement, transform, text and color can be undone and redone without mutating snapshots", () => {
  const l = makeLayer("text");
  store.getState().add(l);
  const before = store.getState().document;
  const changes = {
    x: 233,
    y: 178,
    width: 700,
    height: 200,
    rotation: 37,
    text: "직접 편집",
    color: "#ff0000",
  };
  store.getState().patch(l.id, changes);
  assert.equal(before.layers[0].x, 100);
  store.getState().undo();
  assert.deepEqual(store.getState().document, before);
  store.getState().redo();
  assert.equal(store.getState().document.layers[0].rotation, 37);
  store.getState().undo();
  store.getState().patch(l.id, { x: 99 });
  assert.equal(store.getState().future.length, 0);
});
test("duplicate, reorder and delete preserve unique ids and normalized stacking", () => {
  store.getState().add(makeLayer("shape"));
  store.getState().duplicate();
  const [a, b] = store.getState().document.layers;
  assert.notEqual(a.id, b.id);
  assert.equal(b.x, a.x + 24);
  store.getState().reorder(b.id, 0);
  assert.deepEqual(
    store.getState().document.layers.map((l) => l.id),
    [b.id, a.id],
  );
  assert.deepEqual(
    store.getState().document.layers.map((l) => l.zIndex),
    [0, 1],
  );
  store.getState().remove();
  assert.equal(store.getState().document.layers.length, 1);
  store.getState().undo();
  assert.equal(store.getState().document.layers.length, 2);
});
test("locked layers resist edits, deletion, duplication and reorder but can be unlocked", () => {
  const l = makeLayer("shape");
  store.getState().add(l);
  store.getState().patch(l.id, { locked: true });
  const before = store.getState().document;
  store.getState().patch(l.id, { x: 999 });
  store.getState().remove();
  store.getState().duplicate();
  store.getState().reorder(l.id, 8);
  assert.deepEqual(store.getState().document, before);
  store.getState().patch(l.id, { visible: false });
  assert.equal(store.getState().document.layers[0].visible, false);
  store.getState().patch(l.id, { locked: false });
  store.getState().remove();
  assert.equal(store.getState().document.layers.length, 0);
});
test("mock document contains separate editable object types and replacement is undoable", () => {
  const doc = mockDocument();
  assert.equal(doc.canvas.width, 1080);
  assert.equal(doc.canvas.height, 1350);
  assert.equal(new Set(doc.layers.map((l) => l.id)).size, doc.layers.length);
  for (const type of ["text", "shape", "image", "icon"])
    assert.ok(doc.layers.some((l) => l.type === type));
  store.getState().commit(doc);
  store.getState().undo();
  assert.equal(store.getState().document.layers.length, 0);
  store.getState().redo();
  assert.deepEqual(store.getState().document, doc);
});
test("history has a bounded capacity and ignores unchanged patches", () => {
  const l = makeLayer("text");
  store.getState().add(l);
  for (let i = 0; i < 100; i++) store.getState().patch(l.id, { x: i });
  assert.equal(store.getState().past.length, 80);
  const before = store.getState().past;
  store.getState().patch(l.id, { x: 99 });
  assert.equal(store.getState().past, before);
});
