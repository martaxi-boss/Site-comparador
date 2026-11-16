import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { toPublicCatalog, validSource } from './src/catalog.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8' };
const port = Number(process.env.PORT || 4173);

async function loadCatalog(source) {
  try {
    const contents = JSON.parse(await readFile(resolve(root, `data/active-${source}.json`), 'utf8'));
    return { mode: 'live', products: toPublicCatalog(contents, source, false) };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const contents = JSON.parse(await readFile(resolve(root, `data/demo-${source}.json`), 'utf8'));
    return { mode: 'demo', products: toPublicCatalog(contents, source, true) };
  }
}

const srv = createServer(async (request, response) => {
  const parsed = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' https: data:; style-src 'self'; script-src 'self'; base-uri 'none'; object-src 'none'; form-action 'self'",
  };
  try {
    if (request.method !== 'GET') { response.writeHead(405, headers); response.end('Metodo nao permitido'); return; }
    if (parsed.pathname === '/api/catalog') {
      const source = validSource(parsed.searchParams.get('source'));
      const payload = { source, ...(await loadCatalog(source)) };
      response.writeHead(200, { ...headers, 'Content-Type': types['.json'], 'Cache-Control': 'no-store' });
      response.end(JSON.stringify(payload)); return;
    }
    if (parsed.pathname === '/health') {
      response.writeHead(200, { ...headers, 'Content-Type': types['.json'] });
      response.end(JSON.stringify({ status: 'ok', version: '0.1.0' })); return;
    }
    const target = resolve(root, 'public', `.${parsed.pathname === '/' ? '/index.html' : parsed.pathname}`);
    const publicRoot = resolve(root, 'public');
    if (target !== publicRoot && !target.startsWith(publicRoot + sep)) { response.writeHead(403, headers); response.end(); return; }
    if ((await stat(target)).isDirectory()) { response.writeHead(404, headers); response.end(); return; }
    const content = await readFile(target);
    response.writeHead(200, { ...headers, 'Content-Type': types[extname(target)] || 'application/octet-stream' });
    response.end(content);
  } catch (e) {
    response.writeHead(e.code === 'ENOENT' ? 404 : 500, headers);
    response.end(e.code === 'ENOENT' ? 'Nao encontrado' : 'Erro interno');
    if (e.code !== 'ENOENT') console.error(e);
  }
});
srv.listen(port, '127.0.0.1', () => console.log(`Comparador de demonstracao em http://127.0.0.1:${port}`));
