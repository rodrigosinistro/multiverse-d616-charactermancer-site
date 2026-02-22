# Changelog

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
