# Multiverse D616 — Charactermancer (Site)

Charactermancer **web (site estático)** para o **Multiverse D616**.

Ele replica o **fluxo** e o **layout** do charactermancer do Foundry (módulo `marvel-multiverse-charactermancer`) e, ao final, permite **exportar a ficha em PDF (M616)** usando a mesma base de templates/lógica do `sheet-export-m616`.

## Site (GitHub Pages)

- **URL esperada:** `https://rodrigosinistro.github.io/multiverse-d616-charactermancer-site/`
  - Se você publicar em outro usuário/repositório, a URL muda de acordo.

## Como usar

1. **Rank & Atributos**: escolha o Rank e distribua os atributos (M.A.R.V.E.L.).
   - Opcional: use **Importar JSON** para carregar um **Actor JSON do Foundry VTT (Multiverse D616)**.
2. **Ocupação** e **Origem**.
3. **Traços & Tags**.
   - **Traços bônus**: a quantidade de Traços extras selecionáveis é limitada pelo **Rank** (igual ao charactermancer do Foundry).
4. **Poderes** (respeitando pré-requisitos e limite do Rank).
5. **Revisão**: preencha a Biografia e clique em **Baixar PDF (M616)**.

## Publicar no GitHub Pages (sem build)

Este projeto é **100% estático**. Para publicar:

1. Faça commit/push na branch **`main`**.
2. No GitHub, vá em **Settings → Pages**.
3. Em **Build and deployment**:
   - **Source:** *Deploy from a branch*
   - **Branch:** `main`
   - **Folder:** `/ (root)`
4. Salve. O GitHub Pages servirá o `index.html` diretamente.

> Observação: existe um arquivo `.nojekyll` para evitar que o Pages trate o repositório como Jekyll.

## PDF (M616)

- **Templates embutidos:** `assets/templates/` (os PDFs-base ficam no repositório — não apontam para fora).
- **Libs via CDN:** atualmente o export usa `pdf-lib` e `FileSaver` via CDN (carregamento no navegador).
- **Campos editáveis:** a **página principal** é gerada mantendo os **campos do template editáveis** (não é *flatten*).
- **Páginas extras (descrições):** são renderizadas como texto e usam **1 coluna**.

> Observação: o preenchimento de Traços/Tags/Poderes segue o mesmo mapeamento de campos do módulo `sheet-export-m616`.

## JSON (Foundry VTT — Multiverse D616)

- **Importar JSON (Passo 1):** aceita o **JSON de Actor exportado pelo Foundry VTT** usando o sistema **Multiverse D616**.
- **Baixar JSON (Passo 6):** gera um **Actor JSON compatível** para você importar no Foundry (**Multiverse D616**).

> Dica: se você exportar um personagem do Foundry (Actor → Export Data) e importar aqui, o site tenta mapear automaticamente Rank, Atributos, Bio, Ocupação/Origem, Traços/Tags e Poderes.

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
3. Se possível, anexe um **JSON exportado** (do Foundry ou do site) para reproduzir o estado.
4. Informe navegador e sistema (ex.: Chrome/Edge + Windows).
