// Reutiliza product-matcher (MIT, JD Zárate) para sugerir pares a rever.
// Nunca junta modelos automaticamente: a revisão de EAN/ASIN/MPN/variantes é obrigatória.
import { readFile } from 'node:fs/promises';
import { normalizeProductTitle, computeTitleSimilarity } from '../src/vendor/product-matcher.mjs';
import { fold } from '../src/taxonomy.mjs';
const path=process.argv[2];
if(!path){console.error('Utilização: npm run audit:matching -- data/draft-amazon.json');process.exitCode=2;}
else{
 const items=JSON.parse(await readFile(path,'utf8'));
 if(!Array.isArray(items))throw new Error('Esperada lista de produtos');
 const hints=[];
 const groups=new Map();
 for(const p of items){
  const brand=fold(p.brand||'');
  const key=brand+':'+fold(p.category||'');
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push({...p,titleNorm:normalizeProductTitle(p.title||'')});
 }
 for(const group of groups.values()){
  for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++){
   const a=group[i],b=group[j];if(!a.titleNorm||!b.titleNorm)continue;
   const score=computeTitleSimilarity(a.titleNorm,b.titleNorm);
   if(score>=0.85){
    const ids=[a.asin,a.ean,a.mpn].filter(Boolean).map(String);
    const idsOther=[b.asin,b.ean,b.mpn].filter(Boolean).map(String);
    const verifiedIdentifier=ids.length>0&&ids.some(id=>idsOther.includes(id));
    hints.push({a:a.id,b:b.id,title_a:a.title,title_b:b.title,score:Number(score.toFixed(3)),same_identifier:verifiedIdentifier,action:'REVIEW_ONLY'});
   }
  }
 }
 const result={source:path,items:items.length,suggestions:hints.length,auto_merged:0,hints:hints.slice(0,500)};
 process.stdout.write(JSON.stringify(result,null,2)+'\n');
}
