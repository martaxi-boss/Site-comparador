const allowedSources = new Set(['amazon', 'awin']);

export function validSource(value) {
  return allowedSources.has(value) ? value : 'amazon';
}

export function safeHttpsUrl(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function parseMoney(value) {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null;
  if (!value || typeof value !== 'string') return null;
  let str = value.replace(/[^0-9,.]/g, '');
  if (!str) return null;
  const lastComma = str.lastIndexOf(',');
  const lastDot = str.lastIndexOf('.');
  if (lastComma > lastDot) str = str.replace(/\./g, '').replace(',', '.');
  else if (lastDot > lastComma) str = str.replace(/,/g, '');
  const out = Number(str);
  return Number.isFinite(out) && out >= 0 ? out : null;
}

export function normalizeProduct(product, source, demo = false) {
  const p = product || {};
  const affiliateUrl = safeHttpsUrl(p.affiliateUrl);
  const shipVerified = p.shippingPortugal === true;
  const affiliateApproved = p.affiliateApproved === true;
  const availability = p.availability === 'in_stock' ? 'in_stock' : 'unknown';
  const price = parseMoney(p.price);
  const currency = p.currency === 'EUR' ? 'EUR' : null;
  const canBuy = !demo && affiliateApproved && shipVerified && availability === 'in_stock' && !!affiliateUrl && price !== null && currency === 'EUR';
  return {
    id: String(p.id || ''),
    title: String(p.title || 'Produto sem nome'),
    brand: String(p.brand || ''),
    category: String(p.category || 'Outros'),
    group: String(p.group || p.category || 'Outros'),
    source: validSource(source),
    merchant: String(p.merchant || (source === 'amazon' ? 'Amazon' : 'Loja parceira')),
    price, currency,
    imageUrl: safeHttpsUrl(p.imageUrl),
    affiliateUrl: canBuy ? affiliateUrl : null,
    shippingPortugal: shipVerified,
    affiliateApproved,
    availability,
    rating: Number.isFinite(Number(p.rating)) ? Math.min(5, Math.max(0, Number(p.rating))) : null,
    reviews: Number.isInteger(Number(p.reviews)) ? Number(p.reviews) : null,
    specs: p.specs && typeof p.specs === 'object' && !Array.isArray(p.specs) ? p.specs : {},
    updatedAt: String(p.updatedAt || ''),
    canBuy,
    demo
  };
}

export function parseCsv(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const result = []; let row = []; let field = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === ',' && !quoted) { row.push(field); field = ''; }
    else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); if (row.some(Boolean)) result.push(row);
      row = []; field = '';
    } else field += ch;
  }
  if (quoted) throw new Error('CSV mal formado: aspas abertas');
  row.push(field); if (row.some(Boolean)) result.push(row);
  if (!result.length) return [];
  const keys = result.shift().map(h => h.trim().toLowerCase());
  return result.map(values => Object.fromEntries(keys.map((k, i) => [k, values[i] || ''])));
}

export function toPublicCatalog(items, source, demo = false) {
  return items.map(item => normalizeProduct(item, source, demo)).filter(p => p.id && p.title);
}
