/* Interface pública: API de pesquisa paginada. Sem acesso a credenciais, nem links em demo. */
const $=id=>document.getElementById(id);
const money=new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR'});
const state={source:'auto',resolvedSource:'amazon',mode:'demo',q:'',category:'',sort:'recommended',page:1,limit:12,items:[],categories:[],total:0,pages:1,selected:new Map(),pending:0};
let toastTimer=null;let debounceTimer=null;
const icons={telemoveis:'📱',tablets:'▤',smartwatches:'⌚',audio:'🎧',portateis:'💻',monitores:'🖥️',fritadeiras:'🍳',aspiradores:'◉','cuidados-pessoais':'✂️',ferramentas:'🛠️','desporto-acessorios':'🚴'};
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const formatPrice=p=>p.price===null||p.currency!=='EUR'?'Preço indisponível':money.format(p.price);
const categoryIcon=p=>icons[p.categoryId]||'◈';
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function notice(msg){
 const el=$('toast');if(!el)return;
 el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);
 toastTimer=setTimeout(()=>el.classList.remove('show'),3200);
}
function params(extra={}){
 const query=new URLSearchParams({source:state.source,q:state.q,category:state.category,sort:state.sort,page:String(state.page),limit:String(state.limit),...extra});
 return query.toString();
}
async function request(url){
 const response=await fetch(url,{cache:'no-store',headers:{'Accept':'application/json'}});
 if(!response.ok)throw new Error('O catálogo está temporariamente indisponível.');
 return response.json();
}
function renderCategoryGrid(){
 const el=$('category-grid');
 if(!state.categories.length){el.innerHTML='<div class="category-loading">Ainda não existem categorias disponíveis nesta fonte.</div>';return;}
 el.innerHTML=state.categories.map(p=>'<button type="button" class="category-card '+(state.category===p.id?'active':'')+'" data-category="'+esc(p.id)+'"><span class="category-emoji" aria-hidden="true">'+esc(p.icon||'◈')+'</span><span><b>'+esc(p.name)+'</b><small>'+p.count+' exemplos no catálogo <span class="category-arrow" aria-hidden="true">↗</span></small></span></button>').join('');
}
function renderCategoryFilters(){
 const el=$('category-filters');
 let rows='<button type="button" class="filter-btn '+(!state.category?'active':'')+'" data-category=""><span>Todos os produtos</span><small>↗</small></button>';
 for(const p of state.categories){
  rows+='<button type="button" class="filter-parent filter-btn '+(state.category===p.id?'active':'')+'" data-category="'+esc(p.id)+'"><span>'+esc(p.name)+'</span><small>'+p.count+'</small></button>';
  for(const child of p.children){
   if(child.count>0)rows+='<button type="button" class="filter-btn '+(state.category===child.id?'active':'')+'" data-category="'+esc(child.id)+'"><span>'+esc(child.name)+'</span><small>'+child.count+'</small></button>';
  }
 }
 el.innerHTML=rows;
}
function updateSources(){
 for(const key of ['amazon','awin']){
  const b=$('source-'+key),active=(state.source==='auto'?state.resolvedSource:state.source)===key;
  b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));
 }
 $('demo-toolbar').hidden=state.mode!=='demo';
}
function renderProducts(){
 const el=$('product-grid');
 if(!state.items.length){
  el.innerHTML='<div class="empty-results"><span aria-hidden="true">⌕</span><strong>Não encontrámos resultados.</strong><p>Experimenta outra pesquisa ou escolhe uma categoria diferente.</p><button type="button" data-reset="1">Limpar pesquisa</button></div>';
  return;
 }
 el.innerHTML=state.items.map(p=>{
  const key=state.source+':'+p.id,chosen=state.selected.has(key);
  const specs=Object.entries(p.specs||{}).filter(([k])=>k!=='Modelo'&&k!=='ASIN').slice(0,3).map(([name,value])=>'<span><b>'+esc(name)+':</b> '+esc(value)+'</span>').join('');
  const image=p.imageUrl&&!p.demo?'<img loading="lazy" referrerpolicy="no-referrer" src="'+esc(p.imageUrl)+'" alt="Fotografia de '+esc(p.title)+'">':'<span class="product-symbol" aria-hidden="true">'+esc(categoryIcon(p))+'</span>';
  const link=p.canBuy&&p.affiliateUrl?'<a class="buy-button enabled" href="'+esc(p.affiliateUrl)+'" target="_blank" rel="sponsored noopener noreferrer">Ver oferta na loja ↗</a>':'<button class="buy-button" type="button" disabled>Link comercial indisponível</button>';
  return '<article class="product-card '+(chosen?'is-selected':'')+'">'+
   '<div class="product-image">'+image+'<span class="product-badge">'+(p.demo?'PRODUTO FICTÍCIO':'OFERTA VALIDADA')+'</span></div>'+
   '<div class="product-body"><div class="card-brand">'+esc(p.brand||'Marca não indicada')+'</div><h4 class="card-title">'+esc(p.title)+'</h4>'+
   '<div class="card-specs">'+specs+'</div><div class="card-price-wrap"><div><small class="price-note">'+(p.demo?'Preço meramente ilustrativo':'Preço do anunciante')+'</small><strong class="card-price">'+esc(formatPrice(p))+'</strong></div><span class="merchant-line">'+esc(p.merchant)+'</span></div>'+
   '<div class="product-actions"><button class="compare-button" type="button" data-add="'+esc(p.id)+'" aria-pressed="'+chosen+'">'+(chosen?'✓ Adicionado':'+ Adicionar à comparação')+'</button>'+link+'</div></div></article>';
 }).join('');
}
function compareSelected(){return [...state.selected.values()];}
function renderComparison(){
 const products=compareSelected();
 $('compare-dock').hidden=products.length===0;
 $('dock-count').textContent=String(products.length);
 $('dock-title').textContent=products.length<2?'Seleciona pelo menos dois produtos':'Pronto para comparar lado a lado';
 $('dock-compare').disabled=products.length<2;
 $('dock-items').innerHTML=products.map(p=>'<span class="dock-item" title="'+esc(p.title)+'">'+esc(categoryIcon(p))+'</span>').join('');
 const el=$('comparison-content');
 if(products.length<2){
  el.innerHTML='<div class="compare-empty"><span aria-hidden="true">⇆</span><h3>Escolhe os teus favoritos</h3><p>Adiciona pelo menos dois produtos da mesma categoria para começar a comparar.</p><a href="#catalogo">Explorar produtos →</a></div>';
  return;
 }
 const specs=[...new Set(products.flatMap(p=>Object.keys(p.specs||{}).filter(k=>k!=='Modelo'&&k!=='ASIN'))) ].slice(0,10);
 const th=products.map(p=>'<th scope="col">'+esc(p.title)+'<button type="button" class="remove" data-remove="'+esc(p.id)+'">Remover</button></th>').join('');
 const row=(name,fn)=>'<tr><td>'+esc(name)+'</td>'+products.map(p=>'<td>'+fn(p)+'</td>').join('')+'</tr>';
 const rows=[
  row('Preço',p=>'<strong>'+esc(formatPrice(p))+'</strong>'),
  row('Marca',p=>esc(p.brand||'—')),
  row('Vendido por',p=>esc(p.merchant)),
  ...specs.map(name=>row(name,p=>esc(p.specs?.[name]||'—'))),
  row('Oferta',p=>p.canBuy&&p.affiliateUrl?'<a target="_blank" rel="sponsored noopener noreferrer" href="'+esc(p.affiliateUrl)+'">Abrir loja ↗</a>':'Link comercial pendente')
 ].join('');
 el.innerHTML='<div class="comparison-shell"><div class="comparison-overflow" tabindex="0" aria-label="Tabela de comparação, deslize horizontalmente em ecrãs pequenos"><table class="comparison-table"><thead><tr><th scope="col">Critério</th>'+th+'</tr></thead><tbody>'+rows+'</tbody></table></div><div class="comparison-foot"><span>'+products.length+' de 5 produtos selecionados · '+(state.mode==='demo'?'dados fictícios':'dados da fonte aprovada')+'</span><span>Em telemóvel, desliza a tabela para o lado ↔</span></div></div>';
}
function renderPagination(){
 const el=$('pagination');
 if(state.pages<=1){el.innerHTML='';return;}
 const first=(state.page-1)*state.limit+1,last=Math.min(state.total,state.page*state.limit);
 el.innerHTML='<button type="button" data-page="'+(state.page-1)+'" '+(state.page<=1?'disabled':'')+'>← Anterior</button><span>'+first+'–'+last+' de '+state.total+'</span><button type="button" data-page="'+(state.page+1)+'" '+(state.page>=state.pages?'disabled':'')+'>Seguinte →</button>';
}
async function load(){
 const ticket=++state.pending;
 $('product-grid').innerHTML='<div class="loading-results"><span aria-hidden="true">◌</span>A preparar produtos e filtros…</div>';
 $('catalog-status').textContent='';
 try{
  const [categories,products]=await Promise.all([
    request('/api/categories?'+new URLSearchParams({source:state.source,q:state.q})),
    request('/api/search?'+params())
  ]);
  if(ticket!==state.pending)return;
  state.mode=products.mode;
  state.resolvedSource=products.source;
  state.categories=categories.categories;
  state.items=products.items;
  state.total=products.total;state.pages=products.pages;
  const chosen=state.categories.flatMap(p=>[p,...p.children]).find(p=>p.id===state.category);
  $('results-title').textContent=chosen?.name||'Todos os produtos';
  $('results-description').textContent=state.q?'Resultados para “'+state.q+'”':'Seleção organizada para compradores em Portugal';
  $('result-count').textContent=String(state.total)+' '+(state.total===1?'produto':'produtos');
  renderCategoryGrid();renderCategoryFilters();renderProducts();renderPagination();renderComparison();updateSources();
  $('catalog-status').textContent=state.mode==='demo'?'Atenção: todos os produtos e preços desta pré-visualização são fictícios. Nenhum botão de compra está ativo.':'Apresentam-se apenas ofertas aprovadas; confirma sempre os detalhes na loja.';
 }catch(error){
  if(ticket!==state.pending)return;
  $('product-grid').innerHTML='<div class="empty-results"><span>!</span><strong>Não foi possível carregar o catálogo.</strong><p>Tenta novamente dentro de momentos.</p><button type="button" data-retry="1">Tentar novamente</button></div>';
  $('catalog-status').textContent=error.message;
 }
}
function categorySelect(id){
 state.category=id||'';state.page=1;
 load();
 document.getElementById('catalogo').scrollIntoView({behavior:'smooth',block:'start'});
}
function resetSearch(){
 state.q='';state.category='';state.page=1;
 $('hero-query').value='';$('catalog-search').value='';
 load();
}
function choose(id){
 const p=state.items.find(x=>x.id===id);
 if(!p)return;
 const key=state.source+':'+p.id;
 if(state.selected.has(key)){state.selected.delete(key);}
 else{
  const selected=compareSelected();
  if(selected.length>=5){notice('Podes comparar no máximo cinco produtos.');return;}
  if(selected.length&&selected[0].categoryId!==p.categoryId){notice('Seleciona produtos da mesma categoria para uma comparação útil.');return;}
  state.selected.set(key,p);
 }
 renderProducts();renderComparison();
}
function removeSelected(id){
 state.selected.delete(state.source+':'+id);renderProducts();renderComparison();
}
function switchSource(source){
 if(!['amazon','awin'].includes(source)||source===state.source)return;
 state.source=source;state.page=1;state.category='';state.q='';state.selected.clear();
 $('hero-query').value='';$('catalog-search').value='';
 load();
}
document.addEventListener('click',e=>{
 const item=e.target.closest('[data-category]');
 if(item){categorySelect(item.dataset.category);return;}
 const add=e.target.closest('[data-add]');
 if(add){choose(add.dataset.add);return;}
 const remove=e.target.closest('[data-remove]');
 if(remove){removeSelected(remove.dataset.remove);return;}
 const p=e.target.closest('[data-page]');
 if(p){const next=Number(p.dataset.page);if(next>=1&&next<=state.pages){state.page=next;load();document.getElementById('catalogo').scrollIntoView({behavior:'smooth'});}return;}
 const suggest=e.target.closest('[data-suggest]');
 if(suggest){state.q=suggest.dataset.suggest;state.category='';state.page=1;$('hero-query').value=state.q;$('catalog-search').value=state.q;load();document.getElementById('catalogo').scrollIntoView({behavior:'smooth'});return;}
 if(e.target.closest('[data-reset]')){resetSearch();return;}
 if(e.target.closest('[data-retry]')){load();return;}
});
$('hero-search').addEventListener('submit',e=>{
 e.preventDefault();state.q=$('hero-query').value.trim();$('catalog-search').value=state.q;state.page=1;state.category='';load();document.getElementById('catalogo').scrollIntoView({behavior:'smooth'});
});
$('catalog-search').addEventListener('input',e=>{
 clearTimeout(debounceTimer);const value=e.target.value.trim();debounceTimer=setTimeout(()=>{state.q=value;state.page=1;$('hero-query').value=value;load();},260);
});
$('sort-products').addEventListener('change',e=>{state.sort=e.target.value;state.page=1;load();});
$('source-amazon').addEventListener('click',()=>switchSource('amazon'));
$('source-awin').addEventListener('click',()=>switchSource('awin'));
$('reset-categories').addEventListener('click',()=>categorySelect(''));
$('clear-compare').addEventListener('click',()=>{state.selected.clear();renderProducts();renderComparison();});
$('dock-clear').addEventListener('click',()=>{state.selected.clear();renderProducts();renderComparison();});
$('dock-compare').addEventListener('click',()=>{if(state.selected.size>=2)document.getElementById('comparacao').scrollIntoView({behavior:'smooth'});});
load();
