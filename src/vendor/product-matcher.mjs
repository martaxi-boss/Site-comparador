/*
 * Adapted for JavaScript from Zarenk/product-matcher, src/text-normalizer.ts
 * and src/identifier-matcher.ts, MIT License, Copyright (c) 2026 JD Zárate.
 * See THIRD_PARTY_NOTICES.md. Removed TypeScript syntax and fuzzball dependency.
 * Similarity is a conservative token-Dice suggestion scorer, not upstream fuzzball.
 * No automatic merges.
 */
export const ABBREVIATION_MAP={
 r9:'Ryzen 9',r7:'Ryzen 7',r5:'Ryzen 5',r3:'Ryzen 3',
 i9:'Core i9',i7:'Core i7',i5:'Core i5',i3:'Core i3',
 '16g':'16GB','8g':'8GB','32g':'32GB','64g':'64GB',
 '4g':'4GB','12g':'12GB','24g':'24GB','128g':'128GB',
 '256g':'256GB','512g':'512GB','1t':'1TB','2t':'2TB',
 w10:'Windows 10',w11:'Windows 11',win10:'Windows 10',win11:'Windows 11',
 fhd:'Full HD',uhd:'Ultra HD',qhd:'QHD',bt:'Bluetooth',
 wifi6:'Wi-Fi 6',wifi6e:'Wi-Fi 6E',tb:'Thunderbolt',
 ssd:'SSD',hdd:'HDD',nvme:'NVMe'
};
const COMPOUND_TOKEN_PATTERNS=[
 [/\b(RTX|GTX|MX|GT|RX)(\d{3,4})\b/gi,'$1 $2'],
 [/\b(DDR[45])(\d+)\b/gi,'$1 $2'],
 [/\b([iI][3579])(\d{4,5}[A-Z]{0,3})\b/g,'$1 $2'],
 [/\b(Ryzen)(\d)(\d{4}[A-Z]{0,3})\b/gi,'$1 $2 $3']
];
const UNIT_PATTERNS=[
 [/(\d+)\s+(GB|TB|MB)\b/gi,'$1$2'],
 [/(\d+\.?\d*)\s*pulgadas\b/gi,'$1"'],
 [/(\d+\.?\d*)\s*pulg\b/gi,'$1"'],
 [/(\d+\.?\d*)p\b/gi,'$1"'],
 [/(\d+\.?\d*)\s*in\b/gi,'$1"'],
 [/(\d+\.?\d*)\s*['‘’′]{1,2}/g,'$1"']
];
const PRODUCT_STOP_WORDS=[
 'laptop','notebook','portatil','computadora','computador','ordenador',
 'gaming','gamer','nuevo','nueva','new','original','sellado','sealed',
 'garantia','warranty','oferta','promo','promocion','envio','gratis',
 'free','shipping','stock','disponible'
];
const escapeRegex=s=>s.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&');
export function normalizeProductTitle(title=''){
 let text=String(title).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 text=text.replace(/[|/\\,;()[\]\-]+/g,' ');
 for(const abbrev of Object.keys(ABBREVIATION_MAP).sort((a,b)=>b.length-a.length)){
  const re=new RegExp('\\b'+escapeRegex(abbrev)+'\\b','gi');
  text=text.replace(re,ABBREVIATION_MAP[abbrev]);
 }
 for(const [pattern,replacement] of COMPOUND_TOKEN_PATTERNS){pattern.lastIndex=0;text=text.replace(pattern,replacement);}
 for(const [pattern,replacement] of UNIT_PATTERNS){pattern.lastIndex=0;text=text.replace(pattern,replacement);}
 for(const word of PRODUCT_STOP_WORDS){
  const re=new RegExp('\\b'+escapeRegex(word)+'\\b','gi');text=text.replace(re,' ');
 }
 return text.replace(/\s+/g,' ').trim();
}
export function matchByIdentifier(identifiers,products=[]){
 if(!identifiers||Object.keys(identifiers).length===0)return null;
 for(const product of products){
  const other=product?.identifiers;
  if(!other||typeof other!=='object')continue;
  for(const key of ['upc','ean','asin','mpn']){
   const a=identifiers[key],b=other[key];
   if(typeof a==='string'&&typeof b==='string'&&a.trim()&&a.trim().toLowerCase()===b.trim().toLowerCase())return product;
  }
 }
 return null;
}
// The scoring below is our own token-Dice variant, not upstream fuzzball.
// Return value is a review hint only, never proof that two SKUs match.
export function computeTitleSimilarity(titleA,titleB){
 const a=new Set(normalizeProductTitle(titleA).split(/\s+/).filter(Boolean));
 const b=new Set(normalizeProductTitle(titleB).split(/\s+/).filter(Boolean));
 if(!a.size||!b.size)return 0;
 const shared=[...a].filter(t=>b.has(t)).length;
 return 2*shared/(a.size+b.size);
}
