# Plano de catálogo, pesquisa e reutilização — Site-comparador

Data: 16/11/2026. Estado: proposta arquitetural e fotografia auditada do código. **Não confundir com funcionalidades implantadas.**

## 1. Resumo honesto: origem da base

A versão publicada de demonstração em `https://comparador-teste.duckdns.org/` foi desenvolvida como código próprio, simples, em `public/index.html`, `public/styles.css`, `public/app.js`, `server.mjs` e `src/*`. Não foi clonada de um comparador de produção nem utiliza ainda uma base de dados persistente ou um motor de pesquisa externo. Atualmente há 15 produtos fictícios por fonte, em três categorias, carregados de `data/demo-*.json`.

O estudo de soluções externas foi utilizado apenas para **selecionar componentes candidatos**:
- [Zarenk/product-matcher](https://github.com/Zarenk/product-matcher) (MIT, confirmado): biblioteca TypeScript de normalização/comparação de modelos (EAN/UPC/ASIN/MPN, marca, especificações e correspondência aproximada); **não integrada**.
- [Medusa Next.js starter](https://github.com/medusajs/nextjs-starter-medusa): o upstream marca o starter **descontinuado**. O sucessor [Medusa DTC starter](https://github.com/medusajs/dtc-starter) é uma plataforma de comércio com carrinho, pagamento e contas, **que não precisamos**; não instalar como backend do comparador sem nova avaliação.
- [Open Icecat](https://icecat.com/) para fichas técnicas: **candidato**, sujeito a contrato/licença; não ligado.
- [KuantoKusta](https://www.kuantokusta.pt/) para padrões de experiência: referência, nunca fonte de código ou dados.
- Foram avaliados outros agregadores e plataformas genéricas, mas nenhuma solução completa foi certificada para Amazon.es via Awin–PartnerBoost e consumidores portugueses.

**Decisão:** aproveitar a base demonstrativa sem a confundir com a arquitetura de escala. Reutilizar bibliotecas auditadas para tarefas específicas; evitar instalar um ecommerce completo apenas para remover checkout depois.

## 2. Objetivo de produto

- Público: Portugal, português de Portugal, euros e condições de entrega relevantes para Portugal.
- Sem conta de utilizador no comparador; comprar sempre no site do vendedor.
- **Plano A:** Amazon.es via Awin–PartnerBoost, **condicionado** a confirmação comercial de atribuição de comissão e ao acesso ao catálogo para Portugal.
- **Plano B:** feeds de outros anunciantes Awin aprovados. Uma interface única: não expor 'Plano A/Plano B' como escolha comercial para o consumidor final.
- Dois casos distintos:
  1. **Comparação de modelos concorrentes:** apresentar 4–5 produtos diferentes da mesma categoria, com especificações e preços.
  2. **Comparação de ofertas do mesmo modelo:** reunir várias ofertas sob um produto só quando a fonte contratada fornece dados suficientes; não supor que a Amazon expõe todas as ofertas de terceiros.
- Nenhuma recomendação ou classificação deve priorizar silenciosamente a maior comissão.

## 3. Caminho de entrada de produtos — arquitetura pretendida

```text
Feeds/autorização Amazon–PartnerBoost ou Awin
        |
        v
Importadores independentes e paginados (jobs controlados)
        |
        v
Área de staging/draft (raw feed, proveniência, data/hora, erros)
        |
        v
Normalização (moeda, taxonomia, EAN/GTIN, ASIN, MPN, marca, variante)
        |
        v
Matching e agrupamento de SKUs (biblioteca product-matcher após ensaio)
        |
        v
Validação: autorização, link rastreado, stock, entrega PT, regras de imagens/preço
        |
        v
Catálogo canónico + ofertas separadas + índice de pesquisa
        |
        v
Pesquisa pública, categoria, filtros, ficha e comparação de 2–5 produtos
        |
        v
Redirecionamento afiliado conforme programa, checkout no vendedor
```

**Estado atual:** scripts PartnerBoost e CSV Awin importam para `data/draft-*.json`; uma aprovação através de CSV pode gerar `data/active-*.json`. Não existem tarefas periódicas nem credenciais autorizadas neste projeto. O catálogo fictício é só demonstração.

## 4. Modelo de dados pretendido

| Entidade | Responsabilidade |
| --- | --- |
| `sources` | Nome do programa, mercado, conta, política, estado de autorização |
| `merchants` | Loja/vendedor e condições conhecidas |
| `categories` | Hierarquia PT estável, slug, ordem, filtros por tipo |
| `brands` | Marcas canonizadas |
| `products` | Identidade principal, marca, modelo, imagens autorizadas, especificações |
| `product_variants` | EAN/GTIN/ASIN/MPN, cor, capacidade, tamanho; não fundir variantes |
| `offers` | Vendedor/fonte/variante, preço, portes quando disponíveis, stock, tracking aprovado, instante de atualização |
| `comparison_groups` | 4–5 alternativas concorrentes com critérios explícitos e curadoria |
| `import_runs` | Execução, total de entradas, rejeições, erros, última sincronização |
| `click_events` | Métricas agregadas internas de saída, sem prometer prova de venda |
| `price_history` | Histórico apenas quando permitido pelo contrato/fonte |

Para um primeiro catálogo de volume moderado, **avaliar SQLite com FTS5 dentro da própria pasta do projeto** (evita instalar um motor global). Dimensionar e ensaiar com amostras grandes reais antes de decidir PostgreSQL/serviço de pesquisa externo. Não está instalado nem selecionado definitivamente.

## 5. Categorias para o público português

Taxonomia controlada no nosso sistema, **não** usar diretamente centenas de etiquetas heterogéneas dos feeds. Exemplo inicial, sujeito à disponibilidade de produtos elegíveis:

- Tecnologia: Telemóveis, tablets, smartwatches, áudio, acessórios.
- Casa e cozinha: Fritadeiras sem óleo, robôs aspiradores, pequenos eletrodomésticos.
- Beleza e cuidados pessoais: Aparadores, máquinas de barbear, secadores.
- Bricolage e jardim: Ferramentas, limpeza, jardim.
- Desporto e lazer: Equipamentos e acessórios.
- Informática: Portáteis, monitores, componentes.

Hierarquia do tipo `Casa e cozinha > Pequenos eletrodomésticos > Fritadeiras sem óleo`. Publicar apenas categorias com produtos elegíveis verificados; nomes, slugs, taxonomia e filtros estão por implementar.

## 6. Pesquisa: experiência do utilizador

**Hoje:** `public/app.js` recebe todos os itens de `/api/catalog?source=amazon|awin`, filtra `title/brand/group/merchant/specs` por texto parcial no navegador; categorias inferidas do JSON; preço/nome para ordenar. Funciona com 15 exemplos, **não é pesquisa indexada escalável**.

**Versão pretendida:**
1. Utilizador escreve 'fritadeira sem óleo 5 litros' ou escolhe categoria.
2. API `GET /api/search?q=...&category=...&filters=...&page=...` devolve resultados paginados, total e facetas.
3. Indexação PT/ES e sinónimos ('air fryer', 'fritadeira sem óleo'), correspondência de marcas/modelos e filtros adequados à categoria.
4. Lista de produtos reais relevantes (uma ficha por modelo/variante coerente), fotografia de fonte licenciada, preço e atualização.
5. Utilizador seleciona até 5 modelos concorrentes, vê capacidade, potência, autonomia, dimensões e outros atributos pertinentes.
6. Ao clicar numa oferta validada é encaminhado para a loja. Sem link aprovado, **não** se mostra botão ativo.
7. Conteúdo SEO por categoria/ficha só quando houver dados verdadeiros, qualidade editorial e requisitos legais; demo permanece `noindex`.

**Ordenação:** relevância, preço elegível (quando verificável), marca ou características; preço total com envio só quando o envio for conhecido. Nunca rotular com 'melhor preço' sem dados comparáveis e atualizados.

## 7. Organização de código proposta (não instalada ainda)

```text
Site-comparador/
  docs/                   # decisões, fontes, provas, regras
  public/                 # frontend e assets licenciados
  src/
    api/                  # search, categories, products, compare, click
    catalog/              # modelo canónico, variantes, matching
    providers/            # amazon-partnerboost, awin-feed
    taxonomy/             # hierarquia e atributos por categoria
    search/               # indice e filtros paginados
    approval/             # validações para publicação
  data/                   # base SQLite privada, import drafts, logs (fora do Git)
  tests/                  # testes unitários, integração e navegador
  scripts/                # importar, reconciliar, validar e sincronizar
  .github/workflows/      # CI e verificações, sem segredos
```

Projeto isolado: repositório `martaxi-boss/Site-comparador`; pasta VPS `/srv/projects/Site-comparador/`. Não adicionar dependências globais, nem reutilizar dependências/pastas de outros projetos. A configuração de Nginx/systemd é específica deste projeto.

## 8. Ordem segura de implementação

1. Congelar versão demo e conservar prova de funcionamento; aprovar decisões de catálogo/categorias.
2. Auditar/adotar **componentes prontos** úteis, sobretudo `product-matcher` (MIT), verificando licença, testes, limites com variantes e integração; sem importar um backend de compras completo.
3. Implementar **catálogo canónico, variantes, taxonomia, base de dados e pesquisa indexada** antes de importar milhares de registos.
4. Implementar importação paginada, deduplicação, sincronização e remoção por indisponibilidade; respetivos testes e revisão.
5. Criar interface profissional (home, categorias, busca, filtros, ficha, comparação e painel administrativo mínimo), preservando o mesmo conceito visual validado no teste.
6. Ligar **apenas fontes autorizadas**; testar links e comissão atribuída, entrega PT, preço/stock e condições contratuais.
7. Testar milhares de produtos, mobile/desktop, acessibilidade, busca de termos PT, SEO e desempenho; publicar apenas após as portas de qualidade.
8. Nunca promover dados fictícios para produção. O ambiente de teste permanece noindex.

## 9. Critérios de aceitação antes de afirmar 'comparador profissional pronto'

- Pesquisa real indexada, paginada e mensurável sem enviar o catálogo inteiro ao navegador.
- Categorias e filtros consistentes mesmo quando diferentes fornecedores utilizam taxonomias diferentes.
- Modelos/variantes não misturados (EAN, MPN, ASIN, capacidade, cor).
- 2–5 produtos concorrentes comparados com critérios ajustados à categoria.
- Nenhum botão de compra ativa sem autorização, link rastreado, disponibilidade e entrega PT verificadas.
- Publicação atómica dos feeds com rollback; atualização e expiração de ofertas documentadas.
- Monitorização de importações/erros, clicks internos e auditoria editorial.
- CI, capturas browser reais e saúde VPS; site comercial com políticas e marca finais.

**NOTA:** este documento é uma especificação, não uma implantação das funcionalidades acima. O código em `main` e as Actions representam o estado efetivo.
