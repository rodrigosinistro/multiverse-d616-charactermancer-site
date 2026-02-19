# Changelog

## v0.0.2

- **Fix:** campos de texto (Identidade e outros) agora aceitam digitação normal (antes o re-render por tecla derrubava o foco e parecia “1 letra só”).
- **Novo:** botão **Resetar** no topo para apagar dados locais e recomeçar.
- **Novo:** suporte a `?reset=1` / `?clear=1` na URL para iniciar limpo.
- README atualizado com o link do site e instruções de reset.

## v0.0.1

- Primeira versão do site estático do Charactermancer (D616).
- Dados embutidos: Origins, Occupations, Traits, Tags, Powers.
- Template PDF embutido + render para `assets/template.png`.
- Geração de PDF via impressão (layout por coordenadas).
- Import/Export de personagem em JSON.
