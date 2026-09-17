# 04. Guia de uso e manutenção

Para quem vai usar o painel (público, imprensa, pesquisadores) e para a equipe que mantém a planilha.

## Parte A. Usando o painel

### Visão geral

Abre com o retrato completo da base pública: seis indicadores no topo, quatro destaques calculados, gráficos e o funil de responsabilização. Passe o mouse sobre as barras e fatias para ver valores exatos. Os botões de acesso rápido levam à consulta já filtrada.

### Consulta avançada

1. Escolha valores em qualquer filtro. Todos aceitam mais de um valor; a busca dentro do filtro aparece quando há mais de oito opções.
2. O resultado atualiza sozinho. O botão **Consultar** existe para quem prefere confirmar.
3. Os filtros ativos aparecem como chips no topo; o `×` remove um filtro.
4. **Copiar link da consulta** coloca no endereço todos os filtros; quem abrir o link vê a mesma consulta.
5. Clique no cabeçalho de uma coluna para ordenar; clique de novo para inverter.
6. Clique em uma linha (ou pressione Enter com a linha em foco) para abrir o detalhe do caso, com todos os campos e a fonte quando houver.
7. **PDF**, **CSV** e **Excel** exportam o recorte inteiro, não só a página exibida. Escolha as colunas no modal.

Dicas de leitura:

- "Não se aplica" em região, estado, competição, gênero ou categoria indica caso na internet ou em outros espaços, onde a planilha não classifica esses campos.
- "Não julgado" significa que a planilha registra que não houve punição desportiva. "Não informado" significa que não há informação.
- "Houve alguma punição" combina justiça desportiva e justiça comum.

### Metodologia e dados

Explica a origem dos dados, as padronizações e os limites. Indique esta tela a jornalistas e pesquisadores antes de citar números.

### Tema e celular

O botão ◐ alterna claro e escuro; a preferência fica salva no navegador. No celular, o menu abre pelo botão ☰ e a tabela vira uma lista de cartões.

## Parte B. Mantendo a base

### Atualizar a planilha e regerar o painel

1. Mantenha a planilha-base no padrão: uma aba por ano, cabeçalho na primeira linha preenchida, as 28 colunas com os mesmos nomes.
2. Opcional: abra o painel em **Modo interno**, vá em **Fonte de dados** e selecione a nova planilha. O validador mostra abas, colunas faltantes ou extras, linhas por aba e quantos números de caso ainda não estão na base. Nada é alterado.
3. Salve a planilha na pasta do projeto com o nome `Banco de Dados Observatorio Racial Futebol -.xlsx` (ou ajuste `ARQ_BASE` no script).
4. Rode:

```bash
python3 scripts/build_data.py
```

5. Leia a saída: total de casos e resumo dos apontamentos. Abra o painel e confira **Qualidade e conferência**.
6. Se a planilha de revisão também mudou, salve-a como `Revisão.xlsx` para atualizar a conferência.

Requisito: Python 3.10 ou superior. Nenhum pacote adicional.

### Corrigir a planilha com os apontamentos

Em **Qualidade e conferência**, cada apontamento indica aba, linha, número do caso e o problema. Use **Exportar CSV** para repassar a lista. Depois de corrigir na planilha, regere a base; os apontamentos resolvidos desaparecem.

Prioridades sugeridas:

1. `regiao_corrigida` e `numero_duplicado`: erros objetivos, correção rápida.
2. `data_invalida`, `data_ano_divergente`, `data_formato_corrigido`: garantir que a coluna Data tenha só datas.
3. `punicao_desportiva_vazia` e `orgao_ausente_com_decisao`: preencher com "Não informado" quando for o caso, para distinguir do esquecimento.
4. `competicao_nao_identificada`: verificar se a fonte permite identificar.

### Boas práticas na planilha

- Use listas de valores fixos (validação de dados do Excel) nas colunas Sim/Não, Local, Categoria, Gênero e Espaço.
- Escreva "Não informado" em vez de deixar em branco.
- Preencha a coluna Link com a URL da notícia. É o que permite auditar o caso.
- Não reutilize números de caso entre anos.
- Na coluna Região, prefira uma fórmula a partir da UF, ou deixe em branco e confie no painel.

### Ajustar regras de padronização

Todas ficam em `scripts/build_data.py`:

| O que ajustar | Onde |
|---|---|
| Novo nome canônico de competição ou novo padrão | `PADROES_CANONICOS`, `DEMONIMOS`, `ESTADUAIS_EXTRA`, `REGIONAL_AMADOR` |
| Grafias de órgão julgador | `normaliza_orgao()` |
| Categorias de origem da agressão | `normaliza_origem()` |
| Plataformas online | `normaliza_plataforma()` |
| Valores específicos de Sim/Não | dicionário `extras` nas chamadas de `sim_nao()` |
| Colunas consideradas sensíveis | `COLUNAS_SENSIVEIS` |
| Descrição de um apontamento | `qualidade["descricoes"]` em `main()` |

Depois de alterar, regere e confira a tabela de conferência: os totais por ano, local e gênero devem continuar idênticos aos da revisão.

### Base interna

```bash
python3 scripts/build_data.py --completo
```

Gera `data/casos.interno.js` com nomes, relatos e desfechos. Para usá-la, troque temporariamente a linha `<script src="data/casos.js">` do `index.html` por `data/casos.interno.js`, em um computador da equipe. Nunca publique nem versione esse arquivo.

## Parte C. Ajustando a interface

| Tarefa | Onde |
|---|---|
| Incluir ou remover um filtro | `FILTROS` em `app.js` e o `<select id="f-...">` correspondente no `index.html` |
| Mudar colunas da tabela ou da exportação | `COLS` em `app.js` (`table: true` exibe na tabela) |
| Mudar ordem fixa de categorias | `ORDEM_FIXA` em `app.js` |
| Trocar cores | tokens em `:root` e `html[data-theme="dark"]` em `styles.css`; gráficos seguem automaticamente |
| Novo atalho na Visão geral | botão `.quick` com `data-filter` e `data-value` no `index.html` |
| Textos da tela Metodologia e Governança | `index.html` e `renderGovernanca()` em `app.js` |

## Parte D. Perguntas frequentes

**O painel funciona sem internet?** Sim. As bibliotecas de gráficos e seleção estão em `assets/vendor/`, com versão fixa. Tanto o duplo clique em `index.html` quanto o container Docker funcionam offline (ver `docs/06-execucao-com-docker.md`).

**Posso citar os números do painel?** Sim, com a ressalva de que a base reflete casos noticiados pela imprensa e que o relatório anual é a publicação oficial. A tela Metodologia resume isso.

**Por que o painel mostra 50 casos no Centro-Oeste e a revisão 49?** Porque o caso 320/2021 (Anápolis, GO) está marcado como Sul na planilha. O painel corrige pela UF e registra o apontamento.

**Como o painel sabe qual é o ano corrente?** Pelo relógio do computador. O público vê anos anteriores ao corrente; a equipe vê tudo.

**Perdi os filtros ao recarregar.** Os filtros ficam no endereço da página. Use "Copiar link da consulta" para guardar uma consulta.
