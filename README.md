# Multiverse D616 — Charactermancer (Site)

Charactermancer **web (site estático)** para o **Multiverse D616**.

Ele replica o fluxo do Charactermancer do sistema Foundry e, ao final, permite exportar a ficha em **PDF (M616)** e **JSON compatível com Foundry VTT / Multiverse-D616**.

## Versão atual

- **Site:** v0.0.21
- **Sistema de referência:** Multiverse-D616 v0.1.95
- **Conteúdo:** atualizado com as regras e opções de criação relevantes do *Marvel Multiverse Role-Playing Game: Secret Wars Expansion* (2026).

## Novidade v0.0.21

- Catálogo de poderes e respectivos pré-requisitos corrigidos e sincronizados com o repositório principal D616.
- Correções: `Return Fire` requer `Suppressive Fire, Rank 2`; `Always Ready` requer `Do This All Day, Rank 3`.
- Entradas com nomes próprios corrigidos: `Mirror Images`, `Venom Burst`, `Steal Power`, `Extend Invisibility`.
- Validação exata de Rank, poderes, Tags, Traços e Origem; pré-requisitos desconhecidos bloqueiam a seleção.
- Pré-requisitos alternativos (`Grow 2 or Shrink 2`) são aceitos quando **uma** das opções é selecionada.
- A referência de poderes para a validação é sempre o catálogo inteiro, independentemente da busca da interface.
- Atualização da versão do site e do JavaScript para `v0.0.21`.

## Novidade v0.0.19

- No passo **Poderes**, cada Power agora possui um ícone circular **i** ao lado do nome.
- Ao clicar no ícone, o site abre um popup com o conteúdo de **Efeito (`system.effect`)**.
- O conteúdo é exibido com a formatação HTML correta (parágrafos, negrito, itálico, listas e links), sem mostrar as tags de marcação.
- O popup pode ser fechado pelo **×**, clicando fora dele ou pressionando **Esc**.
## Site (GitHub Pages)

- **URL:** `https://rodrigosinistro.github.io/multiverse-d616-charactermancer-site/`

## Como usar

1. **Rank & Atributos**: escolha o Rank e distribua os atributos M.A.R.V.E.L.
   - Opcional: use **Importar JSON** para carregar um Actor JSON do Foundry VTT.
2. **Ocupação** e **Origem**.
3. **Traços & Tags**.
   - Traços bônus são limitados pelo Rank.
4. **Poderes**, respeitando pré-requisitos e o limite do Rank.
5. **Revisão**: preencha a biografia e baixe PDF ou JSON.

## Secret Wars 2026

A v0.0.18 sincroniza o site com o Charactermancer do Multiverse-D616 v0.1.76. Entre as adições relevantes para criação de personagem estão:

- **Origins:** `Monstrous: Marvel Zombie` e `Weird Science: Power Cosmic`.
- **Mythic Origins:** passam a conceder `Allspeak`.
- **Traits:** `From Range`, `Hard to Kill` e `The Hunger`.
- **Tags:** `Ageless`, `Allspeak`, `Media Awareness`, `Signature Item` e `Worthy`.
- **Powers:** `Iconic Item`, `Power Cosmic`, `Sense Emotion`, `Sway Emotion`, `Control Emotion` e `Control Group Emotion`.
- **Shield Bearer:** os dados dos poderes de escudo arremessado acompanham as regras atualizadas do sistema.
- **Weird Science: Power Cosmic:** a origem respeita o requisito mínimo de **Rank 5** no site.

`Plants`, adicionado às opções de Elemental Control no sistema, é um valor de elemento do Power e não um Power/Trait/Tag independente do catálogo do Charactermancer web.

## Sincronização dos catálogos

A partir da v0.0.18, a fonte canônica dos catálogos do site é o próprio repositório do sistema:

`rodrigosinistro/multiverse-D616/main/apps/charactermancer/data/`

O site carrega dali, em tempo de execução:

- `actor-modelo.json`
- `items.json`
- `occupations.json`
- `origins.json`
- `traits.json`
- `tags.json`
- `powers.json`

Isso evita que o site e o sistema mantenham duas bases de regras divergentes. Os arquivos da pasta local `data/` continuam no repositório como **fallback** caso a fonte remota esteja temporariamente indisponível.

## PDF (M616)

- Templates em `assets/templates/`.
- Export via `pdf-lib` e `FileSaver`.
- A página principal mantém os campos editáveis.
- Páginas extras de descrições são renderizadas em uma coluna.

## JSON (Foundry VTT — Multiverse D616)

- **Importar JSON:** aceita Actor JSON exportado pelo Foundry usando Multiverse-D616.
- **Baixar JSON:** gera Actor JSON para importação no Foundry.
- A v0.0.18 normaliza `_stats.systemId` para `multiverse-d616` e `_stats.systemVersion` para **0.1.76** no Actor e em seus itens embutidos.
- Power Sets mantêm seus labels canônicos e o site garante os buckets correspondentes em `actor.system.powers`.

## Estrutura do projeto

- `index.html` — app estático e sincronização dos catálogos.
- `styles/` — estilos.
- `data/` — fallback local dos catálogos.
- `assets/templates/` — templates do PDF.
- `js/mmc-site.js` — Charactermancer web.
- `js/m616-export.js` — exportador PDF.
- `js/secret-wars-2026.js` — compatibilidade Secret Wars 2026, requisito mínimo de Origins e normalização da versão dos JSONs exportados.

## Publicar no GitHub Pages

O projeto não precisa de build. O GitHub Pages deve usar a branch `main`, pasta `/ (root)`. O arquivo `.nojekyll` impede processamento por Jekyll.

## Como reportar bugs

Abra uma Issue no GitHub contendo o passo a passo, print ou vídeo, navegador/sistema e, se possível, o JSON usado para reproduzir o problema.
