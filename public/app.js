const state = { source: 'amazon', mode: 'demo', products: [], category: '', selected: [], query: '', sort: 'recommended' };
const fmt = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
const $ = id => document.getElementById(id);
const html = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icons = [ ['Robôs aspiradores','◉'], ['Air fryers','♧'], ['Smartwatches','◷'], ['Auscultadores','♫'], ['Telemóveis','▯'], ['Cozinha','♧'], ['Casa','⌂'] ];
const iconFor = category => (icons.find(([key]) => String(category).toLowerCase().includes(key.toLowerCase())) || [null,'◈'])[1];
let toastTimer;
function notify(text) { const el = $('toast'); el.textContent = text; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 3300); }
function priceOf(p) { return p.price === null || p.currency !== 'EUR' ? 'Preço indisponível' : fmt.format(p.price); }
function selectedProducts() { return state.selected.map(id => state.products.find(p => p.id === id)).filter(Boolean); }
function visibleProducts() {
  const query = state.query.trim().toLocaleLowerCase('pt-PT');
  let matches = state.products.filter(p => (!state.category || p.category === state.category) && (!query || [p.title, p.brand, p.group, p.merchant, ...Object.values(p.specs)].join(' ').toLocaleLowerCase('pt-PT').includes(query)));
  if (state.sort === 'price-asc') matches = matches.slice().sort((a,b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  if (state.sort === 'price-desc') matches = matches.slice().sort((a,b) => (b.price ?? -1) - (a.price ?? -1));
  if (state.sort === 'name') matches = matches.slice().sort((a,b) => a.title.localeCompare(b.title, 'pt-PT'));
  return matches;
}
function setDefaults() {
  state.query = '';
  $('search').value = '';
  state.sort = 'recommended';
  $('sort').value = 'recommended';
  state.category = state.products[0]?.category || '';
  state.selected = state.products.filter(p => p.category === state.category).slice(0,4).map(p=>p.id);
}
async function loadSource(source) {
  state.source = source;
  $('source-amazon').classList.toggle('active', source === 'amazon');
  $('source-awin').classList.toggle('active', source === 'awin');
  $('source-amazon').setAttribute('aria-pressed', String(source === 'amazon'));
  $('source-awin').setAttribute('aria-pressed', String(source === 'awin'));
  $('products').innerHTML = '<div class="empty-results">A carregar o catálogo...</div>';
  try {
    const resp = await fetch(`/api/catalog?source=${source}`, { cache: 'no-store' });
    if (!resp.ok) throw new Error('Falha ao obter catalogo');
    const data = await resp.json();
    state.mode = data.mode;
    state.products = data.products;
    setDefaults();
    $('demo-notice').style.display = state.mode === 'demo' ? 'flex' : 'none';
    draw();
  } catch {
    $('products').innerHTML = '<div class="empty-results"><strong>Não foi possível carregar o catálogo.</strong>Confirme que o servidor está em execução.</div>';
    $('results-title').textContent = 'Catálogo indisponível';
    $('results-caption').textContent = '';
    $('comparison-container').innerHTML = '';
  }
}
function drawCategories() {
  const categories = [...new Set(state.products.map(p => p.category))];
  $('categories').innerHTML = categories.map(cat => `<button type="button" class="${state.category === cat ? 'active' : ''}" data-category="${html(cat)}">${html(cat)}</button>`).join('');
}
function drawProducts() {
  const products = visibleProducts();
  $('results-title').textContent = state.category || 'Todos os produtos';
  $('results-caption').textContent = state.source === 'amazon' ? 'Seleção para o modelo de compra centralizado na Amazon.' : 'Alternativas de lojas da rede Awin — plano de contingência.';
  $('results-count').textContent = `${products.length} ${products.length === 1 ? 'produto' : 'produtos'}`;
  if (!products.length) {
    $('products').innerHTML = '<div class="empty-results"><strong>Não encontrámos resultados.</strong>Experimente outra pesquisa ou categoria.</div>';
    return;
  }
  $('products').innerHTML = products.map(p => {
    const chosen = state.selected.includes(p.id);
    const specs = Object.entries(p.specs).slice(0,2).map(([key,val]) => `<div><span>✓</span><span><b>${html(key)}:</b> ${html(val)}</span></div>`).join('');
    const icon = iconFor(p.category);
    const photo = p.imageUrl && !p.demo ? `<img src="${html(p.imageUrl)}" alt="Imagem de ${html(p.title)}" loading="lazy" referrerpolicy="no-referrer">` : `<span class="product-symbol" aria-hidden="true">${html(icon)}</span>`;
    const shop = p.canBuy ? `<a class="buy-btn" href="${html(p.affiliateUrl)}" target="_blank" rel="sponsored noopener noreferrer">Ver na loja ↗</a>` : `<button class="buy-btn disabled" disabled type="button" title="Link nao validado">Link pendente</button>`;
    return `<article class="product-card"><div class="card-image">${photo}<span class="small-note">${p.demo ? 'EXEMPLO ILUSTRATIVO' : 'OFERTA VALIDADA'}</span></div><div class="card-body"><div class="card-brand">${html(p.brand || 'Marca não indicada')}</div><h4 class="card-title">${html(p.title)}</h4><div class="spec-lines">${specs}</div><div class="price-line"><div><span class="price-caption">${p.demo ? 'Preço fictício' : 'Preço indicado pelo anunciante'}</span><span class="card-price">${html(priceOf(p))}</span></div><span class="merchant-tag" title="${html(p.merchant)}">${html(p.merchant)}</span></div><div class="card-actions"><button type="button" class="compare-btn ${chosen ? 'is-selected' : ''}" data-compare-id="${html(p.id)}" aria-pressed="${chosen}">${chosen ? '✓ A comparar' : '+ Comparar'}</button>${shop}</div></div></article>`;
  }).join('');
}
function drawComparison() {
  const selected = selectedProducts();
  const el = $('comparison-container');
  if (selected.length < 2) {
    el.innerHTML = '<div class="compare-note"><b>Comece por selecionar dois produtos.</b>Adicione produtos na secção acima para construir uma comparação lado a lado. Pode comparar até cinco.</div>';
    return;
  }
  const specNames = [...new Set(selected.flatMap(p => Object.keys(p.specs)))].slice(0, 8);
  const header = selected.map(p => `<th scope="col"><span class="table-product">${html(p.title)}</span><span class="table-model">${html(p.merchant)}</span></th>`).join('');
  const rows = [
    ['Preço', p => `<b>${html(priceOf(p))}</b>`],
    ['Marca', p => html(p.brand || '—')],
    ['Vendido em', p => html(p.merchant)],
    ...specNames.map(name => [name, p => html(p.specs[name] || '—')]),
    ['Comprar', p => p.canBuy ? `<a href="${html(p.affiliateUrl)}" target="_blank" rel="sponsored noopener noreferrer">Abrir oferta ↗</a>` : '<span>Link pendente</span>']
  ].map(([label, fn]) => `<tr><td>${html(label)}</td>${selected.map(p => `<td>${fn(p)}</td>`).join('')}</tr>`).join('');
  el.innerHTML = `<div class="comparison-shell"><div class="table-scroll"><table class="comparison-table"><thead><tr><th scope="col">CRITÉRIO</th>${header}</tr></thead><tbody>${rows}</tbody></table></div><div class="table-footer"><span>${selected.length} de 5 produtos selecionados${state.mode === 'demo' ? ' · dados fictícios' : ''}</span><button class="clear-btn" id="clear-selection" type="button">Limpar seleção</button></div></div>`;
}
function draw() { drawCategories(); drawProducts(); drawComparison(); }
$('categories').addEventListener('click', e => {
  const btn = e.target.closest('[data-category]'); if (!btn) return;
  state.category = btn.dataset.category;
  state.selected = state.products.filter(p => p.category === state.category).slice(0,4).map(p => p.id);
  draw();
});
$('products').addEventListener('click', e => {
  const btn = e.target.closest('[data-compare-id]'); if (!btn) return;
  const id = btn.dataset.compareId;
  if (state.selected.includes(id)) state.selected = state.selected.filter(item => item !== id);
  else if (state.selected.length >= 5) { notify('Só é possível comparar até cinco produtos.'); return; }
  else state.selected.push(id);
  drawProducts(); drawComparison();
});
$('comparison-container').addEventListener('click', e => {
  if (e.target.closest('#clear-selection')) { state.selected = []; drawProducts(); drawComparison(); }
});
$('search').addEventListener('input', e => { state.query = e.target.value; drawProducts(); });
$('sort').addEventListener('change', e => { state.sort = e.target.value; drawProducts(); });
$('source-amazon').addEventListener('click', () => loadSource('amazon'));
$('source-awin').addEventListener('click', () => loadSource('awin'));
loadSource('amazon');
