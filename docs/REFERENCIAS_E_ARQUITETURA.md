# Referências técnicas e arquitetura — comparador Portugal

Data de verificação: 16 de novembro de 2026. Documento de decisões; não constitui autorização comercial da Awin/Amazon.

## Premissa comercial

- **Plano A prioritário:** produtos vendidos em Amazon.es, apresentados ao público de Portugal, com links e comissões geridos pela Awin–PartnerBoost **só depois da aprovação comercial documentada para Amazon.es / consumidores em Portugal**.
- **Plano B:** feeds de comerciantes aprovados na Awin, reutilizando a mesma interface e normalizador de dados.
- Comprador pode comparar 2–5 produtos concorrentes sem conta no comparador; checkout exclusivamente no vendedor.
- No ambiente demonstrativo, **todos** os produtos, preços, marcas e comerciantes são fictícios e o botão de compra está inativo.

## Pesquisa de repositórios e referências

| Projeto / referência | Verificação | Decisão |
| --- | --- | --- |
| [Zarenk/product-matcher](https://github.com/Zarenk/product-matcher) | Código TypeScript com normalização EAN/UPC/ASIN/MPN, modelos e correspondência aproximada; licença MIT confirmada | **Candidato** a uma fase posterior para agrupar ofertas de um mesmo produto; ainda **não instalado nem copiado** |
| [Medusa Next.js Starter](https://github.com/medusajs/nextjs-starter-medusa) | Licença MIT; README upstream assinala projeto **descontinuado** e remete para `dtc-starter` | Não instalar; checkout, carrinho e contas são desnecessários para um comparador afiliado |
| [Open Icecat](https://icecat.com/) | Fonte de referência para fichas de características | Não integrar sem verificar condições de acesso, licenças e proveniência dos dados |
| [KuantoKusta](https://www.kuantokusta.pt/) | Referência de organização de categorias, filtragem e comparação para Portugal | Inspiração de UX, sem reutilizar código, logótipos ou conteúdo |
| [Movertix](https://www.movertix.com/) | Referência da pesquisa prévia para arquitetura de comparadores | Não foi copiado código deste site; avaliar funcionalidades específicas apenas com proveniência verificável |

**Código efetivamente usado:** desenvolvimento próprio a partir do protótipo da conversa do proprietário; apenas Node.js e APIs nativas no servidor. Nenhum código dos projetos acima foi copiado para esta versão.

## Arquitetura aplicada

```text
Visitante PT
  -> HTML/CSS/JS responsivo
  -> API local /api/catalog?source=amazon|awin
  -> adaptador de catálogo isolado por fonte
       -> Amazon / PartnerBoost ES (rascunho, sem autorização comercial)
       -> Awin outros anunciantes (rascunho)
  -> aprovação de cada oferta: link rastreado, stock, entrega PT, moeda, comissão autorizada
  -> publicação apenas após validações
  -> redirecionamento externo com rel=sponsored noopener noreferrer
```

- O motor de interface não depende da plataforma de afiliação. A substituição do Plano A por B não exige reescrever o frontend.
- Fichas de produto têm identidade e características estruturadas; diferença entre produtos concorrentes e comparação de preços do **mesmo** produto deve ser tratada explicitamente quando houver catálogos reais.
- Não misturar anúncios com SKU distinto (capacidade, memória, variantes) ao declarar comparações do mesmo produto.
- `relationship=1` e o mercado `ES` na PartnerBoost referem a própria API e **não certificam** comissão via Awin.
- Preços, classificações, imagens, envio e disponibilidade reais exigem fonte autorizada e atualização conforme regras do fornecedor.
- Não guardar tokens no frontend, GitHub público ou URLs; armazenar segredos apenas no ambiente privado do projeto.

## Segurança e isolamento

- Repositório: `martaxi-boss/Site-comparador` (público).
- Domínio de teste: `https://comparador-teste.duckdns.org` e `noindex` / `robots.txt` de demonstração.
- Pasta VPS dedicada: `/srv/projects/Site-comparador/`; executável Node 22 privado dentro do projeto.
- Serviço privado `site-comparador.service`, Nginx próprio em `site-comparador.conf`, porta interna 3422 e certificado Let's Encrypt específico.
- GitHub Actions testa builds e endpoints; a implantação na VPS está num workflow separado de `martaxi-boss/VPS`, não na ponte Ferrari.
- Alterações à fonte não são publicadas automaticamente no servidor sem prova de revisão.

## Evidência de qualidade

- Testes de catálogo, validação e endpoints: https://github.com/martaxi-boss/Site-comparador/actions/runs/43912719058
- Verificação DNS, saúde de outros serviços, porta e Nginx por SSH: https://github.com/martaxi-boss/VPS/actions/runs/43912955775
- Recuperação HTTPS verificada com pedidos reais: https://github.com/martaxi-boss/VPS/actions/runs/43913709106
- **Playwright no site público:** https://github.com/martaxi-boss/Site-comparador/actions/runs/43914181255 — capturas completas de telemóvel 390 px e desktop 1366 px, sem erros JavaScript, sem overflow horizontal, troca de fonte, pesquisa e ausência de links de compra em demonstração.

## Ainda pendente antes do lançamento comercial

1. Confirmação comercial escrita Awin–PartnerBoost de Amazon.es com compras/entregas em Portugal; alternativa com comerciantes Awin aprovados.
2. Acesso autorizado aos feeds, verificação e atualização regular de ofertas e identificação rigorosa de modelos.
3. Informações legais, privacidade, consentimentos e divulgações de afiliação; identidade e domínio definitivos.
4. Testes de compra atribuída e reconciliação de comissões com relatórios reais do programa.
5. Revisão editorial de informação, design final e SEO ao retirar `noindex` apenas após a plataforma estar pronta.
