# Multiverse D616 — Charactermancer (Site)

Charactermancer web (estático) para o **Multiverse D616**: você monta o personagem com a mesma lógica/fluxo do charactermancer do Foundry e, ao final, **baixa o PDF (M616)**.

- **Site (GitHub Pages):** abra o repositório publicado e acesse pela URL do Pages.
- **Exportação de PDF:** usa **pdf-lib** e **FileSaver** via **CDN** (carregamento sob demanda).
- **Templates do PDF:** ficam embutidos em `assets/templates/`.

## Como usar

1. Escolha **Rank** e distribua os **atributos (M.A.R.V.E.L.)**.
2. Selecione **Ocupação** e **Origem**.
3. Escolha **Traços** e **Tags**.
4. Selecione **Poderes** (respeitando pré-requisitos e limite do Rank).
5. Em **Revisão**, preencha a **Biografia** e clique em **Baixar PDF (M616)**.

## Exportação / Importação

Na etapa **Revisão**:
- **Baixar JSON**: salva seu progresso.
- **Importar JSON**: restaura seu progresso.
- **Resetar Tudo**: volta ao estado inicial.

## Estrutura

- `index.html` — página do app
- `styles/` — CSS do charactermancer
- `data/` — JSONs (ocupações, origens, traços, tags, poderes, modelo de ator)
- `assets/templates/` — PDFs-base (cores)
- `js/mmc-site.js` — lógica do charactermancer (web port)
- `js/m616-export.js` — exportação de PDF (web port)

## Observações

- Este projeto é um **site estático**: não precisa de build.
- Para publicar no GitHub Pages, basta habilitar Pages apontando para a branch/pasta raiz.

