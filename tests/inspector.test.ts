import test from "node:test";
import assert from "node:assert/strict";
import { makeLayer, blankDocument } from "../lib/designParser";
import { useEditorStore } from "../store/editorStore";
import { cropPatch } from "../lib/imageEditing";
import { alignedPosition, fillsOf, effectsOf } from "../lib/layerStyles";
import { parseExchange } from "../lib/designExchange";
import { applyImageResult } from "../lib/applyImageResult";
import type { ImageLayer } from "../types/design";
import {morphAlpha} from '../lib/renderLayerStyle';
import {selectionSVG,supportsSVG} from '../lib/exportSelection';
test('stroke and spread morphology expands and contracts only alpha geometry',()=>{const pixels=new Uint8ClampedArray(7*7*4);pixels[(3*7+3)*4+3]=255;const spread=morphAlpha(pixels,7,7,1);assert.equal(Array.from(spread).filter((v,i)=>i%4===3&&v===255).length,9);const contracted=morphAlpha(spread,7,7,1,true);assert.equal(Array.from(contracted).filter((v,i)=>i%4===3&&v===255).length,1);assert.equal(contracted[(3*7+3)*4+3],255);assert.equal(pixels[(3*7+2)*4+3],0);});
test('SVG exports actual vector geometry and refuses unsupported effects',()=>{const l=makeLayer('shape',{width:100,height:50,fill:'#ff0000',fills:[{id:'fill',color:'#245ac7',opacity:.5,visible:true}]});const svg=selectionSVG(l,2);assert.match(svg,/<rect width="100" height="50"/);assert.match(svg,/fill="#245ac7" opacity="0.5"/);assert.match(svg,/width="200" height="100"/);assert.ok(!svg.includes('<image'));assert.equal(supportsSVG({...l,effects:[{id:'blur',type:'blur',color:'#000000',opacity:1,visible:true,x:0,y:0,spread:0,blur:4}]}),false);});
test("live transform preview does not mutate documents or add undo entries", () => {
  const layer = makeLayer("shape");
  const doc = { ...blankDocument(), layers: [layer] };
  useEditorStore.setState({
    document: doc,
    past: [],
    future: [],
    selectedId: layer.id,
    preview: null,
  });
  const s = useEditorStore.getState();
  for (let i = 0; i < 30; i++)
    s.previewTransform(layer.id, { x: i, width: 200 + i });
  assert.equal(useEditorStore.getState().past.length, 0);
  assert.equal(useEditorStore.getState().document, doc);
  s.patch(layer.id, { x: 29, width: 229 });
  assert.equal(useEditorStore.getState().past.length, 1);
  assert.equal(useEditorStore.getState().preview, null);
  s.undo();
  assert.deepEqual(useEditorStore.getState().document, doc);
});
test("crop retains original source, accounts for flips and rotation, and can be undone", () => {
  const l = makeLayer("image", {
    src: "original",
    width: 400,
    height: 200,
    x: 20,
    y: 30,
    rotation: 90,
    flipX: true,
  }) as ImageLayer;
  const p = cropPatch(l, { x: 0.1, y: 0.2, width: 0.5, height: 0.6 });
  assert.equal(p.width, 200);
  assert.equal(p.height, 120);
  assert.ok(Math.abs(p.x + 20) < 1e-9);
  assert.ok(Math.abs(p.y - 190) < 1e-9);
  const restored = cropPatch(
    { ...l, ...p },
    { x: 0, y: 0, width: 1, height: 1 },
  );
  assert.ok(Math.abs(restored.x - l.x) < 1e-9);
  assert.ok(Math.abs(restored.y - l.y) < 1e-9);
  assert.equal(restored.width, l.width);
  assert.equal(l.src, "original");
});
test("baked image edit clears crop while retaining original backup metadata", () => {
  const l = makeLayer("image", {
    src: "original",
    crop: { x: 0.1, y: 0.1, width: 0.5, height: 0.5 },
  }) as ImageLayer;
  const result = applyImageResult(
    { ...blankDocument(), layers: [l] },
    l,
    "edited",
    "backup",
  );
  assert.deepEqual((result.layers[0] as ImageLayer).crop, l.crop);
  assert.equal((result.layers[1] as ImageLayer).crop, undefined);
  assert.equal((result.layers[1] as ImageLayer).src, "edited");
});
test("canvas alignment includes rotated object geometry", () => {
  const l = makeLayer("shape", { width: 200, height: 100, rotation: 90 });
  assert.ok(
    Math.abs(
      alignedPosition(l, { width: 1000, height: 800 }, "left").x! - 100,
    ) < 1e-8,
  );
  assert.ok(
    Math.abs(
      alignedPosition(l, { width: 1000, height: 800 }, "middle").y! - 300,
    ) < 1e-8,
  );
});
test("legacy fills and effects remain editable and explicit empty arrays remove them", () => {
  const l = makeLayer("text", {
    color: "#123456",
    shadowEnabled: true,
    shadowOpacity: 0.4,
  });
  assert.equal(fillsOf(l)[0].color, "#123456");
  assert.equal(effectsOf(l)[0].opacity, 0.4);
  assert.deepEqual(fillsOf({ ...l, fills: [] }), []);
  assert.deepEqual(effectsOf({ ...l, effects: [] }), []);
});
test("exchange rejects malformed new styles and preserves valid crop", () => {
  const doc = {
    ...blankDocument(),
    layers: [
      makeLayer("image", {
        src: "data:image/png;base64,YQ==",
        crop: { x: 0.1, y: 0, width: 0.9, height: 1 },
      }),
    ],
  };
  assert.deepEqual((parseExchange(doc).layers[0] as ImageLayer).crop, {
    x: 0.1,
    y: 0,
    width: 0.9,
    height: 1,
  });
  assert.throws(() =>
    parseExchange({
      ...doc,
      layers: [
        {
          ...doc.layers[0],
          fills: [
            {
              id: "bad",
              color: '" onload="alert(1)',
              opacity: 1,
              visible: true,
            },
          ],
        },
      ],
    }),
  );
});
