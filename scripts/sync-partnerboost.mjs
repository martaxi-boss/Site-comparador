import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fetchPartnerBoostPage, fromPartnerBoost } from '../src/providers/partnerboost.mjs';

const token = process.env.PARTNERBOOST_CHANNEL_TOKEN;
if (!token) {
  console.error('Falta PARTNERBOOST_CHANNEL_TOKEN. Nao foram efetuados pedidos.');
  process.exitCode = 1;
} else {
  const maxPages = Math.max(1, Math.min(20, Number(process.env.PARTNERBOOST_MAX_PAGES || 3)));
  const items = []; const seen = new Set();
  for (let page = 1; page <= maxPages; page++) {
    const { list, hasMore } = await fetchPartnerBoostPage({ token, page });
    for (const raw of list) {
      const item = fromPartnerBoost(raw);
      if (item && item.title && !seen.has(item.id)) { items.push(item); seen.add(item.id); }
    }
    if (!hasMore) break;
  }
  const destination = resolve('data/draft-amazon.json');
  await mkdir(resolve('data'), { recursive: true });
  await writeFile(destination, JSON.stringify(items, null, 2) + '\n');
  console.log(`${items.length} produtos ES elegiveis para REVISAO guardados em ${destination}. Nenhum link de compra foi ativado.`);
}
