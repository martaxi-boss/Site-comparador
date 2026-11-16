import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { createSearch } from './src/search-index.mjs';

const root=dirname(fileURLToPath(import.meta.url));
const search=await createSearch(root);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8'};
const port=Number(process.env.PORT||4173);
const headers={
  'X-Content-Type-Options':'nosniff',
  'X-Robots-Tag':'noindex, nofollow, noarchive',
  'Referrer-Policy':'strict-origin-when-cross-origin',
  'Permissions-Policy':'geolocation=(), camera=(), microphone=()',
  'Content-Security-Policy':"default-src 'self'; img-src 'self' https: data:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; object-src 'none'; form-action 'self'; frame-ancestors 'none'",
  'Cache-Control':'no-store'
};
function json(res,status,data){
  res.writeHead(status,{...headers,'Content-Type':types['.json']});
  res.end(JSON.stringify(data));
}
const srv=createServer(async(request,response)=>{
  let parsed;
  try{parsed=new URL(request.url,'http://localhost');}catch{json(response,400,{error:'Pedido inválido'});return;}
  try{
    if(request.method!=='GET'){json(response,405,{error:'Método não permitido'});return;}
    const path=parsed.pathname;const opts=parsed.searchParams;
    const source=search.resolveSource(opts.get('source')||'auto');
    if(path==='/health'){json(response,200,{status:'ok',version:'0.2.0',catalog:search.status()});return;}
    if(path==='/api/categories'){
      json(response,200,search.categories(source,String(opts.get('q')||'')));
      return;
    }
    if(path==='/api/search'){
      const result=search.search({source,q:opts.get('q'),category:opts.get('category'),sort:opts.get('sort'),brand:opts.get('brand'),minPrice:opts.get('minPrice')??'',maxPrice:opts.get('maxPrice')??'',page:opts.get('page'),limit:opts.get('limit')});
      json(response,200,result);return;
    }
    if(path==='/api/product'){
      const product=search.findById(source,opts.get('id'));
      json(response,product?200:404,product?{source,product}:{error:'Produto não encontrado'});
      return;
    }
    // Endpoint legado reservado aos consumidores do protótipo; não usar para busca de volume.
    if(path==='/api/catalog'){
      const result=search.search({source,limit:48,page:1});
      json(response,200,{source,mode:result.mode,products:result.items});return;
    }
    const publicRoot=resolve(root,'public');
    const pathname=path==='/'?'/index.html':path;
    const target=resolve(publicRoot,'.'+pathname);
    if(target!==publicRoot&&!target.startsWith(publicRoot+sep)){json(response,403,{error:'Acesso negado'});return;}
    if((await stat(target)).isDirectory()){json(response,404,{error:'Não encontrado'});return;}
    const file=await readFile(target);
    response.writeHead(200,{...headers,'Content-Type':types[extname(target)]||'application/octet-stream'});
    response.end(file);
  }catch(e){
    if(e.code!=='ENOENT')console.error(e);
    json(response,e.code==='ENOENT'?404:500,{error:e.code==='ENOENT'?'Não encontrado':'Erro interno'});
  }
});
srv.listen(port,'127.0.0.1',()=>console.log('Site-comparador demo/index FTS5 em 127.0.0.1:'+port));
