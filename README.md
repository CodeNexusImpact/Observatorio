# Observatório da Discriminação Racial no Futebol (ODRF): Painel de Dados

Protótipo do painel interativo que lê a planilha de casos do Observatório e a transforma em indicadores, recortes e consultas. Funciona abrindo `index.html` no navegador, sem servidor e sem instalação.

| | |
|---|---|
| **Base atual** | 680 casos, 2014 a 2024, gerados a partir de `Banco de Dados Observatorio Racial Futebol -.xlsx` |
| **Conferência** | Totais comparados com `Revisão.xlsx` (51 indicadores, 4 divergências explicadas) |
| **Tecnologia** | HTML, CSS e JavaScript puros; Chart.js, SlimSelect e SheetJS locais; Python 3 (biblioteca padrão) para gerar a base; Docker opcional |
| **Regras** | Sem consulta por clube; ano corrente restrito ao modo interno; nomes e relatos fora da base pública |

## Como usar

1. Abra `index.html` em um navegador atual (Chrome, Firefox, Edge ou Safari). Funciona sem internet: as bibliotecas estão em `assets/vendor/`.
2. Navegue pelas telas no menu lateral: Visão geral, Consulta avançada, Metodologia e dados, Relatórios e Contato.
3. Clique em **Modo interno** para simular o perfil da equipe: aparecem Administração, Qualidade e conferência, Fonte de dados e Governança.

## Como executar com Docker

```bash
docker compose up -d --build
```

Abra `http://localhost:8080`. A imagem gera a base a partir das planilhas e serve o site com nginx, sem dependência de rede depois de construída. Instruções completas, incluindo como levar a imagem para uma máquina sem internet, em [docs/06-execucao-com-docker.md](docs/06-execucao-com-docker.md).

## Como regerar a base a partir da planilha

```bash
python3 scripts/build_data.py
```

O script lê as abas anuais da planilha-base, aplica as regras de padronização, lê os totais da planilha de revisão e grava `data/casos.js`. Não precisa de nenhum pacote além do Python 3.10 ou superior.

Para uma base interna com nomes, relatos e desfechos (não publicar nem versionar):

```bash
python3 scripts/build_data.py --completo
```

## Estrutura do repositório

```
index.html                      marcação das telas
assets/css/styles.css           estilos, tokens de cor e tema escuro
assets/js/app.js                lógica da interface
assets/vendor/                  Chart.js, SlimSelect e SheetJS (versões fixas, uso offline)
data/casos.js                   base gerada (não editar à mão)
scripts/build_data.py           gera a base a partir das planilhas
scripts/xlsx_reader.py          leitor de .xlsx sem dependências
Dockerfile, docker-compose.yml  empacotamento em container (nginx)
docker/nginx.conf               configuração do servidor estático
docs/01-analise-do-prototipo.md diagnóstico do protótipo anterior e o que mudou
docs/02-dicionario-de-dados.md  campos, regras de normalização e qualidade
docs/03-arquitetura-e-regras.md como o painel funciona e as regras de negócio
docs/04-guia-de-uso-e-manutencao.md operação do painel e da planilha
docs/05-roteiro-de-apresentacao.md roteiro de demonstração com os números-chave
docs/06-execucao-com-docker.md  construir, executar e transportar o container
```

## Documentação

Comece por [docs/01-analise-do-prototipo.md](docs/01-analise-do-prototipo.md) para entender o diagnóstico e as decisões. Para apresentar o painel, use [docs/05-roteiro-de-apresentacao.md](docs/05-roteiro-de-apresentacao.md).

## Limites conhecidos

- O modo interno é uma simulação de perfil na interface. Não há autenticação: tudo o que está em `data/casos.js` é público para quem abre a página. Por isso a base pública já nasce sem dados sensíveis.
- A normalização de competições é heurística e deve ser validada pela equipe (detalhes no dicionário de dados).
