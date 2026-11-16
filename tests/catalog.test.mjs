import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProduct, parseMoney, parseCsv, safeHttpsUrl, toPublicCatalog } from '../src/catalog.mjs';
import { fromPartnerBoost, fetchPartnerBoostPage } from '../src/providers/partnerboost.mjs';
import { fromAwinRow } from '../src/providers/awin.mjs';

const item = { id:'x', title:'Teste', currency:'EUR', price:120, affiliateUrl:'https://www.awin1.com/test', shippingPortugal:true, affiliateApproved:true, availability:'in_stock' };
test('sem autorizacao comercial nao apresenta compra', () => {
  assert.equal(normalizeProduct({ ...item, affiliateApproved: false }, 'amazon').canBuy, false);
  assert.equal(normalizeProduct({ ...item, shippingPortugal: false }, 'amazon').canBuy, false);
  assert.equal(normalizeProduct({ ...item, affiliateUrl: null }, 'amazon').canBuy, false);
  assert.equal(normalizeProduct({ ...item, availability: 'unknown' }, 'amazon').canBuy, false);
  assert.equal(normalizeProduct({ ...item, currency: 'USD' }, 'amazon').canBuy, false);
});
test('produto validado pode mostrar link e demo nunca mostra', () => {
  assert.equal(normalizeProduct(item, 'amazon', false).canBuy, true);
  assert.equal(normalizeProduct(item, 'amazon', true).canBuy, false);
  assert.equal(normalizeProduct(item, 'amazon', true).affiliateUrl, null);
});
test('URL insegura e rejeitada', () => {
  assert.equal(safeHttpsUrl('javascript:alert(1)'), null);
  assert.equal(safeHttpsUrl('http://amazon.es'), null);
  assert.equal(safeHttpsUrl('https://user:secret@shop.example'), null);
  assert.equal(safeHttpsUrl('https://www.awin1.com/track'), 'https://www.awin1.com/track');
});
test('precos portugueses e internacionais', () => {
  assert.equal(parseMoney('1.234,56 €'), 1234.56);
  assert.equal(parseMoney('€ 189,90'), 189.9);
  assert.equal(parseMoney('1,299.45 EUR'), 1299.45);
  assert.equal(parseMoney(''), null);
});
test('CSV com aspas e virgulas', () => {
  const out = parseCsv('id,name,price\na,"Produto, Azul","12,50"\n');
  assert.equal(out[0].name, 'Produto, Azul');
  assert.equal(out[0].price, '12,50');
});
test('filtra API PartnerBoost fora de ES ou sem parceria', () => {
  const raw = { country_code:'ES', relationship:1, currency:'EUR', discount_price:'123,45 €', product_id:'1', product_name:'Robô X', category:'Casa', availability:'IN_STOCK', link:'https://amazon.es/example' };
  assert.equal(fromPartnerBoost(raw).price, 123.45);
  assert.equal(fromPartnerBoost(raw).affiliateUrl, null);
  assert.equal(fromPartnerBoost({ ...raw, country_code:'DE' }), null);
  assert.equal(fromPartnerBoost({ ...raw, relationship:0 }), null);
  assert.equal(fromPartnerBoost({ ...raw, currency:'USD' }), null);
});
test('PartnerBoost envia filtro ES e nao confunde token com frontend', async () => {
  let sent;
  const fakeFetch = async (url, opts) => { sent = { url, opts, body: JSON.parse(opts.body) }; return { ok:true, json:async()=>({ status:{ code:0 }, data:{ list:[], has_more:false } }) }; };
  await fetchPartnerBoostPage({ token:'TEST_TOKEN', fetchImpl:fakeFetch });
  assert.equal(sent.body.country_code, 'ES');
  assert.equal(sent.body.relationship, 1);
  assert.equal(sent.body.is_original_currency, 1);
  assert.equal(sent.body.return_link, 0);
});
test('Awin alimenta apenas um rascunho e nao publica automaticamente', () => {
  const result = fromAwinRow({ product_name:'Air Fryer A', merchant_name:'Loja X', search_price:'119.95', aw_deep_link:'https://www.awin1.com/test' },1);
  assert.equal(result.affiliateUrl, null);
  assert.equal(result.affiliateApproved, false);
  assert.equal(result.shippingPortugal, false);
  assert.equal(result.sourceTrackingUrl, 'https://www.awin1.com/test');
});
test('catalogo publico nao inclui dados internos de comissao', () => {
  const publicItem = toPublicCatalog([{ ...item, commissionInfo:'50%', internalNote:'segredo' }], 'amazon')[0];
  assert.ok(!('commissionInfo' in publicItem));
  assert.ok(!('internalNote' in publicItem));
});
