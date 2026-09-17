# 06. Execução com Docker

Como empacotar o painel em um container e executá-lo em qualquer máquina com Docker, inclusive sem internet, para a apresentação.

## 1. O que o container faz

A imagem é construída em duas etapas:

1. **Geração da base.** Uma imagem Python lê as duas planilhas do projeto e executa `scripts/build_data.py`, produzindo `data/casos.js`. Não instala nenhum pacote.
2. **Servidor estático.** Uma imagem nginx recebe `index.html`, `assets/` (incluindo as bibliotecas de terceiros já copiadas em `assets/vendor/`), `docs/` e a base gerada, e serve tudo na porta 80 do container.

Resultado: uma imagem de cerca de 50 MB que responde em `http://localhost:8080`, sem depender de rede externa depois de construída.

## 2. Pré-requisitos

- Docker 24 ou superior com o plugin Compose (`docker compose version` responde). No Windows e no macOS, o Docker Desktop já inclui. No Linux, siga a instalação oficial do Docker Engine.
- Acesso à internet apenas na primeira construção, para baixar as imagens-base `python:3.12-alpine` e `nginx:1.27-alpine`.

Verifique:

```bash
docker --version
docker compose version
```

## 3. Subir o painel

Na pasta do projeto:

```bash
docker compose up -d --build
```

Abra `http://localhost:8080`. Para acompanhar o servidor:

```bash
docker compose logs -f
```

Para encerrar:

```bash
docker compose down
```

### Trocar a porta

Se a 8080 estiver ocupada:

```bash
ODRF_PORT=9000 docker compose up -d --build
```

No Windows (PowerShell):

```powershell
$env:ODRF_PORT=9000; docker compose up -d --build
```

## 4. Sem Compose

```bash
docker build -t odrf-painel .
docker run --rm -d --name odrf-painel -p 8080:80 odrf-painel
```

Encerrar: `docker stop odrf-painel`.

## 5. Atualizar a planilha e reconstruir

1. Substitua `Banco de Dados Observatorio Racial Futebol -.xlsx` (e `Revisão.xlsx`, se mudou) na pasta do projeto.
2. Reconstrua:

```bash
docker compose up -d --build
```

A etapa Python roda de novo e a base é regerada dentro da imagem. A saída do script (total de casos e apontamentos) aparece no log da construção.

## 6. Levar para outra máquina sem internet

Na máquina com internet, depois de construir:

```bash
docker save odrf-painel:latest -o odrf-painel.tar
```

Copie `odrf-painel.tar` (pendrive, rede local). Na máquina de destino:

```bash
docker load -i odrf-painel.tar
docker run --rm -d --name odrf-painel -p 8080:80 odrf-painel:latest
```

Abra `http://localhost:8080`. Nenhuma conexão externa é necessária: as bibliotecas de gráficos e seleção estão dentro da imagem.

## 7. Verificação antes da apresentação

Lista de checagem, cinco minutos:

1. `docker compose ps` mostra o serviço `painel` como `running` e `healthy`.
2. `http://localhost:8080` abre a Visão geral com 680 casos.
3. Clique em **Modo interno** e abra **Qualidade e conferência**: 51 totais, 4 divergências.
4. Na Consulta avançada, exporte um CSV para confirmar o download.
5. Alterne o tema (◐) para o que funcionar melhor no projetor.

Se algo falhar, veja a seção 9.

## 8. Arquivos envolvidos

| Arquivo | Papel |
|---|---|
| `Dockerfile` | Duas etapas: gera a base com Python e monta a imagem nginx |
| `docker-compose.yml` | Serviço `painel` na porta `ODRF_PORT` (padrão 8080) |
| `docker/nginx.conf` | Servidor estático: compressão, cache curto para página e base, cabeçalhos básicos |
| `.dockerignore` | Mantém fora da imagem o `.git`, a pasta `data/` local e a base interna |
| `assets/vendor/` | Chart.js, SlimSelect e SheetJS com versão fixa (ver `VERSOES.md` na pasta) |

O container **não** inclui `data/casos.interno.js`. A imagem contém apenas a base pública, sem nomes, relatos ou clubes. Não altere isso para uma imagem que vá circular.

## 9. Problemas comuns

**`port is already allocated`.** Outra aplicação usa a 8080. Use `ODRF_PORT=9000 docker compose up -d`.

**`Cannot connect to the Docker daemon`.** O Docker não está em execução. Abra o Docker Desktop ou inicie o serviço (`sudo systemctl start docker` no Linux).

**A construção falha na etapa Python.** A planilha não está na pasta ou mudou de nome. O `Dockerfile` espera exatamente `Banco de Dados Observatorio Racial Futebol -.xlsx` e `Revisão.xlsx`. Renomeie o arquivo ou ajuste a linha `COPY` e a constante `ARQ_BASE` em `scripts/build_data.py`.

**A página abre, mas sem gráficos.** Limpe o cache do navegador (Ctrl+Shift+R). Se persistir, confirme que `assets/vendor/` tem os quatro arquivos listados em `VERSOES.md`.

**Mudei a planilha e o painel não mudou.** Reconstrua com `--build`; sem ele o Compose reutiliza a imagem anterior. Depois recarregue a página sem cache.

**Quero ver a base gerada dentro do container.**

```bash
docker compose exec painel head -c 300 /usr/share/nginx/html/data/casos.js
```

## 10. Sem Docker

O painel também funciona sem container: abra `index.html` no navegador. Com as bibliotecas em `assets/vendor/`, isso também funciona offline. O Docker é conveniente para servir em rede local (por exemplo, para outras pessoas abrirem no celular durante a apresentação usando o IP da sua máquina, como `http://192.168.0.10:8080`) e para garantir o mesmo ambiente em qualquer computador.
