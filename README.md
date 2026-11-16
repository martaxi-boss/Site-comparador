# Compara+PT — comparador independente para Portugal

**Estado: versão 0.2 de demonstração publicada e verificada em https://comparador-teste.duckdns.org/ (16/11/2026), sem comissões e sem ofertas reais.** A revisão de código efetivamente implantada é `b4b3904af07508c6f6eaed8ecc7c8cfece6ebb22`. O nome comercial e a marca são provisórios.

## O que existe na versão 0.2

- Pesquisa indexada no servidor através de **SQLite FTS5** (Node 22), com paginação, preço, ordem, nome e categorias hierárquicas; não carrega todo o catálogo no navegador.
- **6 famílias e 11 subcategorias** controladas pela nossa taxonomia portuguesa, com sinónimos comuns em inglês/espanhol.
- Interface responsiva: homepage, pesquisa principal, cartões, categorias, filtros, paginação, comparação de **2 a 5 modelos da mesma categoria**, navegação por teclado e aviso visível de demonstração.
- **Amazon/PartnerBoost (preferência)** e **Awin de lojas aderentes (reserva)** são adaptadores independentes. Ambos continuam bloqueados até aprovação comercial e de produtos.
- Dois ficheiros com **55 produtos fictícios por fonte**, sem links de compra; as características, preços e marcas não representam ofertas.
- Ferramenta de revisão de correspondências baseada em código **MIT** do [Zarenk/product-matcher](https://github.com/Zarenk/product-matcher), com atribuição em [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Uma sugestão de similaridade **não junta automaticamente** ASINs/SKUs/variantes.
- Código de layout e servidor próprio, inspirado em padrões estudados em projetos públicos. Não foram importados códigos GPL do PriceBuddy nem um motor inteiro de checkout de outro projeto.

## De onde vem a organização

| Referência | Reutilização efetiva |
|---|---|
| [Product Matcher (MIT)](https://github.com/Zarenk/product-matcher) | **Código adaptado** para normalização de títulos e identificadores, como apoio à revisão |
| [PriceBuddy (GPL-3.0)](https://github.com/jez500/pricebuddy) | Padrões de **organização** de produtos, lojas, preços e histórico, sem copiar código |
| [Medusa DTC Starter](https://github.com/medusajs/dtc-starter) | Estudo de navegação de catálogo, sem instalar carrinhos/pagamentos desnecessários |
| [Open Icecat](https://icecat.com/) | Potencial fonte futura de especificações, sem acesso integrado |
| [KuantoKusta](https://www.kuantokusta.pt/) | Referência de UX e comparação para Portugal, sem copiar conteúdos |

## Percurso de dados

```text
Awin / PartnerBoost autorizados (ainda não ligados)
   → importadores para rascunho
   → normalização + categorias pt-PT + revisão de variantes
   → aprovação de URL afiliada, stock, Portugal e condições
   → catálogo publicado de cada fonte (apenas depois de autorização)
   → índice SQLite FTS5
   → API paginada /api/search
   → pesquisa / ficha / comparação na interface
   → redirecionamento na loja parceira
```

**Sem confirmação comercial, tudo fica em demonstração.** O filtro técnico PartnerBoost ES não garante que um programa Awin remunera vendas em Amazon.es entregues em Portugal.

## Executar localmente

Requer Node.js 22+ com módulo nativo `node:sqlite` e FTS5. Não requer MySQL, Docker, chaves pagas ou instalação global de dependências.

```bash
npm test
npm start
```

Abrir `http://127.0.0.1:4173`. O ficheiro `data/demo-amazon.json` e `data/demo-awin.json` fornece exclusivamente exemplos fictícios.

Principais endpoints:
- `GET /api/categories?source=amazon`
- `GET /api/search?source=amazon&q=fritadeira&category=fritadeiras&sort=price-asc&page=1&limit=12`
- `GET /api/product?source=amazon&id=<id>`
- `GET /health`

O endpoint `/api/catalog` é mantido apenas por compatibilidade com o protótipo; a interface profissional usa pesquisa paginada.

## Importações e controlo de publicação

Plano A, sujeito a aprovação:
```bash
PARTNERBOOST_CHANNEL_TOKEN=*** npm run sync:amazon
```
A sincronização gera `data/draft-amazon.json`, nunca produtos publicáveis por si só. A API ES tem de ser usada somente com token e autorização recebidos; um link próprio da PartnerBoost não deve ser presumido como comissão Awin.

Plano B:
```bash
npm run import:awin -- /caminho/feed.csv
```
Isto cria `data/draft-awin.json`. A disponibilidade e os cabeçalhos reais dependem de cada feed autorizado.

Uma vez verificados produto a produto URL afiliada rastreável, aprovação do anunciante, stock e entrega PT, o operador pode criar o CSV de aprovação e executar:
```bash
npm run approve -- amazon
npm run approve -- awin
```
Os ficheiros `data/active-*.json` são **privados**, ignorados pelo Git, e devem existir apenas no ambiente aprovado. A aplicação lê os ficheiros no arranque; importações, sincronizações periódicas e publicação atómica ainda não são produção.

Para obter **sugestões de títulos semelhantes** sem fusão automática:
```bash
npm run audit:matching -- data/draft-amazon.json
```

## Estrutura

```text
Site-comparador/
  public/index.html         Interface portuguesa de demonstração
  public/pro.css            Design responsive
  public/pro.js             Pesquisa e comparação (API paginada)
  src/taxonomy.mjs          Hierarquia editorial de 11 subcategorias
  src/search-index.mjs      Índice SQLite FTS5, paginação e filtros
  src/catalog.mjs           Segurança de links e normalização de produtos
  src/vendor/               Código MIT adaptado e atribuído
  src/providers/            Adaptadores PartnerBoost e Awin
  scripts/                  Importação, revisão e aprovação
  data/demo-*.json          Exemplos fictícios para testes
  tests/                    Regressão, fonte, volume e segurança
  .github/workflows/        CI e navegador em PR
  docs/                    Arquitetura e decisões
```

## Segurança e implantação

- Repositório público e pasta isolada no servidor: `/srv/projects/Site-comparador/`.
- O runtime Node da aplicação deve permanecer privado no projeto e não reutilizar executáveis de outras aplicações.
- Ambiente de demonstração: `noindex`, `robots.txt` a bloquear robôs e **nenhum botão ativo de compra**.
- A versão 0.2 foi instalada por [GitHub Actions #43920629896](https://github.com/martaxi-boss/VPS/actions/runs/43920629896), com verificação real de HTTPS, endpoint de pesquisa, categorias, saúde e manutenção de Low Cost Europa e Sexshop. A versão anterior continua guardada para rollback. O teste de interface no PR foi [#43920194011](https://github.com/martaxi-boss/Site-comparador/actions/runs/43920194011).
- Testes de código e API no [workflow CI](.github/workflows/ci.yml). Testes de browser em PR no [workflow PR browser](.github/workflows/pr-browser-qa.yml).
- Nenhum token de parceiro ou dados de clientes entra em repositórios públicos.

## O que falta antes de vender

1. Contrato/credenciais autorizadas para Amazon.es via Awin–PartnerBoost em Portugal, ou lojas Awin alternativas.
2. Catálogo com produtos reais e validação de variantes, preços, comissões, entrega e disponibilidade.
3. Atualização de feeds e expiração de ofertas com regras de publicação/rollback.
4. Conteúdo editorial, SEO, política de privacidade, termos e identidade final.
5. Testes de conversão e atribuição de comissão, não confundíveis com cliques internos.

Veja também [PLANO_CATALOGO_PESQUISA.md](docs/PLANO_CATALOGO_PESQUISA.md).
