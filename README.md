# Multiverse D616 — Charactermancer (Site)

**Acesse o site:** https://rodrigosinistro.github.io/multiverse-d616-charactermancer-site/

Versão atual: **v0.0.2**

Este repositório é um **site estático** (pronto para **GitHub Pages**) que permite montar um personagem do **Marvel Multiverse (D616)** e **gerar um PDF** da ficha **usando o template embutido**.

- ✅ Sem build / sem Node / sem dependências
- ✅ Funciona em **GitHub Pages** e também localmente
- ✅ Dados (Origins, Occupations, Traits, Tags, Powers) **embutidos em JSON** dentro do repositório
- ✅ Template do PDF embutido: `assets/pdf-templates/M616 Character Sheet - Alt Red.pdf`

## Como usar

1. Abra o site.
2. Preencha as etapas (Identidade, Valores, Abilities, Occupation/Origin, Traits, Tags, Powers).
3. Clique em **Gerar PDF (Imprimir)**.
4. Na janela que abrir, use **Imprimir → Salvar como PDF**.

> **Observação importante**
>
> O “PDF gerado” é feito via **página de impressão** (imagem do template + texto posicionado por coordenadas). Isso funciona muito bem para gerar um PDF final, mas não edita o formulário interno do PDF.

## Rodar localmente

Por segurança, alguns navegadores bloqueiam `fetch()` quando você abre `index.html` direto do disco. Use um servidor simples:

```bash
# Python 3
python -m http.server 8080
```

Depois acesse:

- `http://localhost:8080/`

> Dica: execute o comando dentro da pasta do repositório (onde está o `index.html`).

## Resetar e começar do zero

O site salva automaticamente o progresso no seu navegador (LocalStorage), então um refresh pode manter os dados.

Você tem 2 formas de limpar tudo:

1. Clique em **Resetar** (barra superior).
2. Acesse a URL com `?reset=1` (ou `?clear=1`), por exemplo:
   - `https://rodrigosinistro.github.io/multiverse-d616-charactermancer-site/?reset=1`

## Publicar no GitHub Pages

1. Suba este repositório para o GitHub.
2. Vá em **Settings → Pages**.
3. Em **Build and deployment**, selecione:
   - **Source:** Deploy from a branch
   - **Branch:** `main` / `/ (root)`

## Arquivos importantes

- `index.html` — entrada do site
- `js/app.js` — lógica do charactermancer
- `assets/template.png` — render da ficha (base para impressão)
- `assets/pdf-field-map.json` — mapa de campos (coordenadas)
- `assets/pdf-templates/` — templates PDF embutidos
- `data/` — dados de Origins/Occupations/Traits/Tags/Powers

## Dados e template

Os dados foram trazidos do seu repositório do charactermancer (packs exportados em JSON) e ficam em `data/`.

O template da ficha foi incluído neste repo (o arquivo é público e foi fornecido por você).

## Licença

MIT — veja `LICENSE`.
