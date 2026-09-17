# =============================================================================
# ODRF — Painel de Dados
# Imagem em duas etapas:
#   1. "dados"  : Python gera data/casos.js a partir das planilhas .xlsx
#   2. final    : nginx serve o site estático (index.html, assets, data)
#
# Build:  docker build -t odrf-painel .
# Run:    docker run --rm -p 8080:80 odrf-painel   ->  http://localhost:8080
# =============================================================================

# ---------- etapa 1: gerar a base a partir das planilhas ----------------------
FROM python:3.12-alpine AS dados
WORKDIR /build
COPY scripts/ ./scripts/
COPY ["Banco de Dados Observatorio Racial Futebol -.xlsx", "Revisão.xlsx", "./"]
# Só a biblioteca padrão é usada; nenhum pip install.
RUN python3 scripts/build_data.py

# ---------- etapa 2: servidor estático ---------------------------------------
FROM nginx:1.27-alpine AS final
LABEL org.opencontainers.image.title="ODRF Painel de Dados" \
      org.opencontainers.image.description="Painel do Observatório da Discriminação Racial no Futebol (protótipo)" \
      org.opencontainers.image.source="local"

# Configuração do nginx (gzip, cache curto, fallback para index.html)
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Site estático
WORKDIR /usr/share/nginx/html
RUN rm -f ./*
COPY index.html ./
COPY assets/ ./assets/
COPY docs/ ./docs/
COPY --from=dados /build/data/casos.js ./data/casos.js

# Verificação de saúde: a página inicial responde
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

EXPOSE 80
