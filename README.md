# Comparador Afiliados PT — base Amazon-first com Plano B Awin

**Estado:** protótipo funcional local. **Não está publicado**, **não contém dados comerciais reais** e **não efetua vendas**. O nome visual "Compara+PT" é provisório, não corresponde a um domínio escolhido nem implica registo de marca.

## Objetivo

Preparar um comparador para o público português, que permita comparar **2 a 5 produtos concorrentes**, com **Amazon.es através do programa Awin–PartnerBoost** como preferência e **outras lojas da Awin** como plano alternativo. O comprador não cria conta neste comparador e conclui a compra no vendedor parceiro.

O produto é independente de quaisquer outros projetos, repositórios ou sites existentes. Não foram alteradas contas, repositórios, DNS, VPS ou lojas online.

## Testar localmente

Requer **Node.js >= 20**, sem dependências externas obrigatórias.

```bash
cd comparador-afiliados-pt
npm start
```

Abrir `http://127.0.0.1:4173`. O protótipo mostra **15 exemplos inteiramente fictícios por fonte**, em três categorias. As características, os preços e as lojas fictícias são apenas para verificar a interface. **Todos os links de compra estão desativados.**

Executar testes:

```bash
npm test
```

## Funcionalidades existentes

- Português de Portugal e preços formatados em euros.
- Origem de catálogo separada: **Plano A: Amazon.es**; **Plano B: lojas Awin**.
- Pesquisa, escolha de categoria, ordenação e seleção entre 2 e 5 produtos.
- Tabela comparativa com critérios próprios da categoria.
- Design responsivo para telemóvel e computador.
- API local `GET /api/catalog?source=amazon|awin`; resposta inclui `mode: demo|live`.
- Importação de produtos PartnerBoost ES para **rascunho**, nunca diretamente para publicação.
- Importação de feeds CSV Awin para **rascunho**, nunca diretamente para publicação.
- Aprovação manual por produto e validações mínimas de entrega e link.
- Apenas oferece botão de compra quando o produto tem `affiliateApproved=true`, `shippingPortugal=true`, `availability=in_stock`, preço em EUR e `affiliateUrl` HTTPS validado.

## Passos para o Plano A — Amazon via Awin

**Condição comercial não resolvida:** a documentação da PartnerBoost lista `ES` entre os mercados suportados pela API, mas as páginas públicas da Awin anunciam explicitamente os mercados UK e DACH. **Suporte da API não equivale a acesso ou comissão aprovada na Awin para Amazon.es nem a entregas em Portugal.**

1. Confirmar por escrito a cobertura **Awin Amazon Sellers Programme + Amazon.es + clientes/entregas em Portugal**.
2. Obter acesso ao programa na conta Awin, e um token de canal PartnerBoost **apenas se fornecido e permitido para este uso**.
3. Definir `PARTNERBOOST_CHANNEL_TOKEN` no ambiente do servidor. **Nunca colocá-lo em ficheiros públicos ou no navegador.**
4. Executar `npm run sync:amazon` (gera `data/draft-amazon.json`, não publicado).
5. Confirmar os **links rastreáveis efetivamente autorizados na Awin**, ASINs, comissões, disponibilidade e entrega para Portugal **por produto**. A API PartnerBoost pode devolver links próprios; **não se devem usar automaticamente como se fossem links de comissão Awin**.
6. Criar ficheiro `data/approval-amazon.csv`, seguindo o formato abaixo, com links e autorizações verificados:

```csv
id,affiliate_url,affiliate_approved,shipping_pt_verified,stock_verified
pb-PRODUCT_ID,https://www.awin1.com/EXEMPLO,yes,yes,yes
```

   **Atenção:** este URL é **um exemplo fictício**, não deve ser utilizado. Os valores `yes` têm de ser colocados apenas depois de confirmação real. A rotina valida a existência de URL HTTPS e as afirmações no CSV, mas **não substitui a verificação humana/comercial**.

7. Executar `npm run approve -- amazon`, que gera `data/active-amazon.json` com os produtos aprovados. Só então serão apresentados produtos reais e links de compra.

### Exemplo de pedido de catálogo (PartnerBoost)

A implementação em `src/providers/partnerboost.mjs` utiliza:

```http
POST https://app.partnerboost.com/api/datafeed/get_fba_products
Content-Type: application/json

{
  "token": "SEU_TOKEN_DE_CANAL",
  "country_code": "ES",
  "relationship": 1,
  "page_size": 50,
  "page": 1,
  "is_original_currency": 1,
  "return_link": 0,
  "filter_sexual_wellness": 1
}
```

`relationship=1` indica parceria na PartnerBoost, não garante comissão via Awin. O script ignora produtos fora de `ES` ou sem preço `EUR`. O campo `availability` também não comprova entrega para Portugal.

## Passos para o Plano B — Outras lojas Awin

1. Entrar na **Awin → Toolbox → Create-a-Feed** e exportar um feed CSV de anunciantes aprovados. **A chave de API de product feeds difere da chave Publisher API.**
2. Importar `npm run import:awin -- /caminho/do/feed.csv` para `data/draft-awin.json`.
3. Revisar os nomes das colunas do feed concreto; o mapeamento atual aceita campos frequentes como `product_name`, `search_price`, `merchant_name`, `aw_deep_link`, `brand_name`, `image_url`.
4. Confirmar individualmente anunciantes aprovados, links Awin corretos, stock e entrega em Portugal.
5. Criar `data/approval-awin.csv` com o mesmo cabeçalho e executar `npm run approve -- awin`.
6. O botão **Outras lojas / Plano B** passa a apresentar o catálogo publicado. O desenho e o comparador não mudam.

Se se quiser minimizar contas em vários vendedores, o Plano B pode limitar-se inicialmente a uma grande loja parceira com catálogo amplo. A escolha concreta depende dos programas e feeds aprovados, não está assumida neste protótipo.

## Limitações honestas / próximas etapas

- **Nenhuma parceria, comissão nem elegibilidade Amazon.es em Portugal foi certificada.**
- **Nenhum produto real foi carregado** e os produtos demonstrativos **não são ofertas reais**.
- O nome, domínio, logótipo, termos legais, políticas de privacidade e consentimentos ainda têm de ser decididos e personalizados.
- Não há painel administrativo, contas de utilizador, persistência de cliques, relatórios de vendas ou alertas de stock em produção.
- É necessário definir política de atualização dos feeds, cadência de sincronização, limpeza de ofertas expiradas, monitorização de links e conformidade com as regras de apresentação de preços e imagens dos programas escolhidos.
- O importador CSV é um ponto de partida; a Awin tem formatos de feeds diferentes (standard/enhanced) que exigirão adaptação aos cabeçalhos da parceria real.
- Os URLs de aprovação são inseridos manualmente após verificação; o código não consegue certificar por si só comissões, stock, entregas nem requisitos contratuais.
- A ordenação inicial é ilustrativa, e **não usa comissões como fator escondido**.
- Para produção faltam domínio, HTTPS, proxy inverso e implantação de acordo com as regras de organização do utilizador. **Não instalar globalmente nem misturar com outras pastas/projetos.**

## Estrutura

```text
comparador-afiliados-pt/
├── public/                   # interface, CSS e JS
├── src/catalog.mjs           # normalizacao e seguranca dos links
├── src/providers/
│   ├── partnerboost.mjs      # consulta oficial ES em modo de rascunho
│   └── awin.mjs              # mapeamento basico de CSV
├── scripts/
│   ├── sync-partnerboost.mjs # apenas apos obter token
│   ├── import-awin-csv.mjs   # importar feeds autorizados
│   └── approve.mjs           # publica apenas produtos verificados
├── data/demo-*.json         # exemplos ficticios
├── tests/                   # testes automatizados
└── server.mjs               # servidor Node.js sem dependencias
```

## Fontes técnicas oficiais (verificadas em novembro de 2026)

- [PartnerBoost API — Amazon](https://docs.partnerboost.com/developers/publisher-api/amazon/)
- [PartnerBoost — autenticacao Partner API](https://docs.partnerboost.com/developers/publisher-api/authentication/)
- [Awin Amazon Sellers Programme UK, ID 118045](https://ui.awin.com/merchant-profile/118045)
- [Awin Amazon Sellers Programme DACH, ID 126529](https://ui.awin.com/merchant-profile/126529)
- [Awin — acesso a Product Feeds](https://success.awin.com/s/article/How-can-I-access-a-Product-Feed?language=en_US)
- [Awin — FAQ de feeds e sites comparadores](https://success.awin.com/articles/en_US/Knowledge/Product-Data-Feed-FAQ)