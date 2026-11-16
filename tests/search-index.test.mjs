import test from 'node:test';
import assert from 'node:assert/strict';
import { CatalogSearch, createSearch, tokenizeQuery } from '../src/search-index.mjs';
import { categoryFor,categoryTree } from '../src/taxonomy.mjs';
import { mkdtemp,writeFile,mkdir,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const root=new URL('..',import.meta.url).pathname;

test('taxonomia PT normaliza categorias e variantes',()=>{
 assert.equal(categoryFor({category:'Smartwatches'}),'smartwatches');
 assert.equal(categoryFor({title:'Air Fryer 5L',category:'Cozinha'}),'fritadeiras');
 assert.equal(categoryFor({category:'Telemóveis'}),'telemoveis');
 assert.equal(categoryTree({fritadeiras:5,telemoveis:2}).filter(x=>x.count>0).length,2);
});
test('pesquisa segura retira sintaxe FTS não confiável',()=>{
 assert.deepEqual(tokenizeQuery('" OR 1=1; --'), ['or']);
 assert.equal(tokenizeQuery('fritadeira sem óleo')[0],'fritadeira');
});
test('FTS5 pagina e filtra 11 subcategorias sem mandar catálogo inteiro',async()=>{
 const db=await createSearch(root);
 try{
  const all=db.search({source:'amazon',limit:12});
  assert.equal(all.total,55);
  assert.equal(all.items.length,12);
  assert.equal(all.mode,'demo');
  assert.ok(all.items.every(x=>!x.canBuy&&x.affiliateUrl===null));
  assert.equal(db.categories('amazon').total,55);
  assert.equal(db.categories('awin').total,55);
  assert.equal(db.search({source:'amazon',category:'casa'}).total,10);
  assert.equal(db.search({source:'amazon',category:'fritadeiras'}).total,5);
  assert.equal(db.search({source:'amazon',q:'fritadeira sem oleo'}).total,5);
  assert.equal(db.search({source:'amazon',q:'air fryer'}).total,5);
  assert.equal(db.search({source:'amazon',q:'palavra-inexistente'}).total,0);
  assert.equal(db.search({source:'amazon',page:2,limit:12}).items.length,12);
  assert.equal(db.search({source:'amazon',page:5,limit:12}).items.length,7);
  assert.equal(db.search({source:'amazon',page:1,limit:5,sort:'price-asc'}).items.length,5);
  assert.equal(db.search({source:'amazon',page:1,limit:5,sort:'uma coluna maliciosa'}).sort,'recommended');
  assert.equal(db.search({source:'amazon',maxPrice:50}).items.every(p=>p.price<=50),true);
  assert.equal(db.findById('amazon','demo-amazon-fritadeiras-1').categoryId,'fritadeiras');
  assert.equal(db.findById('amazon','nao-existe'),null);
 }finally{db.close();}
});
test('1000+ itens por fonte: consulta e paginação real sem carregar o JSON todo na resposta',async()=>{
 const home=await mkdtemp(join(tmpdir(),'compara-fts-'));
 try{
  await mkdir(join(home,'data'));
  for(const source of ['amazon','awin']){
   const items=Array.from({length:1300},(_,i)=>({id:source+'-'+i,title:'Auscultadores Pro Modelo '+i,brand:'Marca Fictícia',category:'audio',price:30+i,currency:'EUR',availability:'unknown',affiliateApproved:false,shippingPortugal:false,affiliateUrl:null,specs:{Tipo:'Bluetooth',Cor:i%2?'Preto':'Branco'}}));
   await writeFile(join(home,'data','demo-'+source+'.json'),JSON.stringify(items));
  }
  const index=new CatalogSearch();await index.load(home);
  assert.equal(index.search({source:'amazon',q:'Auscultadores',limit:12}).total,1300);
  assert.equal(index.search({source:'amazon',q:'Auscultadores',page:3,limit:12}).items.length,12);
  assert.equal(index.categories('awin').total,1300);
  assert.equal(index.search({source:'amazon',q:'Bluetooth',limit:48}).items.length,48);
  index.close();
 }finally{await rm(home,{recursive:true,force:true});}
});
