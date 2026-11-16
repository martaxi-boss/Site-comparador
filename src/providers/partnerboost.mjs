import { parseMoney } from '../catalog.mjs';

export const PARTNERBOOST_URL = 'https://app.partnerboost.com/api/datafeed/get_fba_products';

/** Recupera apenas catalogo ES com parceria declarada. Nao assume aprovacao via Awin. */
export async function fetchPartnerBoostPage({ token, page = 1, fetchImpl = fetch }) {
  if (!token) throw new Error('Falta PARTNERBOOST_CHANNEL_TOKEN');
  const response = await fetchImpl(PARTNERBOOST_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token, page, page_size: 50, country_code: 'ES', relationship: 1,
      is_original_currency: 1, default_filter: 0, return_link: 0,
      filter_sexual_wellness: 1
    }), signal: AbortSignal.timeout(25000)
  });
  if (!response.ok) throw new Error(`PartnerBoost respondeu HTTP ${response.status}`);
  const json = await response.json();
  if (json.status?.code !== 0) throw new Error(`PartnerBoost: ${json.status?.msg || 'erro desconhecido'}`);
  return { list: json.data?.list || [], hasMore: Boolean(json.data?.has_more) };
}

export function fromPartnerBoost(item) {
  if (item.country_code !== 'ES' || Number(item.relationship) !== 1) return null;
  const price = parseMoney(item.discount_price || item.original_price);
  if (!Number.isFinite(price) || item.currency !== 'EUR') return null;
  const group = String(item.subcategory || item.category || 'Outros');
  return {
    id: `pb-${item.product_id || item.asin}`, title: String(item.product_name || ''),
    brand: String(item.brand_name || ''), category: String(item.category || 'Outros'),
    group, merchant: 'Amazon', price, currency: 'EUR',
    imageUrl: item.image || null, rating: Number(item.rating) || null,
    reviews: Number(item.reviews) || null, availability: item.availability === 'IN_STOCK' ? 'in_stock' : 'unknown',
    shippingPortugal: false, affiliateApproved: false, affiliateUrl: null,
    sourceProductId: String(item.product_id || ''), asin: String(item.asin || ''),
    commissionInfo: String(item.commission || ''),
    updatedAt: String(item.update_time || ''), specs: { Marca: item.brand_name || '-', ASIN: item.asin || '-' },
    internalNote: 'Precisa validacao comercial Awin e entrega em Portugal. Nao usar URL direta da PartnerBoost para atribuir comissao Awin.'
  };
}
