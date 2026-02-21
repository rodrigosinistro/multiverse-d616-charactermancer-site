# Multiverse D616 — Charactermancer (Site)

Charactermancer **web (site estático)** para o **Multiverse D616**.

Ele replica o **fluxo** e o **layout** do charactermancer do Foundry (módulo `marvel-multiverse-charactermancer`) e, ao final, permite **exportar a ficha em PDF (M616)** usando a mesma base de templates/lógica do `sheet-export-m616`.

## Site (GitHub Pages)

- **URL esperada:** `https://rodrigosinistro.github.io/multiverse-d616-charactermancer-site/`
  - Se você publicar em outro usuário/repositório, a URL muda de acordo.

## Como usar

1. **Rank & Atributos**: escolha o Rank e distribua os atributos (M.A.R.V.E.L.).
2. **Ocupação** e **Origem**.
3. **Traços & Tags**.
4. **Poderes** (respeitando pré-requisitos e limite do Rank).
5. **Revisão**: preencha a Biografia e clique em **Baixar PDF (M616)**.

### Exportar / Importar progresso

Na etapa **Revisão**:

- **Baixar JSON**: salva seu progresso.
- **Importar JSON**: restaura seu progresso.
- **Resetar Tudo**: volta ao estado inicial.

## Publicar no GitHub Pages (sem build)

Este projeto é **100% estático**. Para publicar:

1. Faça commit/push na branch **`main`**.
2. No GitHub, vá em **Settings → Pages**.
3. Em **Build and deployment**:
   - **Source:** *Deploy from a branch*
   - **Branch:** `main`
   - **Folder:** `/ (root)`
4. Salve. O GitHub Pages servirá o `index.html` diretamente.

> Observação: existe um arquivo `.nojekyll` para evitar que o Pages ignore pastas com `_` (padrão Jekyll).

## PDF (M616)

- **Templates embutidos:** `assets/templates/` (os PDFs-base ficam no repositório — não apontam para fora).
- **Libs via CDN:** atualmente o export usa `pdf-lib` e `FileSaver` via CDN (carregamento no navegador).

## Estrutura do projeto

- `index.html` — app (SPA simples)
- `styles/` — CSS do charactermancer
- `data/` — JSONs (ocupações, origens, traços, tags, poderes, modelo do ator)
- `assets/templates/` — templates do PDF (cores)
- `js/mmc-site.js` — charactermancer (web port)
- `js/m616-export.js` — exportação de PDF (web port)

## Como reportar bugs

Abra uma **Issue** no GitHub com:

1. **Passo a passo** para reproduzir.
2. **Print** (ou vídeo curto) do que aconteceu.
3. Se possível, anexe um **JSON exportado** na etapa *Revisão* (ajuda muito a reproduzir o estado).
4. Informe navegador e sistema (ex.: Chrome/Edge + Windows).
