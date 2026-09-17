# 05. Roteiro de apresentação

Roteiro para demonstrar o painel em cerca de 20 minutos, com os números-chave, a sequência de cliques e as perguntas prováveis. Os números referem-se à base pública de 680 casos (2014 a 2024).

## Antes de começar

- Abra `index.html` no Chrome ou Firefox, ou suba o container com `docker compose up -d --build` e acesse `http://localhost:8080` (ver `docs/06-execucao-com-docker.md`). Nenhuma das duas formas precisa de internet: as bibliotecas estão em `assets/vendor/`.
- Se outras pessoas forem abrir no celular durante a apresentação, use o container e passe o endereço da sua máquina na rede local (por exemplo `http://192.168.0.10:8080`).
- Deixe o tema claro para projetor; o escuro funciona melhor em tela.
- Comece no modo público. Guarde o modo interno para o bloco da equipe.
- Feche outras abas: o painel usa a largura toda.

## Mensagem central

> O Observatório já tem os dados. O painel transforma a planilha em uma resposta em segundos, com regras explícitas, sem expor pessoas nem clubes, e devolve à equipe uma lista do que corrigir na origem.

## Bloco 1. O retrato (5 min): Visão geral

Abra o painel. Fale sobre os seis indicadores do topo:

| Indicador | Valor | Frase |
|---|---|---|
| Casos monitorados | 680 | "Onze anos de monitoramento, um caso por linha." |
| Em estádios | 75,7% (515) | "Três em cada quatro casos acontecem no estádio." |
| Ambiente digital | 16,9% (115) | "Um em cada seis é na internet." |
| Punições desportivas | 128 | "De 185 casos julgados pela justiça desportiva, 69% terminaram em punição." |
| Agressor identificado | 53,8% | "Em quase metade dos casos ninguém é identificado." |
| Boletim de ocorrência | 36,6% | "Só um terço chega à polícia." |

Destaques calculados (quatro cartões abaixo dos KPIs):

- **136 casos em 2023**, o pico da série. 26 em 2014, 109 em 2024.
- **69,2% dos julgados foram punidos**, mas em 128 casos (18,8%) não há nenhuma informação de desdobramento.
- **Online caiu de 21,4% para 12%** da participação entre os três primeiros e os três últimos anos. Em números absolutos a internet cresceu (3 casos em 2014, 21 em 2023), mas os estádios cresceram mais.
- **18,8% em base e amador**: 128 casos fora do futebol profissional.

Gráficos, em ordem:

1. **Evolução anual empilhada por local.** Aponte 2019 (70), a queda de 2020 (31, pandemia) e a escalada 2022 a 2024 (98, 136, 109).
2. **Onde acontece** e **Desdobramento**: roscas com os mesmos números dos KPIs, agora em proporção.
3. **Distribuição por região**: 455 casos em estádios no Brasil. Sudeste 169, Sul 148, Nordeste 66, Centro-Oeste 50, Norte 22. Mais 60 em estádios no exterior. Explique que este é o recorte dos relatórios anuais.
4. **De onde parte a agressão**: torcida em 394 casos (58%). Depois atletas (61), staff e organização (24), comissão técnica (20), dirigentes (15). "A discriminação não vem só da arquibancada."
5. **Âmbito**: estaduais 220, nacionais 131, internacionais 117, amador e regional 82.
6. **Funil de responsabilização**: 680 casos, 249 com boletim, 175 em súmula, 185 julgados, 128 punidos pela justiça desportiva, 106 pela comum.
7. **Sazonalidade**: picos em agosto (77) e maio (74); vales em dezembro (30) e janeiro (34), o calendário do futebol.

## Bloco 2. A pergunta (6 min): Consulta avançada

Mostre a resposta em tempo real. Sugestão de sequência:

1. Clique no atalho **Casos na internet**. 115 casos; observe que região, estado e competição mostram "Não se aplica" e a plataforma aparece na coluna Local (X, Instagram, YouTube).
2. Em **Ano**, marque 2023 e 2024: 33 casos online nos dois últimos anos. Nenhum julgado pela justiça desportiva. "A internet ainda escapa da responsabilização."
3. **Limpar filtros**. Em **Justiça desportiva**, marque Punido: 128. Em **Órgão julgador**, veja STJD (58 no total), CONMEBOL (56), TJD-SP, TJD-RS.
4. Marque **Âmbito** = Internacional (117 casos). Dos 43 julgados, 42 foram punidos (98%), quase todos pela CONMEBOL. Nas competições brasileiras a taxa é 86 punições em 142 julgamentos (61%). Filtre **País** para ver Argentina (27), Paraguai (10), Uruguai (9).
5. **Limpar**. **Gênero** = Feminino: 27 casos. **Categoria** = Base: 70. Explique a subnotificação provável.
6. Clique em uma linha: o detalhe mostra todos os campos e a fonte quando existe. Diga o que **não** aparece: nome da vítima, nome do agressor, clubes, relato.
7. **Copiar link da consulta**: cole na barra de outra aba. A consulta reabre igual. "Um jornalista pode mandar a pergunta para o outro."
8. **Excel**: mostre o modal de colunas e a aba Filtros do arquivo gerado.

Um achado forte para fechar o bloco: os julgamentos desportivos saltaram. Até 2021 eram entre 5 e 13 por ano. Em 2022 foram 41, em 2023 47, em 2024 38. A taxa de boletim de ocorrência oscilou entre 13% e 38% até 2022 e subiu para 52% em 2023 e 50% em 2024. Para ver: filtre **Ano** um a um e observe o KPI "Punidos" e o funil (Visão geral não filtra; use a consulta e leia a coluna B.O.).

## Bloco 3. A confiança (4 min): Metodologia e modo interno

1. **Metodologia e dados**: leia os quatro cartões. Frase-chave: "nada é inferido além do que está registrado".
2. Clique em **Modo interno**. Mostre a etiqueta "simulação" e explique que é uma troca de perfil na interface, não um login.
3. **Administração**: 680 registros, 62 apontamentos em 57 registros (8,4%), 623 registros sem pendência.
4. **Qualidade e conferência**: a tabela compara 51 totais com a planilha de revisão da equipe. 47 batem. As 4 diferenças são correções do painel: um caso de Goiás que estava como Sul, e uma decisão desportiva que a revisão não contou. "O painel não substitui a revisão; ele a acelera."
5. Role até os apontamentos. Clique em `regiao_corrigida` (5) e em `numero_duplicado` (4). Cada linha diz aba e linha da planilha. **Exportar CSV**: é a lista de tarefas da equipe.
6. **Fonte de dados**: selecione a própria planilha-base. O validador conta abas e linhas e confirma as colunas. Explique o ciclo: corrigir a planilha, rodar um comando, painel atualizado.

## Bloco 4. O caminho (3 min)

O que é decisão do Observatório, não técnica:

1. **Validar as padronizações** de competição, órgão e origem da agressão. O painel propõe; a equipe confirma.
2. **Publicar no portal**: é um site estático, pronto para hospedar.
3. **Área interna real** só se a equipe quiser acessar o ano corrente e os textos fora do computador local. Exige servidor com login.
4. **Disciplina na planilha**: listas fixas, datas válidas, coluna Link preenchida.

Encerramento: "Cada número que vocês viram tem uma linha de planilha atrás e uma regra escrita. É isso que permite defender o dado em público."

## Perguntas prováveis

**"Esses números são oficiais?"** São os mesmos da planilha que alimenta o relatório anual, conferidos linha a linha. As 4 diferenças estão documentadas e são correções da planilha, não do painel. O relatório continua sendo a publicação oficial.

**"Por que não mostrar os clubes?"** Decisão institucional do Observatório: o foco é o fenômeno e a responsabilização, não um ranking que desloque o debate para a rivalidade. A base pública é gerada sem as colunas que identificam clubes.

**"E os nomes das vítimas?"** Não estão na base pública. Dados de vítimas de discriminação racial são sensíveis pela LGPD; a publicação na imprensa não muda isso. A equipe tem uma base interna separada.

**"A internet está diminuindo?"** Em proporção, sim; em números absolutos, oscila e cresceu em 2023. É provável que a subnotificação online seja alta: o monitoramento depende de a imprensa noticiar.

**"Dá para confiar na coluna de julgamento?"** Em 128 casos (18,8%) não há informação. O painel separa "não julgado" de "não informado" justamente para não inflar nenhum dos dois lados.

**"Quanto custa manter?"** Zero de infraestrutura: um arquivo estático. O custo é o tempo da equipe para manter a planilha e rodar um comando.

**"Funciona no celular?"** Sim. Mostre redimensionando a janela: o menu recolhe e a tabela vira cartões.

## Números para ter à mão

| Item | Valor |
|---|---|
| Total de casos, período | 680, 2014 a 2024 |
| Ano com mais casos | 2023, 136 |
| Estádio / Internet / Outros espaços | 515 / 115 / 50 |
| Estádios no Brasil / no exterior | 455 / 60 |
| Estados com mais casos em estádios | RS 98, SP 82, MG 49, RJ 32, PR 29, GO 28 |
| Torcida como origem | 394 (57,9%) |
| Boletim de ocorrência | 249 (36,6%) |
| Súmula | 175 (25,7%) |
| Julgados / punidos / absolvidos (justiça desportiva) | 185 / 128 / 57 |
| Punidos pela justiça comum | 106 |
| Alguma punição (desportiva ou comum) | 209 (30,7%) |
| Agressor identificado | 366 (53,8%) |
| Sem informação de desdobramento | 128 (18,8%) |
| Feminino / Base / Amador | 27 / 70 / 58 |
| Competições internacionais | 117 (Libertadores 77, Sul-Americana 27); 42 punições em 43 julgamentos |
| Competições brasileiras julgadas | 86 punições em 142 julgamentos (61%) |
| Órgãos que mais julgaram | STJD 58, CONMEBOL 56, TJD-SP 29, TJD-RS 27 |
| Apontamentos de qualidade | 62 em 57 registros (8,4%) |
| Conferência com a revisão | 51 totais, 47 idênticos, 4 explicados |
