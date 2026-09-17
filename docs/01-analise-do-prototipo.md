# 01. Análise do protótipo e do que foi feito

Este documento registra o diagnóstico do protótipo encontrado no repositório em 17 de setembro de 2026, os problemas identificados nos dados e no código, e as decisões tomadas na reconstrução. Serve como memória do projeto e como base para a apresentação.

## 1. O que existia

Um único arquivo `index.html` com 288 KB, contendo:

- CSS embutido (cerca de 1.000 linhas) com paleta terrosa, tema escuro, responsividade e regras de impressão.
- Marcação de seis telas: Visão geral, Consulta avançada, Relatórios, Contato, Administração, Fonte de dados e Governança.
- Um array `mock` de 680 registros em uma única linha de 197 KB, gerado a partir da planilha em algum momento anterior.
- Lógica em JavaScript puro: filtros em cascata com SlimSelect, gráficos com Chart.js, exportação CSV/Excel/PDF, importação de planilhas com SheetJS e um login demonstrativo.

O README anterior descrevia o protótipo com precisão e já apontava a modularização e o desacoplamento dos dados como próximos passos.

## 2. Diagnóstico

### 2.1 Dados embutidos

O mock reproduzia a planilha, mas com defeitos herdados da conversão:

| Problema | Evidência no mock |
|---|---|
| Ano inválido | Um registro com `year: 12021` (vinha da data digitada como `02/012021`) e outro com `year: 2000` |
| Regiões sem padronização | `Centro-Oeste` e `Centro-oeste` como categorias distintas; `ND` e `Internet` misturados a regiões reais |
| Campos ricos ignorados | A planilha tem 28 colunas; o mock usava 12. Ficaram de fora: boletim de ocorrência, súmula, punição na justiça comum, julgamento e punição na justiça desportiva, órgão julgador, agressor identificado, país, espaço (origem da agressão) e data completa |
| Campo inventado | `discrimination: "Racismo"` fixo em todos os registros, sem correspondência na planilha |
| Desdobramento simplificado | `justice` derivado por regra que misturava justiça comum e desportiva e rotulava como "Não julgado" qualquer caso sem informação |

### 2.2 Interface e lógica

| Problema | Consequência |
|---|---|
| Gráfico de rosca em CSS estático (`conic-gradient` com 38%, 64%, 82%) e legenda fixa | O gráfico de desdobramentos da Visão geral nunca refletia os dados |
| KPIs de qualidade fixos no HTML (`3` campos incompletos, `96%` válidos, `4%` pendentes) | A área interna exibia números fictícios |
| Ano corrente fixo em `2025` e `2026` no código | Regra de privacidade quebraria a cada virada de ano |
| Variáveis CSS `--bg-alt` e `--border` usadas no modal de exportação, mas nunca definidas | Fundo e borda do modal caíam no valor inicial do navegador |
| Referência a `aiBtn`, elemento inexistente | Código morto |
| "Resumo da IA" | O texto era um modelo com frases prontas, não uma análise gerada; o nome induzia a erro |
| Credenciais de demonstração escritas no HTML e no JavaScript e exibidas no modal | Padrão a evitar mesmo em protótipo; passa a ideia de que existe autenticação |
| Importação de planilha somava registros aos já existentes e salvava em `localStorage` | Risco de duplicar a base ao importar a mesma planilha, sem forma de conferir |
| `Chart.js` sem versão fixa no CDN e dependência de internet para abrir | Uma atualização maior da biblioteca poderia quebrar os gráficos; sem rede, o painel não funcionava. Agora as bibliotecas estão em `assets/vendor/` com versão fixa |
| Tabela limitada a 100 linhas, sem paginação e sem ordenação | Consultas amplas ficavam truncadas silenciosamente |
| Rótulos `<label>` sem `for`, gráficos sem texto alternativo, sem indicação de foco | Acessibilidade abaixo do que o próprio README prometia |

### 2.3 O que estava bom e foi mantido

- Identidade visual: paleta, tipografia, cartões, hero, barra lateral escura.
- Estrutura de telas e a lógica de filtros em cascata (região, estado, cidade).
- Regras institucionais explícitas: sem clube, ano corrente protegido.
- Exportação em três formatos e impressão limpa.
- Responsividade, incluindo a tabela em formato de cartões no celular.

## 3. Análise das planilhas

### 3.1 `Banco de Dados Observatorio Racial Futebol -.xlsx`

- 11 abas anuais preenchidas (2014 a 2024) e uma aba 2025 vazia com cabeçalho deslocado (sem a coluna "Julgamento Justiça Desportiva").
- 680 registros no total, batendo exatamente com a linha "Revisão" da planilha de revisão.
- 28 colunas por aba (a aba 2017 não tem "Link").
- Quatro abas auxiliares (`Analise`, `ex`, `cadastro`, `DADOS`) com tentativas parciais de padronização de competições; a aba `DADOS` é uma cópia antiga de 230 linhas.

Achados relevantes de qualidade (a lista completa está no painel, em Qualidade e conferência):

| Achado | Quantidade | Tratamento |
|---|---|---|
| Coluna "Punição Justiça Desportiva" em branco | 21 | Classificado como "Não informado" |
| Grafias variantes (`SIm`, `Basa`, `Não indentificado`, `Impresa`, `Alagoago`, `Centro-oeste`) | 10 registros com correção registrada, dezenas de variações absorvidas nas regras | Normalizado |
| Competição sem identificação | 10 | Categoria "Não identificada" |
| Região incompatível com a UF (SP e RJ como Sul, GO como Sul, PR como Sudeste) | 5 | Região recalculada a partir da UF |
| Número de caso duplicado entre abas (571 e 572 aparecem em 2023 e em 2024) | 4 linhas | Apontado; o painel usa um identificador próprio |
| Sem UF e sem país válido | 3 | "Não informado" |
| Data de outro ano na aba (2016 em 2018; 2025 e 2026 em 2022) | 3 | Mantido o ano da aba, data preservada, apontamento registrado |
| Data ilegível (`16`, `Não identificado`) | 2 | Data nula, ano da aba mantido |
| Data como texto fora do padrão (`02/012021`) | 1 | Convertida para 02/01/2021 |
| Valor sem significado (`XXX`) | 1 | "Não informado" |
| Decisão registrada sem "Julgamento JD = Sim" | 1 | Julgamento inferido, apontamento registrado |
| Decisão registrada sem órgão | 1 | Apontado |

Outras observações:

- A planilha usa o mesmo marcador ("Internet" ou "Outros espaços") em todas as colunas territoriais e esportivas desses casos. O painel converte para "Não se aplica", preservando a informação de local.
- 230 grafias distintas de competição foram reduzidas a 161 nomes canônicos e classificadas em âmbito (internacional, nacional, estadual, regional ou amador).
- 52 grafias de órgão julgador (`TJDRS`, `TJD-RS`, `SJTD`, `Conmebol`, `CONMEBOL`) foram unificadas em 32.
- Apenas 12 dos 680 registros têm link para a fonte.

### 3.2 `Revisão.xlsx`

Planilha de trabalho da equipe com os totais consolidados por ano, local, estado, região, gênero e julgamentos. Foi usada como gabarito: o painel recalcula cada total e mostra a diferença.

Resultado da conferência: 51 indicadores comparados, 47 idênticos. As 4 diferenças são consequência direta das correções acima:

- Centro-Oeste +1 e Sul -1: o caso 320/2021 (Anápolis, GO) estava marcado como Sul.
- Punidos 128 contra 127 e absolvidos 57 contra 56: a planilha de revisão não contabiliza uma linha com decisão registrada e "Julgamento JD" em branco, e a própria aba "Julgamentos" tem inconsistência interna (o total de absolvidos digitado é 54, mas a soma das colunas é 56).

## 4. Decisões tomadas

1. **Separar dados, marcação, estilo e lógica.** `index.html` passou a ter só marcação; CSS e JavaScript foram para `assets/`; os dados para `data/casos.js`. Continua abrindo por duplo clique, sem servidor.
2. **Gerar a base por script, não à mão.** `scripts/build_data.py` lê a planilha, aplica as regras e grava a base. Regerar é um comando. Toda a lógica de padronização fica em um único lugar, documentada no dicionário de dados.
3. **Aproveitar as 28 colunas.** Novos campos: data completa e mês, país, plataforma (casos online), origem da agressão, boletim de ocorrência, súmula, justiça comum, julgamento e punição desportiva, órgão julgador, agressor identificado, âmbito da competição. Novos filtros e gráficos correspondentes.
4. **Privacidade por construção.** A base pública não contém nome da vítima, nome do agressor, descrição da partida (que identifica clubes), relato, desfecho em texto livre nem observações. Um perfil `--completo` gera uma base interna separada, ignorada pelo git.
5. **Sem credenciais no código.** O "login" virou um botão explícito de simulação de perfil, com a etiqueta "Modo interno (simulação)". A documentação diz o que precisa existir para uma área interna real.
6. **Qualidade visível para a equipe.** Cada registro carrega seus apontamentos, com aba e linha de origem na planilha. A área interna lista tudo e exporta em CSV. A conferência com a revisão fica permanente.
7. **Honestidade nos rótulos.** "Resumo da IA" passou a "Resumo automático", que é o que é: frases geradas por regras a partir dos números do recorte.
8. **Ano corrente dinâmico.** A regra usa o ano do relógio; o público vê anos anteriores ao corrente.

## 5. O que mudou na interface

| Tela | Antes | Agora |
|---|---|---|
| Visão geral | 5 KPIs, 1 gráfico de linha, 1 lista, rosca estática, 3 atalhos | 6 KPIs, 4 destaques calculados, evolução anual empilhada por local, 2 roscas reais, 3 listas (região, origem, âmbito), funil de responsabilização, sazonalidade por mês, 7 atalhos |
| Consulta avançada | 12 filtros em uma grade | 20 filtros em três grupos (quando e onde; contexto esportivo; registro e responsabilização), chips removíveis, link compartilhável, tabela ordenável e paginada, detalhe do caso em modal, exportação com escolha de colunas e aba de filtros no Excel |
| Metodologia e dados | Não existia | Explica fonte, padronizações, leitura do desdobramento e limites |
| Administração | KPIs fictícios | KPIs reais de qualidade e da base gerada |
| Qualidade e conferência | Não existia | Tabela de conferência com a revisão e lista de apontamentos por linha, com exportação |
| Fonte de dados | Importava e acumulava registros no navegador | Valida a planilha (abas, colunas, contagem por ano, números novos) e orienta a regerar a base |
| Governança | Lista fixa | Lista gerada a partir do estado real do painel |
| Acessibilidade | Parcial | Link "ir para o conteúdo", `label for`, `aria-current`, `aria-live` nos contadores, foco visível, linhas da tabela acionáveis pelo teclado, texto alternativo nos gráficos, respeito a `prefers-reduced-motion` e `prefers-color-scheme` |

## 6. Validação realizada

- Renderização em Chrome headless sem erros de console, em modo público e interno, temas claro e escuro.
- 20 filtros instanciados, 6 gráficos, tabela com paginação.
- Conferência automática contra a planilha de revisão: 47 de 51 totais idênticos, 4 divergências explicadas.
- Totais por ano idênticos aos da revisão em todos os 11 anos.

## 7. Próximos passos sugeridos

Em ordem de valor para o Observatório:

1. **Validar com a equipe as regras de padronização** (competições, órgãos, origem da agressão) e incorporar correções na planilha de origem, usando a lista de apontamentos.
2. **Padronizar a planilha na origem**: listas de valores fixos nas colunas Sim/Não, região calculada por fórmula a partir da UF, coluna de data com validação.
3. **Publicar no portal** como página estática; a estrutura atual já permite.
4. **Área interna real** com autenticação no servidor, se a equipe quiser abrir o ano corrente e os textos internos fora do computador local.
5. **Automatizar a geração** da base a cada atualização da planilha (por exemplo, uma ação no repositório).
6. **Preencher a coluna Link** nos novos casos: a fonte jornalística é o que dá lastro ao dado.
