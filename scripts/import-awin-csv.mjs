import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseCsv } from '../src/catalog.mjs';
import { fromAwinRow } from '../src/providers/awin.mjs';

const filename = process.argv[2];
if (!filename) {
  console.error('Utilizacao: npm run import:awin -- /caminho/feed.csv');
  process.exitCode = 1;
} else {
  const input = await readFile(filename, 'utf8');
  const items = parseCsv(input).map(fromAwinRow).filter(Boolean);
  const destination = resolve('data/draft-awin.json');
  await writeFile(destination, JSON.stringify(items, null, 2) + '\n');
  console.log(`${items.length} produtos importados para REVISAO: ${destination}. Nenhum link ativado.`);
}
