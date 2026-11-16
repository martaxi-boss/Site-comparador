import { parseMoney } from '../catalog.mjs';

function field(row, ...names) { return names.map(n => row[n]).find(v => v !== undefined && String(v).trim()) || ''; }

/** Mapeamento flexivel para CSV Awin; verificar colunas com os feeds autorizados. */
export function fromAwinRow(row, index = 0) {
  const title = field(row, 'product_name', 'name', 'title', 'product_title');
  if (!title) return null;
  const price = parseMoney(field(row, 'search_price', 'price', 'product_price', 'retail_price'));
  const url = field(row, 'aw_deep_link', 'aw_product_deep_link', 'tracking_url', 'affiliate_link');
  const currency = field(row, 'currency', 'currency_code') || 'EUR';
  if (price === null || currency.toUpperCase() !== 'EUR') return null;
  return {
    id: `awin-${field(row, 'merchant_product_id', 'product_id', 'id') || index}`,
    title,
    brand: field(row, 'brand_name', 'brand'),
    category: field(row, 'merchant_category', 'category_name', 'category') || 'Outros',
    group: field(row, 'category_name', 'merchant_category', 'category') || 'Outros',
    merchant: field(row, 'merchant_name', 'advertiser_name', 'retailer_name') || 'Loja parceira',
    price, currency: 'EUR', imageUrl: field(row, 'merchant_image_url', 'aw_image_url', 'image_url', 'image') || null,
    sourceTrackingUrl: url || null,
    affiliateUrl: null, affiliateApproved: false, shippingPortugal: false,
    availability: 'unknown', specs: { Marca: field(row, 'brand_name', 'brand') || '-' },
    updatedAt: new Date().toISOString(),
    internalNote: 'Rever autorizacao do anunciante, link rastreado, stock e entregas em Portugal.'
  };
}
