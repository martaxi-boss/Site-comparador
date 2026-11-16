import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeProductTitle, computeTitleSimilarity} from 'product-matcher';
test('motor MIT externo normaliza títulos de produtos',()=>{
 const a=normalizeProductTitle('Lenovo IdeaPad 3 Intel i5 8GB 512GB');
 const b=normalizeProductTitle('Lenovo IdeaPad 3 Intel i5 8GB 512GB');
 assert.ok(a.length>10);
 assert.equal(a,b);
 const score=computeTitleSimilarity(a,b);
 assert.ok(score>=.99,JSON.stringify(score));
});
