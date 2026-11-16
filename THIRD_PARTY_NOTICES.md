# Avisos de terceiros — Site-comparador

## Zarenk/product-matcher (MIT)

Origem: https://github.com/Zarenk/product-matcher

Componentes adaptados: `src/text-normalizer.ts` e `src/identifier-matcher.ts`, convertidos para módulo JavaScript local em `src/vendor/product-matcher.mjs`. O projeto não copiou a biblioteca completa e não utiliza o módulo upstream `fuzzy-matcher.ts`: a aproximação de títulos usa pontuação Dice própria, apenas como sugestão para **revisão humana**, sem fusão automática de produtos ou variantes.

**MIT License — Copyright (c) 2026 JD Zárate**

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Outros projetos estudados

PriceBuddy (GPL-3.0), Deazl, Medusa e outras referências foram analisados para orientação arquitetural, sem copiar o seu código. A existência de código público não implica autorização de importação para qualquer licença.

## Limites

O componente `src/vendor/product-matcher.mjs` não garante equivalência de ASIN, EAN, variante, preço nem comissão. A aprovação comercial e compatibilidade com feeds reais continuam separadas.
