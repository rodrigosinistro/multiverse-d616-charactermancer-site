# Changelog

## v0.0.21

- **Pré-requisitos dos poderes:** sincronização dos 25 cadastros corrigidos com o Multiverse D616 (nomes, Rank e pontuação).
- **Return Fire:** requisito corrigido para `Suppressive Fire, Rank 2`.
- **Poderes distintos:** corrigidas as entradas `Mirror Images`, `Venom Burst` e `Steal Power`, antes confundidas com outros nomes no mesmo Power Set.
- **Resize Object/Other:** seleção aceita `Grow 2` **ou** `Shrink 2`, respeitando Rank 3.
- **Validação rígida:** dependências inexistentes ou com grafia incorreta não são mais ignoradas; também verifica Tags, Traços e Origem.
- **Segurança na seleção:** pré-requisitos reavaliados no momento do clique; a busca não interfere mais na lista usada pela validação.
- **Cabeçalho:** versão do site atualizada para `v0.0.21`, com versão de referência `D616 v0.1.95`.
- **Cache:** adicionada versão à URL do JavaScript principal para facilitar a atualização do navegador.

## v0.0.20

- **Traços & Tags múltiplos:** o Charactermancer agora respeita `system.multiple = true` dos catálogos.
- **Seleção repetida:** itens múltiplos continuam com o botão disponível e podem ser selecionados várias vezes; itens comuns permanecem com seleção única.
- **Remoção correta:** o botão **×** remove somente uma ocorrência do Traço/Tag repetido.
- **Importação/Exportação Foundry:** repetições são preservadas no JSON; itens embutidos repetidos recebem `_id` único para evitar conflito no Foundry VTT.
- **PDF:** Traços/Tags repetidos aparecem com quantidade (ex.: `Linguist ×2`) sem duplicar as páginas de descrição.
- **Revisão:** repetições também são exibidas com contador para facilitar a conferência.
- **Cabeçalho:** corrigida a versão exibida para **v0.0.20** e sincronizado o sistema com **D616 v0.1.92**.

## v0.0.19

- **UI (Passo 5 — Poderes):** adicionado um ícone circular **i** ao lado do nome de cada Power.
- **Popup de Efeito:** clicar no ícone abre um popup com o conteúdo de `system.effect` do Power.
- **Rich text:** o Efeito é renderizado com sua formatação HTML (parágrafos, negrito, itálico, listas, links etc.), sem exibir as tags como texto.
- **Usabilidade:** o popup pode ser fechado pelo botão **×**, clicando fora ou pressionando **Esc**.

## v0.0.18

- **Secret Wars 2026:** site alinhado ao **Multiverse-D616 v0.1.76**.
- **Catálogos canônicos:** Origins, Traits, Tags, Powers, Occupations, Items e modelo de Actor agora são carregados diretamente de `rodrigosinistro/multiverse-D616/main/apps/charactermancer/data/`, com os JSONs locais mantidos como fallback.
- **Origins:** adicionados `Monstrous: Marvel Zombie` e `Weird Science: Power Cosmic`.
- **Mythic Origins:** `Mythic`, `Mythic: Asgardian` e `Mythic: Olympian` passam a conceder `Allspeak`.
- **Regras de Origin:** o site passa a respeitar `system.minimumRank`; `Weird Science: Power Cosmic` fica disponível somente em **Rank 5+**.
- **Traits:** adicionados `From Range`, `Hard to Kill` e `The Hunger`.
- **Tags:** adicionados `Ageless`, `Allspeak`, `Media Awareness`, `Signature Item` e `Worthy`.
- **Powers:** adicionados `Iconic Item`, `Power Cosmic`, `Sense Emotion`, `Sway Emotion`, `Control Emotion` e `Control Group Emotion`.
- **Shield Bearer:** dados de `Hurled Shield Bash`, `Hurled Shield Block`, `Hurled Shield Deflection` e `Rico-Shield` sincronizados com as regras atualizadas do sistema.
- **Foundry JSON:** Actor e itens embutidos exportados passam a ser normalizados para `_stats.systemId = multiverse-d616` e `_stats.systemVersion = 0.1.76`.
- **Elemento Plants:** permanece como opção de Elemental Control no sistema; não é um item independente do catálogo web.

## v0.0.17

- **Fix (Foundry Import / Power Sets):** corrigido o tratamento de Power Sets com espaço/hífen (ex.: **Animal Control**, **Super-Speed**).
  - A exportação para Foundry volta a **preservar o label original** em `item.system.powerSet` (ex.: `"Animal Control"`).
  - O site agora deriva a chave do bucket (`animalControl`, `superSpeed`, etc.) a partir do label e **garante** que `actor.system.powers[<bucket>]` exista como array antes de exportar.
  - Compatível com exports antigos que vinham sem separadores (ex.: `AnimalControl`).

## v0.0.16

- **Fix (Foundry Import):** corrigida a exportação de **Power Sets com espaço no nome** (ex.: **Animal Control**).
  - O sistema Multiverse-D616 deriva a chave do “bucket” do Power Set de forma sensível a espaços; ao exportar como `"Animal Control"`, a ficha podia tentar fazer `.push` em um bucket inexistente e quebrar (`Cannot read properties of undefined (reading 'push')`).
  - A exportação agora grava `system.powerSet` como **PascalCase sem espaços** (ex.: `AnimalControl`, `ElementalControl`, `MeleeWeapons`, etc.), garantindo que o bucket derivado seja `animalControl`, `elementalControl`, `meleeWeapons`, etc.

## v0.0.15

- **Dados do Foundry:** atualizados os arquivos da pasta `data/` com os JSONs exportados do Foundry (packs `items`, `occupations`, `origins`, `powers`, `traits`, `tags`).
  - Isso atualiza o catálogo usado pelo site (listas, pré-requisitos, efeitos e textos) para refletir seus dados mais recentes.

## v0.0.14

- **JSON (Foundry / Multiverse D616):** corrigida a exportação para evitar crash ao abrir a ficha no Foundry (`Cannot read properties of undefined (reading 'push')`).
  - `systemVersion` agora é **forçado** para **0.1.51** no Actor exportado (o modelo base vinha do `marvel-multiverse` 2.x e isso impedia migrações/defaults do D616).
  - Itens exportados agora têm `_stats.systemId = multiverse-d616` e `_stats.systemVersion = 0.1.51` (remove `exportSource`).
  - Exportação agora garante que `system.powers` contenha um **bucket (array vazio)** para **todo Power Set presente** em itens do tipo `power` (incluindo Power Sets “custom” vindos de JSON importado), prevenindo erro de `.push`.

## v0.0.13

- **JSON (Foundry / Multiverse D616):** corrigida a exportação para garantir que **todos os itens embutidos** (Powers/Traits/Tags concedidos por Origin/Occupation) sejam exportados com o **schema completo** do sistema (campos como `modifiers`, `quantity`, etc.), evitando erro ao abrir a ficha no Foundry (`Cannot read properties of undefined (reading 'push')`).

## v0.0.12

- **PDF (M616) — DAMAGE:** corrigida a regra do **Multiplicador de Dano** para bater com o sistema **Multiverse D616**: agora o multiplicador base é **igual ao Rank do personagem** e depois recebe os **modificadores** dos itens (ActiveEffects).
  - Ex.: Rank 3 + Mighty 1 (+1 Melee Multiplier) → **Melee Multiplier = 4**.

## v0.0.11

- **PDF (M616):** corrigida a preparação dos dados para **Non-Combat Checks** e **DAMAGE**, alinhando com o comportamento do sistema **Multiverse D616 no Foundry**:
  - **Non-Combat Checks** agora exporta o **modificador total** (Ability + bônus de itens/efeitos).
  - **DAMAGE** agora garante **multiplicador mínimo 1** e aplica corretamente os bônus de **ActiveEffects**.
  - Se algum efeito alterar o **Ability Score**, os totais derivados (Defense/Non-Combat) são mantidos em sincronia.

## v0.0.10

- **UI (Passo 5 — Poderes):** o campo **Buscar...** agora **mantém o texto digitado** entre re-renderizações e o filtro não “gruda” com o input vazio.
- **PDF (M616):** implementada a preparação de dados **no estilo Foundry** (aplicando ActiveEffects dos itens selecionados) para calcular corretamente:
  - **Defense Score**
  - **Non-Combat Checks**
  - **DAMAGE (Multipliers)**

## v0.0.9

- **UI:** a dica do rodapé agora é a mesma em **todas as telas** (não muda por etapa).
- **Regras (Passo 4 — Traços & Tags):** aplicado o limite de **Traços bônus = Rank** (com contador “Traços extras restantes”).
- **PDF (M616):** corrigido o mapeamento dos campos longos do template:
  - **Text38 = Traços**, **Text39 = Tags**, **Text40–42 = Poderes** (3 colunas), igual ao `sheet-export-m616`.
- **PDF (M616):** preenchidos também os campos de biografia do template (**Teams/Base/History/Personality**) quando existirem no Actor.

## v0.0.8

- **Fix crítico:** corrigido um erro de sintaxe em `js/mmc-site.js` que impedia o app de renderizar no GitHub Pages (página ficava em branco).

## v0.0.7

- **UI (Passo 1):** dica atualizada para: “Esse criador de personagem foi desenvolvido para ser utilizado no Foundry VTT e com o sistema Multiverse D616.”
- **UI (Passo 1):** botão **Importar JSON** agora fica **centralizado** entre **Voltar** e **Seguinte**.
- **UI (Passo 6):** removido o botão **Importar JSON** (importação agora é feita no passo 1).
- **JSON (Foundry):** **Importar JSON** agora aceita o **JSON de Actor exportado pelo Foundry VTT (sistema Multiverse D616)** e carrega Rank, Atributos, Bio, Ocupação/Origem, Traços/Tags e Poderes.
- **JSON (Foundry):** **Baixar JSON** agora exporta um **Actor JSON compatível com Foundry VTT / Multiverse D616** (padrão de export do Foundry).

## v0.0.6

- **UI (Revisão):** removido o botão duplicado **Baixar PDF (M616)** dentro do painel de exportação; o PDF continua disponível no botão principal do canto inferior direito.
- **UI (Revisão):** **Baixar JSON** e **Importar JSON** agora ficam **ao lado esquerdo** do botão **Baixar PDF (M616)** na barra inferior (direita).
- **UI (Revisão):** **Resetar Tudo** agora fica ao lado de **Voltar** na barra inferior (esquerda).
- **PDF:** exportação agora **mantém os campos do template editáveis** (sem `flatten`).
- **PDF (páginas extras):** descrições (pág. 2+) agora são geradas em **1 coluna**.

## v0.0.5

- **UI:** no passo **4 (Traços & Tags)**, os itens selecionados agora aparecem em painéis separados abaixo das listas (**Traços** embaixo de Traços, **Tags** embaixo de Tags).
- **UI:** no passo **5 (Poderes)**, os poderes selecionados agora aparecem abaixo das listas correspondentes (**Básicos** embaixo de Básicos, **Power Sets** embaixo de Power Sets).

## v0.0.4

- **Fix:** as listas (Rank, Ocupação, Origem, Traços/Tags e Poderes) agora **mantêm a posição de rolagem** ao selecionar itens e ao voltar para a etapa.
- **Melhoria:** memória de scroll mais robusta (salva durante a rolagem e restaura após re-renderização).

## v0.0.3

- Ajuste do fluxo final para **Baixar PDF (M616)** no último passo.
- Adicionados botões de **Baixar/Importar JSON** e **Resetar Tudo** na etapa de Revisão.
- Exportação de PDF via **CDN** (pdf-lib + FileSaver) e templates embutidos em `assets/templates/`.
- Sem persistência automática: ao **dar refresh**, o site volta do zero (use JSON se quiser salvar).

## v0.0.2

- Primeira versão publicada do site.
