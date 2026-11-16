import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { normalizeProduct, validSource } from './catalog.mjs';
import { fold, categoryFor, categoryDetails, categoryTree, LEAF_BY_ID, PARENT_BY_ID } from './taxonomy.mjs';

// Node 22 SQLite/FTS5: sem serviço externo, sem descarregar todo o catálogo para o navegador.
// Um índice isolado por processo é reconstruído dos ficheiros aprovados a cada arranque.
// O armazenamento persistente de ofertas reais continua a ser uma etapa de produção.
const MAX_QUERY_LENGTH = 110;
export function tokenizeQuery(value) {
  const tokens=fold(String(value||'').slice(0,MAX_QUERY_LENGTH)).match(/[\p{L}\p{N}]+/gu)||[];
  return tokens.filter(t=>t.length>1).slice(0,10);
}
function ftsExpression(value) {
  return tokenizeQuery(value).map(t=>'"'+t.replace(/"/g,'')+'"*').join(' AND ');
}
const SORTS=Object.freeze({
  recommended:"CASE e.category WHEN 'telemoveis' THEN 1 WHEN 'fritadeiras' THEN 2 WHEN 'smartwatches' THEN 3 WHEN 'aspiradores' THEN 4 WHEN 'audio' THEN 5 WHEN 'portateis' THEN 6 WHEN 'tablets' THEN 7 WHEN 'cuidados-pessoais' THEN 8 WHEN 'monitores' THEN 9 WHEN 'ferramentas' THEN 10 ELSE 11 END, e.price ASC, e.title ASC",
  'price-asc':'(e.price IS NULL) ASC, e.price ASC, e.title ASC',
  'price-desc':'(e.price IS NULL) ASC, e.price DESC, e.title ASC',
  name:'e.title COLLATE NOCASE ASC',
  newest:'e.updated_at DESC, e.title ASC'
});
export class CatalogSearch {
  constructor(){
    this.db=new DatabaseSync(':memory:');
    this.db.exec("PRAGMA foreign_keys=ON; CREATE TABLE entries (id TEXT PRIMARY KEY, source TEXT NOT NULL, category TEXT NOT NULL, parent TEXT NOT NULL, title TEXT NOT NULL, brand TEXT NOT NULL, price REAL, updated_at TEXT, payload TEXT NOT NULL); CREATE INDEX entries_source_category_price ON entries(source,category,price); CREATE INDEX entries_source_parent ON entries(source,parent); CREATE VIRTUAL TABLE docs USING fts5(id UNINDEXED, terms, tokenize='unicode61 remove_diacritics 2');");
    this.mode={amazon:'demo',awin:'demo'};
    this.count={amazon:0,awin:0};
  }
  async load(root){
    for(const source of ['amazon','awin']){
      let raw,mode;
      try{raw=await readFile(resolve(root,'data/active-'+source+'.json'),'utf8');mode='live';}
      catch(e){if(e.code!=='ENOENT') throw e;raw=await readFile(resolve(root,'data/demo-'+source+'.json'),'utf8');mode='demo';}
      const values=JSON.parse(raw);
      if(!Array.isArray(values)) throw new Error('Catálogo deve ser uma lista: '+source);
      this.mode[source]=mode;
      const add=this.db.prepare('INSERT OR REPLACE INTO entries(id,source,category,parent,title,brand,price,updated_at,payload) VALUES(?,?,?,?,?,?,?,?,?)');
      const addDocs=this.db.prepare('INSERT INTO docs(id,terms) VALUES(?,?)');
      this.db.exec('BEGIN');
      try{
        let n=0;
        for(const rawItem of values){
          const p=normalizeProduct(rawItem,source,mode==='demo');
          if(!p.id||!p.title) continue;
          const leaf=categoryFor({...rawItem,title:p.title});
          const details=categoryDetails(leaf);
          const item={...p,category:details.name,categoryId:leaf,parentCategoryId:details.parentId,parentCategory:details.parentName};
          const id=source+':'+p.id;
          const terms=fold([p.title,p.brand,p.merchant,p.category,p.group,details.name,details.parentName,...(LEAF_BY_ID.get(leaf)?.aliases||[]),...Object.entries(p.specs).flatMap(([k,v])=>[k,String(v)])].join(' '));
          add.run(id,source,leaf,details.parentId,p.title,p.brand,p.price,p.updatedAt,JSON.stringify(item));
          addDocs.run(id,terms);
          n++;
        }
        this.db.exec('COMMIT');
        this.count[source]=n;
      }catch(e){this.db.exec('ROLLBACK');throw e;}
    }
    return this;
  }
  categoryCounts(source,q=''){
    const valid=validSource(source);
    const fts=ftsExpression(q);
    const where=['e.source=?'];const args=[valid];
    if(fts){where.push('e.id IN (SELECT id FROM docs WHERE docs MATCH ?)');args.push(fts);}
    const rows=this.db.prepare('SELECT e.category AS id, COUNT(*) AS count FROM entries e WHERE '+where.join(' AND ')+' GROUP BY e.category').all(...args);
    return Object.fromEntries(rows.map(r=>[r.id,r.count]));
  }
  categories(source,q=''){
    const src=validSource(source); const counts=this.categoryCounts(src,q);
    return {source:src,mode:this.mode[src],categories:categoryTree(counts),total:Object.values(counts).reduce((a,b)=>a+b,0)};
  }
  search(params={}){
    const source=validSource(params.source);
    const q=String(params.q||'').slice(0,MAX_QUERY_LENGTH);
    const match=ftsExpression(q);
    const page=Math.min(1000,Math.max(1,Number.parseInt(params.page,10)||1));
    const limit=Math.min(48,Math.max(1,Number.parseInt(params.limit,10)||12));
    const sort=Object.hasOwn(SORTS,params.sort)?params.sort:'recommended';
    const category=String(params.category||'');
    const brand=fold(params.brand||'').slice(0,60);
    const maxPrice=Number(params.maxPrice);
    const minPrice=Number(params.minPrice);
    const where=['e.source=?'];const args=[source];
    if(match){where.push('e.id IN (SELECT id FROM docs WHERE docs MATCH ?)');args.push(match);}
    if(LEAF_BY_ID.has(category)){where.push('e.category=?');args.push(category);}
    else if(PARENT_BY_ID.has(category)){where.push('e.parent=?');args.push(category);}
    if(brand){where.push('e.brand LIKE ? COLLATE NOCASE');args.push(String(params.brand).slice(0,60));}
    if(params.minPrice!==undefined&&params.minPrice!==''&&Number.isFinite(minPrice)&&minPrice>=0){where.push('e.price>=?');args.push(minPrice);}
    if(params.maxPrice!==undefined&&params.maxPrice!==''&&Number.isFinite(maxPrice)&&maxPrice>=0){where.push('e.price<=?');args.push(maxPrice);}
    const base=' FROM entries e WHERE '+where.join(' AND ');
    const total=this.db.prepare('SELECT COUNT(*) AS n'+base).get(...args).n;
    const offset=(page-1)*limit;
    const rows=this.db.prepare('SELECT e.payload'+base+' ORDER BY '+SORTS[sort]+' LIMIT ? OFFSET ?').all(...args,limit,offset);
    const items=rows.map(r=>JSON.parse(r.payload));
    const brands=[...new Set(items.map(x=>x.brand).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-PT'));
    return {source,mode:this.mode[source],query:q,category,sort,page,limit,total,pages:Math.max(1,Math.ceil(total/limit)),items,brands};
  }
  findById(source,id){
    const src=validSource(source);
    const row=this.db.prepare('SELECT payload FROM entries WHERE id=? AND source=?').get(src+':'+String(id||''),src);
    return row?JSON.parse(row.payload):null;
  }
  status(){return {mode:this.mode,count:this.count,index:'sqlite-fts5'};}
  close(){this.db.close();}
}
export async function createSearch(root){return new CatalogSearch().load(root);}
