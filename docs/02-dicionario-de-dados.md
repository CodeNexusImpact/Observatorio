# 02. Dicionário de dados

Descreve a planilha de origem, a base gerada (`data/casos.js`), as regras de normalização e os apontamentos de qualidade. É a referência para quem mantém a planilha e para quem programa o painel.

## 1. Planilha de origem

Arquivo: `Banco de Dados Observatorio Racial Futebol -.xlsx`

- Uma aba por ano, nomeada com o ano (`2014` a `2025`). O script lê todas as abas cujo nome é um ano com quatro dígitos.
- A primeira linha não vazia é o cabeçalho. A coluna A costuma trazer um contador sem título e é ignorada.
- Abas auxiliares (`Analise`, `ex`, `cadastro`, `DADOS`) não são lidas.

Colunas esperadas e como o painel as usa:

| Coluna na planilha | Uso no painel | Observações |
|---|---|---|
| Número | `numero` | Formato `NNN/AAAA` até 2023; só `NNN` de 2023 em diante. 571 e 572 aparecem em duas abas |
| Data | `data`, `mes` | Data do Excel (número de série). Textos são tentados no formato dia/mês/ano |
| Nome | `nome` (só perfil interno) | Vítima. Dado pessoal sensível |
| Jogo | `jogo` (só perfil interno) | Identifica clubes, por isso fica fora da base pública |
| Estádio | `localDetalhe`, `plataforma` | Em casos online traz a rede social; em outros espaços, o tipo de lugar |
| Cidade | `cidade` | Marcadores estruturais viram nulo |
| Estado | `uf`, `estado` | Sigla da UF; `Internet`, `Outros espaços`, `ND`, `Exterior` são tratados |
| Região | validação | O painel recalcula a região pela UF e registra divergências |
| País | `pais` | Preenche `Exterior` quando o estado não é uma UF |
| Competição | `competicao`, `competicaoOriginal`, `ambito` | 230 grafias distintas na origem |
| Gênero | `genero` | Masculino, Feminino |
| Local | `local`, `ambiente` | Estádio, Internet, Outros espaços |
| Categoria | `categoria` | Profissional, Base, Amador |
| Espaço | `origem` | De onde parte a agressão: torcida, atleta, comissão técnica etc. |
| Fato | `fato` (só perfil interno) | Relato em texto livre |
| Desfecho | `desfecho` (só perfil interno) | Texto livre |
| Boletim de Ocorrência | `boletim`, `boletimDetalhe` | Sim, Não, Não informado, valores específicos preservados |
| Súmula | `sumula` | Sim, Não, Não informado |
| Punição Justiça comum | `punicaoComum`, `punicaoComumDetalhe` | Sim, Não, Não informado, Acordo, Absolvido, Arquivado, Em andamento e outros |
| Julgamento Justiça Desportiva | `julgamentoDesportivo` | Preenchida só quando houve julgamento |
| Punição Justiça Desportiva | `punicaoDesportiva`, `desdobramento` | Sim, Não, Absolvido, Não informado |
| Orgão de Justiça Desportiva | `orgao` | 52 grafias unificadas em 32 |
| Agressor Identificado | `agressorIdentificado` | Sim, Não, Não informado |
| Nome Agressor | `nomeAgressor` (só perfil interno) | Dado pessoal |
| Decisão Justiça Desportiva | `decisaoDesportiva` (só perfil interno) | Texto livre, cita clubes |
| Quem punido ou absolvido | `quemPunido` (só perfil interno) | Cita clubes |
| Link | `fonte` | Só URLs iniciadas por `http`. 12 preenchidos em 680 |
| OBS | `obs` (só perfil interno) | 1 preenchido |

## 2. Base gerada

Arquivo: `data/casos.js`. Define `window.ODRF_DATA` com quatro blocos:

```
meta        origem, data de geração, total, período, perfil, mapas UF/região e UF/nome
casos       lista de registros normalizados (um por linha da planilha)
referencia  totais da planilha de revisão, para conferência
qualidade   apontamentos por registro, resumo por tipo e descrições
dominios    contagem de valores distintos por campo (útil para depurar)
```

### 2.1 Campos de cada caso

| Campo | Tipo | Valores | Regra |
|---|---|---|---|
| `id` | texto | `2014-001` | Ano da aba e posição na aba. Estável enquanto a ordem das linhas não mudar |
| `numero` | texto ou nulo | como na planilha | Sem tratamento |
| `ano` | inteiro | 2014 a 2024 | Sempre o ano da aba, mesmo se a data divergir |
| `data` | ISO ou nulo | `2014-02-14` | Do número de série do Excel ou do texto reconhecido |
| `mes` | 1 a 12 ou nulo | | Derivado da data |
| `local` | texto | Estádio, Internet, Outros espaços, Não informado | |
| `ambiente` | texto | Online, Presencial | Online quando `local` é Internet |
| `plataforma` | texto ou nulo | X (Twitter), Instagram, YouTube, WhatsApp, Podcast, Múltiplas plataformas, Rede social (não especificada), Não especificada | Só para casos online, derivada da coluna Estádio |
| `localDetalhe` | texto ou nulo | nome do estádio, tipo de lugar ou rede | Marcadores estruturais e "Sem identificação" viram nulo |
| `cidade` | texto ou nulo | | |
| `uf` | texto ou nulo | sigla | Só quando a coluna Estado é uma UF válida |
| `estado` | texto | nome da UF, Exterior, Não se aplica, Não informado | |
| `regiao` | texto | Norte, Nordeste, Centro-Oeste, Sudeste, Sul, Exterior, Não se aplica, Não informado | Recalculada pela UF |
| `pais` | texto | Brasil, países sul-americanos, Não se aplica, Não informado | Brasil quando há UF |
| `competicao` | texto | nome canônico | Ver seção 3.3 |
| `competicaoOriginal` | texto ou nulo | grafia da planilha | Preservada para auditoria |
| `ambito` | texto | Internacional, Nacional, Estadual, Regional amador ou escolar, Outra, Não identificada, Não se aplica | |
| `genero` | texto | Masculino, Feminino, Não se aplica, Não informado | |
| `categoria` | texto | Profissional, Base, Amador, Não se aplica, Não informado | `Basa` corrigido para Base |
| `origem` | texto | Torcida, Atleta, Comissão técnica, Dirigente, Staff e organização, Arbitragem, Polícia, Imprensa, Torcida e atleta, Internet, Outros espaços, Não informado | Da coluna Espaço |
| `boletim` | texto | Sim, Não, Não informado, Ofício ao MP, Outro | |
| `boletimDetalhe` | texto ou nulo | | Valor original quando `Outro` |
| `sumula` | texto | Sim, Não, Não informado | |
| `punicaoComum` | texto | Sim, Não, Não informado, Absolvido, Acordo, Arquivado, Em andamento, Liberado, Segredo de justiça, Termo de renúncia, Outro | |
| `punicaoComumDetalhe` | texto ou nulo | | Valor original quando `Outro` |
| `julgamentoDesportivo` | texto | Sim, Não | Sim se a coluna diz Sim ou se há decisão registrada |
| `punicaoDesportiva` | texto | Sim, Não, Absolvido, Não informado | |
| `orgao` | texto ou nulo | STJD, CONMEBOL, TJD-UF, FIFA, Comissão da competição, Liga regional e outros | Nulo quando "Não" ou "Não informado" |
| `agressorIdentificado` | texto | Sim, Não, Não informado | |
| `desdobramento` | texto | Punido, Absolvido, Não julgado, Não informado | Ver seção 3.5 |
| `responsabilizacao` | texto | Sim, Não, Não informado | Sim se houve punição desportiva ou comum |
| `fonte` | URL ou nulo | | |
| `qualidade` | lista | códigos da seção 4 | Vazia quando não há apontamento |
| `linhaPlanilha` | inteiro | | Linha na aba de origem, para a equipe localizar |

Campos exclusivos do perfil interno (`--completo`): `nome`, `jogo`, `fato`, `desfecho`, `nomeAgressor`, `decisaoDesportiva`, `quemPunido`, `obs`.

## 3. Regras de normalização

Todas estão em `scripts/build_data.py`. A comparação de textos ignora maiúsculas, acentos e espaços repetidos.

### 3.1 Marcadores estruturais

A planilha preenche `Internet` ou `Outros espaços` em todas as colunas dos casos que não ocorreram em estádio. O painel mantém a informação em `local` e converte as demais colunas para `Não se aplica`. Quando o caso em "outros espaços" tem UF preenchida (15 casos), a UF é aproveitada.

### 3.2 Território

1. Se a coluna Estado é uma UF válida: `uf` recebe a sigla, `estado` o nome, `regiao` a região oficial da UF e `pais` recebe Brasil. Se a coluna Região da planilha discordar, registra-se `regiao_corrigida`.
2. Se é um marcador estrutural: `Não se aplica`.
3. Caso contrário, se há país válido diferente de Brasil: `estado` e `regiao` recebem `Exterior` e `pais` o país.
4. Caso contrário: `Não informado` com apontamento `territorio_nao_informado`.

### 3.3 Competições

Ordem de aplicação:

1. Marcadores estruturais viram `Não se aplica`; "Sem identificação" e variantes viram `Não identificada`.
2. Sinônimos de amador e base: `Campeonato amador`, `Base (amador)`.
3. Padrões nomeados (Libertadores, Sul-Americana, Recopa, Copa América, Copa do Mundo, Eliminatórias, Copa do Brasil, Copa do Nordeste, Copa São Paulo, Brasileiro por série, Brasileiro Feminino por série etc.) com âmbito Internacional ou Nacional.
4. Demônimos estaduais (gaúcho, paulista, carioca, mineiro, e outros 24) com sufixos padronizados: Feminino, Sub-NN, A2/A3/A4 (paulista), Módulo II (mineiro), Série B, 2ª/3ª/4ª Divisão, Futsal. Âmbito Estadual, exceto quando o nome contém termos amadores (municipal, várzea, liga etc.).
5. Copas e taças estaduais sem demônimo (Copa FGF, Copa Rio, Taça Guanabara, Copa Alagoas etc.).
6. Termos de futebol amador, regional, escolar ou de várzea: âmbito `Regional, amador ou escolar`.
7. O que sobrar mantém a grafia original com inicial maiúscula e âmbito `Outra`.

Esta normalização é heurística. A lista de nomes canônicos resultantes (161) deve ser revisada pela equipe. Correções devem ser feitas no script (lista `PADROES_CANONICOS`, `DEMONIMOS` e `REGIONAL_AMADOR`) ou, melhor ainda, na própria planilha.

### 3.4 Sim e Não

Aceita `Sim`, `SIm`, `S`, `Não`, `N`. "Não informado", "Não temos informação", "ND", "XXX", "Não identificado" viram `Não informado`. Valores específicos conhecidos (Absolvido, Acordo, Arquivado, Em andamento, Ofício ao MP etc.) são preservados. O que não se encaixa vira `Outro` com o texto original no campo de detalhe.

### 3.5 Desdobramento na justiça desportiva

| `punicaoDesportiva` | `desdobramento` |
|---|---|
| Sim | Punido |
| Absolvido / Absolvida | Absolvido |
| Não | Não julgado |
| em branco, Não informado, XXX | Não informado |

`julgamentoDesportivo` é Sim quando a coluna "Julgamento Justiça Desportiva" diz Sim ou quando há decisão (Punido ou Absolvido). `responsabilizacao` é Sim quando `punicaoDesportiva` ou `punicaoComum` é Sim; é `Não informado` quando ambas são não informadas; senão, Não.

### 3.6 Órgão julgador

`TJDRS`, `TJD RS`, `TJD-RS` viram `TJD-RS`. `SJTD` é tratado como erro de digitação de `STJD`. `Conmebol` e `CONMEBOL` viram `CONMEBOL`. Comissões, comitês e coordenações de competição viram `Comissão da competição`. "Não" e "Não informado" viram nulo.

### 3.7 Origem da agressão (coluna Espaço)

Agrupa `Staff`, `Staff estádio`, `Staff do clube`, `Staff do jogo`, `Estádio` e `Campo` em `Staff e organização`; `Diretoria` em `Dirigente`; `Impresa` em `Imprensa`; `Instagram` em `Internet`.

### 3.8 Plataforma (casos online)

Derivada da coluna Estádio: menções a X ou Twitter, Instagram, Facebook, WhatsApp, YouTube e Podcast. Mais de uma menção vira `Múltiplas plataformas`. "Redes sociais" sem nome vira `Rede social (não especificada)`. `Internet` puro vira `Não especificada` (83 dos 115 casos).

## 4. Apontamentos de qualidade

Cada apontamento tem `id` do caso, aba, linha, código e detalhe. Resumo da base atual (62 apontamentos em 57 registros, 8,4% da base):

| Código | Qtde | Significado |
|---|---|---|
| `punicao_desportiva_vazia` | 21 | Coluna em branco; tratada como Não informado |
| `grafia_corrigida` | 10 | Variação de grafia normalizada |
| `competicao_nao_identificada` | 10 | Competição registrada como não identificada |
| `regiao_corrigida` | 5 | Região incompatível com a UF |
| `numero_duplicado` | 4 | Número repetido entre abas |
| `territorio_nao_informado` | 3 | Sem UF e sem país |
| `data_ano_divergente` | 3 | Data pertence a outro ano |
| `data_invalida` | 2 | Data ilegível |
| `data_formato_corrigido` | 1 | Data em texto convertida |
| `valor_invalido` | 1 | Valor sem significado |
| `julgamento_nao_marcado` | 1 | Decisão sem "Julgamento JD = Sim" |
| `orgao_ausente_com_decisao` | 1 | Decisão sem órgão |

Os apontamentos não alteram a planilha. A correção deve ser feita na origem e a base regerada.

## 5. Referência da planilha de revisão

Lidos de `Revisão.xlsx` e gravados em `referencia`:

| Bloco | Aba de origem | Recorte |
|---|---|---|
| `totalPorAno` | Geral, linha "Revisão" | todos os casos |
| `localPorAno` | Local | todos os casos |
| `regiaoEstadios`, `exteriorEstadios` | Região | casos em estádio |
| `estadosEstadios` | Estados, coluna TOTAL | casos em estádio |
| `generoEstadios` | Gênero | casos em estádio |
| `julgamentos` | Julgamentos, somas das linhas PUNIDOS e ABSOLVIDOS | todos os casos |
| `conmebolPorAno` | Conmebol | casos em competições da CONMEBOL |

Atenção: a aba Julgamentos tem o total de absolvidos digitado como 54, mas a soma das colunas anuais é 56. O painel usa a soma.

## 6. Distribuições da base atual

Para consulta rápida (calculadas em 17 de setembro de 2026):

| Dimensão | Valores |
|---|---|
| Ano | 2014: 26 · 2015: 33 · 2016: 25 · 2017: 42 · 2018: 46 · 2019: 70 · 2020: 31 · 2021: 64 · 2022: 98 · 2023: 136 · 2024: 109 |
| Local | Estádio 515 · Internet 115 · Outros espaços 50 |
| Região (estádios no Brasil, 455) | Sudeste 169 · Sul 148 · Nordeste 66 · Centro-Oeste 50 · Norte 22 |
| Estados (estádios) | RS 98 · SP 82 · MG 49 · RJ 32 · PR 29 · GO 28 · SC 21 · BA 11 · PB, CE, AM 10 |
| País | Brasil 470 · Argentina 27 · Paraguai 10 · Uruguai 9 · Peru 4 · Bolívia 3 · Chile 3 · Colômbia 2 · Equador 2 · Venezuela 1 |
| Âmbito | Estadual 220 · Nacional 131 · Internacional 117 · Regional, amador ou escolar 82 · Não identificada 10 · Outra 1 · Não se aplica 119 |
| Gênero | Masculino 550 · Feminino 27 · Não se aplica 103 |
| Categoria | Profissional 448 · Base 70 · Amador 58 · Não informado 1 · Não se aplica 103 |
| Origem | Torcida 394 · Atleta 61 · Staff e organização 24 · Comissão técnica 20 · Dirigente 15 · Arbitragem 5 · Polícia 2 · Imprensa 1 · Torcida e atleta 1 |
| Boletim de ocorrência | Sim 249 · Não 358 · Não informado 70 · outros 3 |
| Súmula | Sim 175 · Não 425 · Não informado 80 |
| Justiça comum | Sim 106 · Não 378 · Não informado 185 · específicos 11 |
| Justiça desportiva | Punido 128 · Absolvido 57 · Não julgado 367 · Não informado 128 |
| Órgão | STJD 58 · CONMEBOL 56 · TJD-SP 29 · TJD-RS 27 · Comissão da competição 8 · TJD-PR 6 |
| Agressor identificado | Sim 366 · Não 216 · Não informado 98 |
| Alguma punição | Sim 209 · Não 370 · Não informado 101 |
| Plataforma (online) | Não especificada 83 · X (Twitter) 12 · Instagram 11 · Múltiplas 4 · YouTube 2 · WhatsApp 1 · Podcast 1 · Rede social não especificada 1 |
| Mês | Jan 34 · Fev 65 · Mar 57 · Abr 68 · Mai 74 · Jun 50 · Jul 62 · Ago 77 · Set 54 · Out 62 · Nov 45 · Dez 30 |
