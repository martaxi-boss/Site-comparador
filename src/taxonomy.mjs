// Taxonomia editorial independente dos nomes de categorias dos fornecedores.
// Categorias e atributos estão em pt-PT; não dependem de uma API específica.
export const TAXONOMY = Object.freeze([
  { id:'tecnologia', name:'Tecnologia', icon:'📱', children:[
    { id:'telemoveis', name:'Telemóveis', aliases:['telemovel','smartphone','telefone','mobile'], filters:['Marca','Memória','Ecrã','Bateria'] },
    { id:'tablets', name:'Tablets', aliases:['tablet','ipad'], filters:['Marca','Ecrã','Memória'] },
    { id:'smartwatches', name:'Smartwatches', aliases:['relogio inteligente','smartwatch','wearable'], filters:['Marca','Autonomia','Ecrã'] },
    { id:'audio', name:'Áudio e auscultadores', aliases:['auscultador','headphone','auricular','audio','earbuds'], filters:['Marca','Autonomia','Tipo'] }
  ]},
  { id:'informatica', name:'Informática', icon:'💻', children:[
    { id:'portateis', name:'Portáteis', aliases:['portatil','laptop','notebook','computador'], filters:['Marca','Memória','Processador','Ecrã'] },
    { id:'monitores', name:'Monitores', aliases:['monitor','display'], filters:['Marca','Ecrã','Resolução'] }
  ]},
  { id:'casa', name:'Casa e cozinha', icon:'🏡', children:[
    { id:'fritadeiras', name:'Fritadeiras sem óleo', aliases:['air fryer','airfryer','fritadeira','freidora'], filters:['Marca','Capacidade','Potência'] },
    { id:'aspiradores', name:'Robôs aspiradores', aliases:['robo aspirador','aspirador robot','aspirador','robot vacuum'], filters:['Marca','Autonomia','Navegação'] }
  ]},
  { id:'beleza', name:'Beleza e cuidados', icon:'✨', children:[
    { id:'cuidados-pessoais', name:'Cuidados pessoais', aliases:['aparador','secador','barbear','beleza','cuidado pessoal'], filters:['Marca','Autonomia','Potência'] }
  ]},
  { id:'bricolage', name:'Bricolage e jardim', icon:'🛠️', children:[
    { id:'ferramentas', name:'Ferramentas', aliases:['ferramenta','berbequim','furadeira','jardim'], filters:['Marca','Potência','Tipo'] }
  ]},
  { id:'desporto', name:'Desporto e lazer', icon:'🚴', children:[
    { id:'desporto-acessorios', name:'Equipamento desportivo', aliases:['desporto','fitness','bicicleta','campismo'], filters:['Marca','Tipo','Tamanho'] }
  ]}
]);
export const LEAVES = TAXONOMY.flatMap(parent => parent.children.map(leaf => ({...leaf,parentId:parent.id,parentName:parent.name,icon:parent.icon})));
export const LEAF_BY_ID = new Map(LEAVES.map(c=>[c.id,c]));
export const PARENT_BY_ID = new Map(TAXONOMY.map(c=>[c.id,c]));
export function fold(value='') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-PT').trim();
}
export function categoryFor(product) {
  const raw=fold([product.category,product.group,product.title].filter(Boolean).join(' '));
  for(const leaf of LEAVES) if(raw.includes(leaf.id) || leaf.aliases.some(x=>raw.includes(fold(x)))) return leaf.id;
  return 'outros';
}
export function categoryDetails(id) {
  return LEAF_BY_ID.get(id) || {id:'outros',name:'Outros produtos',parentId:'outros',parentName:'Outros',icon:'📦',filters:['Marca']};
}
export function categoryTree(counts={}) {
  return TAXONOMY.map(parent=>{
    const children=parent.children.map(leaf=>({id:leaf.id,name:leaf.name,count:counts[leaf.id]||0,filters:leaf.filters}));
    return {id:parent.id,name:parent.name,icon:parent.icon,count:children.reduce((n,c)=>n+c.count,0),children};
  }).filter(parent=>parent.count>0);
}
