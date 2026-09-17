# 03. Arquitetura e regras de negócio

Como o painel é construído, como os dados fluem da planilha até a tela e onde cada regra institucional está implementada.

## 1. Visão geral

```
Planilha-base (.xlsx)  ─┐
                        ├─► scripts/build_data.py ─► data/casos.js ─► index.html + assets/js/app.js
Planilha de revisão ────┘        (Python, sem                          (navegador, sem servidor)
                                  dependências)
```

Dois momentos distintos:

1. **Geração** (tempo de manutenção): a equipe roda o script quando a planilha muda. O script é a única fonte das regras de padronização. Produz um arquivo JavaScript com os dados já limpos, os apontamentos de qualidade e os totais de referência.
2. **Uso** (tempo de navegação): o navegador carrega a base e a interface calcula indicadores, filtra, ordena, exporta. Nenhuma requisição a servidor; tudo acontece localmente.

Essa separação mantém a interface simples (só lê e agrega) e concentra o conhecimento sobre a planilha em um lugar auditável.

## 2. Arquivos

| Arquivo | Responsabilidade | Tamanho |
|---|---|---|
| `index.html` | Marcação das 9 telas, modais, ordem de carregamento dos scripts | ~30 KB |
| `assets/css/styles.css` | Tokens de cor em `:root`, tema escuro, componentes, responsividade, impressão | ~25 KB |
| `assets/js/app.js` | Estado, filtros, gráficos, tabela, exportação, área interna, validador | ~54 KB |
| `data/casos.js` | `window.ODRF_DATA` com meta, casos, referência, qualidade e domínios | ~520 KB |
| `scripts/build_data.py` | Leitura, normalização, qualidade, referência, gravação | ~25 KB |
| `scripts/xlsx_reader.py` | Leitor mínimo de `.xlsx` (zip + XML), com strings compartilhadas e datas | ~3 KB |

Bibliotecas de terceiros, com versão fixa, copiadas para `assets/vendor/` (origem e licenças em `assets/vendor/VERSOES.md`):

- Chart.js 4.4.1: gráficos de barras e rosca.
- SlimSelect 2.8.2: seleções múltiplas com busca.
- SheetJS (xlsx) 0.18.5: exportação Excel e validação de planilha no navegador.

Empacotamento opcional em container: `Dockerfile` (etapa Python gera a base, etapa nginx serve o site), `docker-compose.yml` e `docker/nginx.conf`. Detalhes em `docs/06-execucao-com-docker.md`.

## 3. Fluxo dentro da interface

### 3.1 Estado

```
internal      modo interno ligado ou não
filtered      registros que passam pelos filtros ativos
page, pageSize, sortKey, sortDir     paginação e ordenação da tabela
ss            instâncias do SlimSelect por filtro
charts        instâncias do Chart.js por gráfico
```

### 3.2 Registros visíveis

`visiveis()` devolve todos os casos no modo interno e, no modo público, só os casos com `ano < anoCorrente`. Tudo o mais parte desse conjunto: opções dos filtros, KPIs da Visão geral, consulta.

### 3.3 Filtros

Vinte filtros declarados em `FILTROS`. Cada um é um `<select multiple>` gerenciado pelo SlimSelect. As opções vêm dos valores distintos presentes nos registros visíveis, ordenadas por uma ordem fixa quando faz sentido (desdobramento, local, âmbito, região) ou alfabeticamente com "Não se aplica" e "Não informado" no fim.

Cascata: mudar Região refaz as opções de Estado e Cidade; mudar Estado refaz Cidade. Seleções ainda válidas são preservadas.

Aplicação: qualquer mudança dispara `apply()`, que filtra, renderiza e atualiza o endereço (`#consulta?ano=2023|2024&local=Internet`). O endereço pode ser copiado e reabre a consulta com os mesmos filtros.

### 3.4 Renderização

- `renderOverview()`: KPIs, destaques calculados, evolução anual empilhada por local, roscas de local e desdobramento, listas de região (só estádios no Brasil, como nos relatórios), origem e âmbito, funil de responsabilização, sazonalidade.
- `renderQuery()`: KPIs do recorte, chips de filtros ativos, gráfico anual, lista de origem, rosca de desdobramento, tabela.
- `renderTable()`: ordena, pagina e desenha; no modo interno adiciona a coluna com aba e linha da planilha e o número de apontamentos.
- `openDetail(id)`: modal com todos os campos do caso; no modo interno, também os apontamentos e os campos sensíveis, se a base for do perfil interno.

Os gráficos leem as cores das variáveis CSS no momento de desenhar, por isso acompanham o tema.

### 3.5 Exportação

Um modal único para CSV, Excel e PDF, com escolha de colunas entre as 20 disponíveis.

- CSV: separador `;`, aspas, BOM UTF-8 (abre corretamente no Excel em português).
- Excel: aba Resultados e aba Filtros (com os filtros aplicados, data e fonte).
- PDF: monta uma zona de impressão com título, filtros, resumo automático, KPIs e gráficos convertidos em imagem, e a tabela (até 500 linhas), e chama a impressão do navegador.

O "Resumo automático" é gerado por regras a partir dos números do recorte. Não há modelo de linguagem envolvido, e o nome deixa isso claro.

### 3.6 Área interna

- **Administração**: totais da base, registros do ano corrente, apontamentos, registros com e sem pendência, data de geração.
- **Qualidade e conferência**: tabela comparando 51 totais calculados com a planilha de revisão; lista de apontamentos filtrável por tipo, com exportação em CSV.
- **Fonte de dados**: validador de planilha (abas anuais, colunas presentes e ausentes, linhas por aba, comparação com a base atual, números de caso ainda não carregados). Não altera nada; orienta a rodar o script.
- **Governança**: lista de regras com o estado real de cada uma.

## 4. Regras de negócio e onde vivem

| Regra | Implementação |
|---|---|
| Sem consulta, ranking ou comparação por clube | A base pública não contém as colunas Jogo, Quem punido ou absolvido e Decisão Justiça Desportiva. Não há filtro nem coluna de clube na interface |
| Ano corrente restrito à equipe | `publico = r => r.ano < new Date().getFullYear()` em `app.js`. Como não há autenticação, a proteção efetiva vem do fato de a planilha atual não ter registros do ano corrente. Ver seção 5 |
| Nomes e relatos fora do painel público | `COLUNAS_SENSIVEIS` em `build_data.py`; só entram com `--completo`, em arquivo separado e ignorado pelo git |
| Região, estado e gênero contados só em estádios nos relatórios | Lista de região da Visão geral e conferência usam `local === "Estádio"`; a consulta avançada mostra tudo, com o campo Local disponível como filtro |
| Registro sem informação não é "não julgado" | `desdobramento` distingue "Não julgado" (a planilha diz Não) de "Não informado" (em branco ou sem informação) |
| Dados só de fontes públicas | Cada caso pode ter `fonte`; o formulário de contato avisa que não é canal de denúncia |
| Planilha continua sendo a fonte da verdade | O painel nunca grava dados; o validador só lê; correções vão para a planilha e a base é regerada |

## 5. Segurança e privacidade

O que este protótipo garante:

- A base pública é gerada sem dados pessoais e sem identificação de clubes. Quem baixar `data/casos.js` recebe apenas o que já está em relatórios públicos, em forma agregável.
- Nenhuma credencial no código. O modo interno é uma alternância de interface, rotulada como simulação.
- Nada é enviado a servidores: filtros, exportações e validação de planilhas acontecem no navegador.

O que este protótipo não garante e precisa de decisão para produção:

- **Autenticação real.** Para abrir o ano corrente ou os textos internos fora do computador da equipe, a base interna deve ficar atrás de um servidor com login (por exemplo, uma área autenticada no portal que sirva `casos.interno.js` só a usuários logados). Não basta esconder um botão.
- **Base interna.** `data/casos.interno.js` contém nomes de vítimas e agressores. Deve ficar em máquinas da equipe, fora de repositórios e de serviços de compartilhamento. O `.gitignore` já a exclui do versionamento.
- **LGPD.** Dados de vítimas de discriminação racial são dados pessoais sensíveis. A publicação dos casos na imprensa não elimina a necessidade de finalidade e minimização; o desenho atual (agregados públicos, individualizados só internamente) segue esse princípio e deve ser confirmado pela assessoria jurídica do Observatório.

## 6. Acessibilidade

- Link "Ir para o conteúdo"; `main` com `tabindex="-1"` para receber o foco.
- Botões de navegação com `aria-current="page"`; menu móvel com `aria-expanded` e `aria-controls`.
- Todos os campos com `<label for>`; grupos de filtros em `<fieldset>` com `<legend>`.
- Contadores de resultado e chips com `aria-live="polite"`.
- Gráficos com `role="img"` e `aria-label` contendo os valores.
- Linhas da tabela acionáveis por Enter, com `aria-label`; modais fecham com Esc e devolvem o foco.
- Foco visível em todos os controles; `prefers-reduced-motion` respeitado; tema inicial segue `prefers-color-scheme`.
- Contraste da paleta categórica testado nos dois temas.

## 7. Desempenho

680 registros e 20 filtros são leves: filtrar e redesenhar leva poucos milissegundos. A base de 520 KB carrega em menos de um segundo em conexão comum e fica em cache. Para bases dez vezes maiores, a abordagem continua válida; acima disso, vale mover a agregação para um serviço.

## 8. Publicação

O painel é um site estático. Basta copiar `index.html`, `assets/` e `data/casos.js` para qualquer hospedagem de arquivos (o próprio portal, GitHub Pages, um bucket). Não publique `data/casos.interno.js`.

O painel já funciona sem internet, porque as bibliotecas estão em `assets/vendor/`. Para servir em rede local ou garantir o mesmo ambiente em qualquer máquina, use o container descrito em `docs/06-execucao-com-docker.md`.
