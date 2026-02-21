# Changelog

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
