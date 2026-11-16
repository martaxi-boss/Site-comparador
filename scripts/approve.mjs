import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseCsv, safeHttpsUrl } from '../src/catalog.mjs';

const source = process.argv[2];
if (!['amazon','awin'].includes(source)) {
  console.error('Utilizacao: npm run approve -- amazon|awin'); process.exitCode = 1;
} else {
  const draft = JSON.parse(await readFile(resolve(`data/draft-${source}.json`), 'utf8'));
  const approvals = parseCsv(await readFile(resolve(`data/approval-${source}.csv`), 'utf8'));
  const byId = new Map(approvals.map(p => [p.id, p]));
  const active = [];
  for (const item of draft) {
    const p = byId.get(item.id);
    if (!p) continue;
    const url = safeHttpsUrl(p.affiliate_url);
    if (!url || p.affiliate_approved?.toLowerCase() !== 'yes' || p.shipping_pt_verified?.toLowerCase() !== 'yes' || p.stock_verified?.toLowerCase() !== 'yes') continue;
    // Verificar previamente que a URL foi gerada no programa Awin autorizado.
    active.push({ ...item, affiliateUrl: url, affiliateApproved: true, shippingPortugal: true, availability: 'in_stock', updatedAt: new Date().toISOString() });
  }
  const filename = resolve(`data/active-${source}.json`);
  await writeFile(filename, JSON.stringify(active, null, 2) + '\n');
  console.log(`${active.length} ofertas aprovadas em ${filename}; ${draft.length - active.length} permanecem fora do site.`);
}
