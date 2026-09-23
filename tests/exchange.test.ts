import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fitImage} from '../lib/imagePlacement';
import {parseExchange} from '../lib/designExchange';
import {blankDocument,makeLayer} from '../lib/designParser';
test('image placement preserves aspect, centers and never enlarges',()=>{
 assert.deepEqual(fitImage(2000,1000,{width:1080,height:1350}),{width:1080,height:540,x:0,y:405});
 assert.deepEqual(fitImage(100,200,{width:500,height:500}),{width:100,height:200,x:200,y:150});
});
test('exchange keeps editable types and regenerates layer IDs',()=>{
 const d=blankDocument();d.layers=[makeLayer('text'),makeLayer('shape')];
 const result=parseExchange(d);assert.equal(result.layers[0].type,'text');assert.notEqual(result.layers[0].id,d.layers[0].id);
});
test('exchange rejects remote image sources and invalid geometry',()=>{
 const d=blankDocument();d.layers=[makeLayer('image',{src:'https://example.com/a.png'})];assert.throws(()=>parseExchange(d));
 d.layers=[makeLayer('shape',{width:NaN})];assert.throws(()=>parseExchange(d));
});
