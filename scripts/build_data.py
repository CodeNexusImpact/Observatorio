#!/usr/bin/env python3
"""
Constrói a base de dados do painel a partir das planilhas do Observatório.

Entrada : "Banco de Dados Observatorio Racial Futebol -.xlsx" (abas 2014..2025)
          "Revisão.xlsx" (totais revisados, usados como referência de conferência)
Saída   : data/casos.js  -> window.ODRF_DATA = {meta, casos, referencia, qualidade, dominios}

Uso:
    python3 scripts/build_data.py                # base pública (sem nomes e textos livres)
    python3 scripts/build_data.py --completo     # inclui nomes, relatos e desfechos -> data/casos.interno.js

Depende apenas da biblioteca padrão do Python (3.10+).
"""
from __future__ import annotations

import argparse
import collections
import json
import os
import re
import sys
import unicodedata
from datetime import date, datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from xlsx_reader import load_workbook, sheet_to_records, excel_serial_to_date  # noqa: E402

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARQ_BASE = os.path.join(RAIZ, "Banco de Dados Observatorio Racial Futebol -.xlsx")
ARQ_REVISAO = os.path.join(RAIZ, "Revisão.xlsx")

ANOS = list(range(2014, 2026))

UF_NOME = {
    "AC": "Acre", "AL": "Alagoas", "AP": "Amapá", "AM": "Amazonas", "BA": "Bahia", "CE": "Ceará",
    "DF": "Distrito Federal", "ES": "Espírito Santo", "GO": "Goiás", "MA": "Maranhão", "MT": "Mato Grosso",
    "MS": "Mato Grosso do Sul", "MG": "Minas Gerais", "PA": "Pará", "PB": "Paraíba", "PR": "Paraná",
    "PE": "Pernambuco", "PI": "Piauí", "RJ": "Rio de Janeiro", "RN": "Rio Grande do Norte",
    "RS": "Rio Grande do Sul", "RO": "Rondônia", "RR": "Roraima", "SC": "Santa Catarina", "SP": "São Paulo",
    "SE": "Sergipe", "TO": "Tocantins",
}
UF_REGIAO = {
    **{uf: "Norte" for uf in ["AC", "AP", "AM", "PA", "RO", "RR", "TO"]},
    **{uf: "Nordeste" for uf in ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"]},
    **{uf: "Centro-Oeste" for uf in ["DF", "GO", "MT", "MS"]},
    **{uf: "Sudeste" for uf in ["ES", "MG", "RJ", "SP"]},
    **{uf: "Sul" for uf in ["PR", "RS", "SC"]},
}

NAO_SE_APLICA = "Não se aplica"
NAO_INFORMADO = "Não informado"

# Colunas com dados pessoais ou texto livre: ficam fora da base pública.
COLUNAS_SENSIVEIS = {
    "Nome": "nome",
    "Jogo": "jogo",
    "Fato": "fato",
    "Desfecho": "desfecho",
    "Nome Agressor": "nomeAgressor",
    "Decisão Justiça Desportiva": "decisaoDesportiva",
    "Quem punido ou absolvido": "quemPunido",
    "OBS": "obs",
}


# ----------------------------------------------------------------------------
# utilidades
# ----------------------------------------------------------------------------
def s(v) -> str:
    """Texto limpo (trim + espaços internos colapsados)."""
    if v is None:
        return ""
    return re.sub(r"\s+", " ", str(v)).strip()


def chave(v: str) -> str:
    """Chave de comparação: minúsculas e sem acentos."""
    t = unicodedata.normalize("NFD", s(v).lower())
    return "".join(c for c in t if unicodedata.category(c) != "Mn")


def eh_placeholder(v: str) -> str | None:
    """Detecta os marcadores estruturais que a planilha repete em todas as colunas."""
    k = chave(v)
    if k == "internet":
        return "Internet"
    if k in ("outros espacos", "outro espaco", "outros espaço"):
        return "Outros espaços"
    return None


def sim_nao(v: str, extras: dict[str, str] | None = None) -> tuple[str, str | None]:
    """Normaliza campos Sim/Não. Devolve (valor, detalhe_original_quando_outro)."""
    raw = s(v)
    k = chave(raw)
    if not k:
        return NAO_INFORMADO, None
    if k in ("sim", "s"):
        return "Sim", None
    if k in ("nao", "n"):
        return "Não", None
    if k.startswith("nao informado") or k.startswith("nao temos informacao") or k in ("nd", "xxx", "nao identificado", "nao houve identificacao"):
        return NAO_INFORMADO, None
    if extras:
        for prefixo, valor in extras.items():
            if k.startswith(prefixo):
                return valor, None
    return "Outro", raw


# ----------------------------------------------------------------------------
# competições
# ----------------------------------------------------------------------------
DEMONIMOS = [
    (r"\bgauch[oa]\b|\bgauchao\b", "Gaúcho"), (r"\bpaulista\b", "Paulista"), (r"\bcarioca\b", "Carioca"),
    (r"\bmineiro\b|\bmineirao\b", "Mineiro"), (r"\bparanaense\b", "Paranaense"), (r"\bcatarinense\b", "Catarinense"),
    (r"\bbaiano\b", "Baiano"), (r"\bpernam?n?bucano\b", "Pernambucano"), (r"\bcearense\b", "Cearense"),
    (r"\bpotiguar\b", "Potiguar"), (r"\bparaibano\b", "Paraibano"), (r"\balagoan[oa]\b|\balagoago\b", "Alagoano"),
    (r"\bsergipano\b|\bsegipano\b", "Sergipano"), (r"\bpiauiense\b", "Piauiense"), (r"\bmaranhense\b", "Maranhense"),
    (r"\bamazonense\b", "Amazonense"), (r"\bparaense\b", "Paraense"), (r"\bgoian[oe]\b|\bgoiaense\b|\bgoiania cup\b", "Goiano"),
    (r"\bbrasiliense\b|\bcandang[aã]o\b|\bcandango\b", "Candangão"), (r"\bcapixaba\b", "Capixaba"),
    (r"\bsul[- ]?mato[- ]?grossense\b|\bsul[- ]?matogrossense\b", "Sul-Mato-Grossense"), (r"\bmato[- ]?grossense\b", "Mato-Grossense"),
    (r"\btocantinense\b", "Tocantinense"), (r"\brondoniense\b", "Rondoniense"), (r"\bacreano\b", "Acreano"),
    (r"\bamapaense\b", "Amapaense"), (r"\broraimense\b", "Roraimense"),
]

PADROES_CANONICOS = [
    # internacionais
    (r"libertadores.*sub[- ]?20", "Copa Libertadores da América Sub-20", "Internacional"),
    (r"libertadores do nordeste", "Copa do Nordeste", "Nacional"),
    (r"libertadores", "Copa Libertadores da América", "Internacional"),
    (r"recopa", "Recopa Sul-Americana", "Internacional"),
    (r"sul[- ]?americana", "Copa Sul-Americana", "Internacional"),
    (r"copa america", "Copa América", "Internacional"),
    (r"eliminatorias", "Eliminatórias da Copa do Mundo", "Internacional"),
    (r"copa do mundo", "Copa do Mundo", "Internacional"),
    (r"jogos olimpicos", "Jogos Olímpicos", "Internacional"),
    (r"florida cup", "Florida Cup", "Internacional"),
    # nacionais
    (r"super ?copa do brasil", "Supercopa do Brasil", "Nacional"),
    (r"copa do brasil", "Copa do Brasil", "Nacional"),
    (r"copa do nordeste", "Copa do Nordeste", "Nacional"),
    (r"copa verde", "Copa Verde", "Nacional"),
    (r"copinha|copa sao paulo de futebol junior", "Copa São Paulo de Futebol Júnior", "Nacional"),
    (r"primeira liga", "Primeira Liga", "Nacional"),
    (r"brasil ladies cup|ladies cup", "Brasil Ladies Cup", "Nacional"),
    (r"brasileir(o|ao|a)? ?(feminino|feminina).*a ?1", "Brasileiro Feminino - A1", "Nacional"),
    (r"brasileir(o|ao|a)? ?(feminino|feminina).*a ?2", "Brasileiro Feminino - A2", "Nacional"),
    (r"brasileir(o|ao|a)? ?(feminino|feminina).*a ?3", "Brasileiro Feminino - A3", "Nacional"),
    (r"brasileir[oa]? ?sub[- ]?20", "Brasileiro Sub-20", "Nacional"),
    (r"brasileir(o|ao|a)\b.*\b(serie )?a\b", "Brasileiro - Série A", "Nacional"),
    (r"brasileir(o|ao|a)\b.*\b(serie )?b\b", "Brasileiro - Série B", "Nacional"),
    (r"brasileir(o|ao|a)\b.*\b(serie )?c\b", "Brasileiro - Série C", "Nacional"),
    (r"brasileir(o|ao|a)\b.*\b(serie )?d\b", "Brasileiro - Série D", "Nacional"),
    (r"^(campeonato )?brasileir(o|ao)$", "Brasileiro - Série A", "Nacional"),
]

REGIONAL_AMADOR = re.compile(
    r"amador|varzea|municipal|intermunicipal|\bliga\b|regional|interbairros|escolar|infantil|juvenil|"
    r"torneio|terrao|rural|aslivata|unipontal|copa magi|copa ouro|galo bravo|copa serrana|copa integracao|"
    r"taca baltazar|caldas cup|dani cup|copa uberaba|copa brasileirinho|copa cidade|josefense|ingazeirense|"
    r"regional do acucar|aabr|intermed|copa a gazetinha|campeonato estadual sub|setor frei|copa regional|"
    r"copa federacao|copa metropolitana|copa santiago|copa cidade do natal|taca bh|adn champions|ze camelo|familias"
)


def normaliza_competicao(raw: str, local: str) -> tuple[str, str]:
    """Devolve (competição canônica, âmbito)."""
    txt = s(raw)
    k = chave(txt)
    if not k or eh_placeholder(txt):
        return NAO_SE_APLICA, NAO_SE_APLICA
    if k.startswith("sem identificacao") or k.startswith("nao identificad") or k.startswith("nao indentificad") or k == "nd":
        return "Não identificada", "Não identificada"
    if k in ("amador", "campeonato amador", "futebol amador", "campeonato de futebol amador"):
        return "Campeonato amador", "Regional, amador ou escolar"
    if k in ("base", "base - amador", "base amador"):
        return "Base (amador)", "Regional, amador ou escolar"

    for padrao, nome, ambito in PADROES_CANONICOS:
        if re.search(padrao, k):
            return nome, ambito

    # estaduais: demônimo + sufixos
    for padrao, base in DEMONIMOS:
        if re.search(padrao, k):
            suf = []
            if re.search(r"feminin[oa]", k):
                suf.append("Feminino")
            m = re.search(r"sub[- ]?(\d{2})", k)
            if m:
                suf.append(f"Sub-{m.group(1)}")
            if re.search(r"\ba ?4\b|serie a4|4. divisao|4a divisao|quarta divisao", k):
                suf.append("A4" if base == "Paulista" else "4ª Divisão")
            elif re.search(r"\ba ?3\b|serie a3|terceira|3. divisao|3a divisao", k):
                suf.append("A3" if base == "Paulista" else "3ª Divisão")
            elif re.search(r"\ba ?2\b|serie a2|divisao de acesso|segunda divisao|2. divisao|2a divisao|serie b\b|modulo (ii|2)|segunda", k):
                if base == "Paulista" and re.search(r"\ba ?2\b", k):
                    suf.append("A2")
                elif base == "Mineiro":
                    suf.append("Módulo II")
                elif re.search(r"serie b", k):
                    suf.append("Série B")
                else:
                    suf.append("2ª Divisão")
            if re.search(r"futsal", k):
                suf.append("Futsal")
            if re.search(r"\bcopa\b|\btaca\b", k) and not re.search(r"copa (rs|fgf|paulista|rio|alagoas|santa catarina|goias|espirito santo)", k):
                # Ex.: "Copa Goiás Sub-20" continua estadual, mas "Copa Uberaba" é regional.
                pass
            ambito = "Estadual"
            if REGIONAL_AMADOR.search(k) and not m:
                ambito = "Regional, amador ou escolar"
            nome = base + (" " + " ".join(dict.fromkeys(suf)) if suf else "")
            return nome, ambito

    # copas e taças estaduais sem demônimo
    ESTADUAIS_EXTRA = {
        r"copa fgf": "Copa FGF", r"copa rs": "Copa RS", r"copa rio\b": "Copa Rio", r"taca rio": "Taça Rio",
        r"taca guanabara": "Taça Guanabara", r"copa alagoas": "Copa Alagoas", r"copa santa catarina": "Copa Santa Catarina",
        r"copa goias": "Copa Goiás", r"copa espirito santo": "Copa Espírito Santo", r"taca fpf": "Taça FPF",
        r"copa sul sub": "Copa Sul", r"copa paulista": "Copa Paulista",
    }
    for padrao, nome in ESTADUAIS_EXTRA.items():
        if re.search(padrao, k):
            m = re.search(r"sub[- ]?(\d{2})", k)
            return nome + (f" Sub-{m.group(1)}" if m else ""), "Estadual"

    if REGIONAL_AMADOR.search(k) or k in ("amador", "base", "base - amador", "futebol amador", "castelao"):
        return txt[0].upper() + txt[1:], "Regional, amador ou escolar"
    if k == "amistoso":
        return "Amistoso", "Outra"
    if k == "jogos escolares":
        return "Jogos Escolares", "Regional, amador ou escolar"
    return txt[0].upper() + txt[1:], "Outra"


# ----------------------------------------------------------------------------
# demais domínios
# ----------------------------------------------------------------------------
def normaliza_origem(raw: str) -> str:
    """Coluna 'Espaço': de onde partiu a agressão."""
    k = chave(raw)
    if not k or k.startswith("nao informado"):
        return NAO_INFORMADO
    ph = eh_placeholder(raw)
    if ph:
        return ph
    if "torcida" in k and "atleta" in k:
        return "Torcida e atleta"
    if "torcida" in k:
        return "Torcida"
    if "atleta" in k:
        return "Atleta"
    if "comissao" in k:
        return "Comissão técnica"
    if "dirigente" in k or "diretoria" in k:
        return "Dirigente"
    if "arbitr" in k:
        return "Arbitragem"
    if "polic" in k:
        return "Polícia"
    if "impre" in k:
        return "Imprensa"
    if "staff" in k or k in ("estadio", "campo"):
        return "Staff e organização"
    if "instagram" in k:
        return "Internet"
    return s(raw)


def normaliza_plataforma(raw_estadio: str) -> str:
    k = chave(raw_estadio)
    plataformas = []
    if "twitter" in k or re.search(r"\bx\b", k):
        plataformas.append("X (Twitter)")
    if "instagram" in k:
        plataformas.append("Instagram")
    if "facebook" in k:
        plataformas.append("Facebook")
    if "whatsapp" in k:
        plataformas.append("WhatsApp")
    if "youtube" in k:
        plataformas.append("YouTube")
    if "podcast" in k:
        plataformas.append("Podcast")
    if len(plataformas) > 1:
        return "Múltiplas plataformas"
    if plataformas:
        return plataformas[0]
    if "rede" in k:
        return "Rede social (não especificada)"
    return "Não especificada"


def normaliza_orgao(raw: str) -> str | None:
    t = s(raw)
    k = chave(t)
    if not k or k in ("nao", "sim") or k.startswith("nao informado") or k.startswith("nao temos"):
        return None
    if "conmebol" in k and "fifa" in k:
        return "FIFA e CONMEBOL"
    if "conmebol" in k:
        return "CONMEBOL"
    if k == "fifa":
        return "FIFA"
    if k in ("stjd", "sjtd"):
        return "STJD"
    m = re.match(r"^tjd\s*-?\s*([a-z]{2})$", k)
    if m:
        return "TJD-" + m.group(1).upper()
    if k.startswith("tjd - sorocaba"):
        return "TJD-SP (Sorocaba)"
    if k == "tjd":
        return "TJD (não especificado)"
    if "aslivata" in k:
        return "Aslivata (liga regional)"
    if "comissao" in k or "comite" in k or "coordenacao" in k:
        return "Comissão da competição"
    if "liga" in k:
        return "Liga regional"
    return t


def normaliza_genero(raw: str) -> str:
    k = chave(raw)
    if k.startswith("masc"):
        return "Masculino"
    if k.startswith("fem"):
        return "Feminino"
    if eh_placeholder(raw):
        return NAO_SE_APLICA
    return NAO_INFORMADO


def normaliza_categoria(raw: str) -> str:
    k = chave(raw)
    if k.startswith("prof"):
        return "Profissional"
    if k in ("base", "basa"):
        return "Base"
    if k.startswith("amador"):
        return "Amador"
    if eh_placeholder(raw):
        return NAO_SE_APLICA
    return NAO_INFORMADO


def normaliza_local(raw: str) -> str:
    k = chave(raw)
    if k.startswith("estadio"):
        return "Estádio"
    ph = eh_placeholder(raw)
    return ph or NAO_INFORMADO


def parse_data(raw, ano_aba: int) -> tuple[date | None, str | None]:
    """Devolve (data, código_de_problema)."""
    d = excel_serial_to_date(raw)
    if d:
        if d.year != ano_aba:
            return d, "data_ano_divergente"
        return d, None
    t = s(raw)
    m = re.match(r"^(\d{1,2})/(\d{1,2})/?(\d{4})$", t)  # ex.: "02/012021"
    if m:
        try:
            return date(int(m.group(3)), int(m.group(2)), int(m.group(1))), "data_formato_corrigido"
        except ValueError:
            pass
    m = re.match(r"^(\d{1,2})/(\d{2})(\d{4})$", t.replace(" ", ""))
    if m:
        try:
            return date(int(m.group(3)), int(m.group(2)), int(m.group(1))), "data_formato_corrigido"
        except ValueError:
            pass
    return None, "data_invalida"


# ----------------------------------------------------------------------------
# construção dos registros
# ----------------------------------------------------------------------------
def construir(completo: bool):
    wb = load_workbook(ARQ_BASE)
    casos = []
    problemas = []  # {id, aba, linha, codigo, detalhe}
    numeros = collections.Counter()

    def marca(caso, codigo, detalhe=""):
        caso["_q"].append(codigo)
        problemas.append({"id": caso["id"], "aba": caso["ano"], "linha": caso["_linha"], "codigo": codigo, "detalhe": detalhe})

    for ano in ANOS:
        nome_aba = str(ano)
        if nome_aba not in wb:
            continue
        cab, recs = sheet_to_records(wb[nome_aba])
        for seq, r in enumerate(recs, start=1):
            g = lambda col: s(r.get(col))  # noqa: E731
            caso = {"id": f"{ano}-{seq:03d}", "_linha": r["_row"], "_q": []}
            caso["numero"] = g("Número") or None
            caso["ano"] = ano

            d, prob = parse_data(r.get("Data"), ano)
            caso["data"] = d.isoformat() if d else None
            caso["mes"] = d.month if d and not prob == "data_ano_divergente" else (d.month if d else None)
            if prob:
                marca(caso, prob, f"Data='{s(r.get('Data'))}'")

            local = normaliza_local(g("Local"))
            caso["local"] = local
            caso["ambiente"] = "Online" if local == "Internet" else "Presencial"
            if local == NAO_INFORMADO:
                marca(caso, "local_nao_informado", g("Local"))

            # território
            estado_raw = g("Estado")
            uf = estado_raw.upper() if estado_raw.upper() in UF_NOME else None
            pais_raw = g("País")
            regiao_raw = g("Região")
            caso["uf"] = uf
            if uf:
                caso["estado"] = UF_NOME[uf]
                caso["regiao"] = UF_REGIAO[uf]
                caso["pais"] = "Brasil"
                if regiao_raw and chave(regiao_raw) != chave(UF_REGIAO[uf]):
                    marca(caso, "regiao_corrigida", f"{estado_raw}: '{regiao_raw}' -> '{UF_REGIAO[uf]}'")
            elif eh_placeholder(estado_raw):
                caso["estado"] = NAO_SE_APLICA
                caso["regiao"] = NAO_SE_APLICA
                caso["pais"] = NAO_SE_APLICA if eh_placeholder(pais_raw) or not pais_raw else pais_raw
            else:
                pais = pais_raw if pais_raw and chave(pais_raw) not in ("nd", "") and not eh_placeholder(pais_raw) else None
                if pais and chave(pais) != "brasil":
                    caso["estado"] = "Exterior"
                    caso["regiao"] = "Exterior"
                    caso["pais"] = pais
                else:
                    caso["estado"] = NAO_INFORMADO
                    caso["regiao"] = NAO_INFORMADO
                    caso["pais"] = pais or NAO_INFORMADO
                    marca(caso, "territorio_nao_informado", f"Estado='{estado_raw}', País='{pais_raw}'")
            cidade = g("Cidade")
            caso["cidade"] = None if (eh_placeholder(cidade) or chave(cidade) in ("", "nd", "nao identificado", "nao ideitificado", "sem identificacao")) else cidade

            estadio = g("Estádio")
            if local == "Internet":
                caso["plataforma"] = normaliza_plataforma(estadio)
                caso["localDetalhe"] = None if eh_placeholder(estadio) else estadio
            elif local == "Outros espaços":
                caso["plataforma"] = None
                caso["localDetalhe"] = None if eh_placeholder(estadio) else estadio
            else:
                caso["plataforma"] = None
                caso["localDetalhe"] = None if chave(estadio) in ("", "sem identificacao", "nao informado", "nao identificado") else estadio

            comp_raw = g("Competição")
            comp, ambito = normaliza_competicao(comp_raw, local)
            caso["competicao"] = comp
            caso["competicaoOriginal"] = comp_raw or None
            caso["ambito"] = ambito

            caso["genero"] = normaliza_genero(g("Gênero"))
            caso["categoria"] = normaliza_categoria(g("Categoria"))
            if chave(g("Categoria")) in ("basa", "nao indentificado"):
                marca(caso, "grafia_corrigida", f"Categoria='{g('Categoria')}'")
            caso["origem"] = normaliza_origem(g("Espaço"))

            bo, bo_det = sim_nao(g("Boletim de Ocorrência"), {"oficio ao mp": "Ofício ao MP"})
            caso["boletim"] = bo
            caso["boletimDetalhe"] = bo_det
            su, _ = sim_nao(g("Súmula"))
            caso["sumula"] = su
            pc, pc_det = sim_nao(
                g("Punição Justiça comum"),
                {"absolvid": "Absolvido", "acordo": "Acordo", "em andamento": "Em andamento", "arquivad": "Arquivado",
                 "segredo": "Segredo de justiça", "liberad": "Liberado", "termo de renuncia": "Termo de renúncia"},
            )
            caso["punicaoComum"] = pc
            caso["punicaoComumDetalhe"] = pc_det
            jd_raw = g("Julgamento Justiça Desportiva")
            pd_raw = g("Punição Justiça Desportiva")
            pdk = chave(pd_raw)
            if pdk.startswith("sim"):
                pdv = "Sim"
            elif pdk.startswith("absolvid"):
                pdv = "Absolvido"
            elif pdk == "nao":
                pdv = "Não"
            else:
                pdv = NAO_INFORMADO
                if not pd_raw:
                    marca(caso, "punicao_desportiva_vazia")
                elif pdk == "xxx":
                    marca(caso, "valor_invalido", f"Punição JD='{pd_raw}'")
            caso["punicaoDesportiva"] = pdv
            julgado = chave(jd_raw).startswith("sim") or pdv in ("Sim", "Absolvido")
            caso["julgamentoDesportivo"] = "Sim" if julgado else "Não"
            if pdv in ("Sim", "Absolvido") and not chave(jd_raw).startswith("sim"):
                marca(caso, "julgamento_nao_marcado", f"Punição JD='{pd_raw}' sem 'Julgamento JD = Sim'")
            orgao = normaliza_orgao(g("Orgão de Justiça Desportiva"))
            caso["orgao"] = orgao
            if pdv in ("Sim", "Absolvido") and not orgao:
                marca(caso, "orgao_ausente_com_decisao")
            ai, _ = sim_nao(g("Agressor Identificado"))
            caso["agressorIdentificado"] = ai

            if pdv == "Sim":
                caso["desdobramento"] = "Punido"
            elif pdv == "Absolvido":
                caso["desdobramento"] = "Absolvido"
            elif pdv == "Não":
                caso["desdobramento"] = "Não julgado"
            else:
                caso["desdobramento"] = NAO_INFORMADO
            if pdv == "Sim" or pc == "Sim":
                caso["responsabilizacao"] = "Sim"
            elif pdv == NAO_INFORMADO and pc == NAO_INFORMADO:
                caso["responsabilizacao"] = NAO_INFORMADO
            else:
                caso["responsabilizacao"] = "Não"

            link = g("Link")
            caso["fonte"] = link if link.startswith("http") else None

            for col_raw, col_norm in [("Boletim de Ocorrência", bo), ("Súmula", su), ("Agressor Identificado", ai)]:
                if chave(g(col_raw)) in ("sim", "nao") and g(col_raw) not in ("Sim", "Não"):
                    marca(caso, "grafia_corrigida", f"{col_raw}='{g(col_raw)}'")
            if comp == "Não identificada":
                marca(caso, "competicao_nao_identificada", comp_raw)
            if caso["numero"]:
                numeros[caso["numero"]] += 1

            if completo:
                for col, campo in COLUNAS_SENSIVEIS.items():
                    caso[campo] = g(col) or None
            casos.append(caso)

    for c in casos:
        if c["numero"] and numeros[c["numero"]] > 1:
            marca(c, "numero_duplicado", c["numero"])

    for c in casos:
        c["qualidade"] = sorted(set(c.pop("_q")))
        c["linhaPlanilha"] = c.pop("_linha")
    return casos, problemas


def ler_referencia():
    """Totais revisados pela equipe (Revisão.xlsx), usados para conferência no painel."""
    wr = load_workbook(ARQ_REVISAO)

    def linha(aba, rotulo, col_ini="B", n=11, coluna_rotulo="A"):
        for _, cells in wr[aba]:
            if chave(cells.get(coluna_rotulo, "")) == chave(rotulo):
                cols = [chr(ord(col_ini) + i) for i in range(n)]
                return [int(float(cells.get(c, 0) or 0)) for c in cols]
        return None

    anos = [str(a) for a in range(2014, 2025)]
    ref = {"anos": anos}
    ref["totalPorAno"] = dict(zip(anos, linha("Geral", "Revisão")))
    ref["localPorAno"] = {
        "Estádio": dict(zip(anos, linha("Local", "Estádios", "C", coluna_rotulo="B"))),
        "Internet": dict(zip(anos, linha("Local", "Internet", "C", coluna_rotulo="B"))),
        "Outros espaços": dict(zip(anos, linha("Local", "Outros Espaços", "C", coluna_rotulo="B"))),
    }
    ref["regiaoEstadios"] = {}
    for reg in ["Centro-Oeste", "Nordeste", "Norte", "Sudeste", "Sul"]:
        ref["regiaoEstadios"][reg] = sum(linha("Região", reg))
    ref["exteriorEstadios"] = sum(linha("Região", "Exterior"))
    ref["estadosEstadios"] = {}
    for _, cells in wr["Estados"]:
        a = s(cells.get("A", ""))
        if a in UF_NOME:
            ref["estadosEstadios"][a] = int(float(cells.get("N", 0) or 0))
    ref["julgamentos"] = {
        "Punido": sum(linha("Julgamentos", "PUNIDOS")),
        "Absolvido": sum(linha("Julgamentos", "ABSOLVIDOS")),
    }
    ref["generoEstadios"] = {
        "Masculino": sum(linha("Gênero", "Masculino")),
        "Feminino": sum(linha("Gênero", "Feminino")),
    }
    ref["conmebolPorAno"] = dict(zip(anos, [int(float(v or 0)) for v in [dict(wr["Conmebol"])[2].get(chr(ord("B") + i), 0) for i in range(11)]]))
    ref["observacao"] = (
        "Totais copiados da planilha Revisão.xlsx. Região, estado e gênero são contados pela equipe apenas para casos em estádio; "
        "o painel replica esse recorte na aba de conferência."
    )
    return ref


def dominios(casos):
    campos = ["ano", "local", "ambiente", "regiao", "estado", "pais", "ambito", "competicao", "genero", "categoria", "origem",
              "boletim", "sumula", "punicaoComum", "julgamentoDesportivo", "punicaoDesportiva", "orgao", "agressorIdentificado",
              "desdobramento", "responsabilizacao", "plataforma"]
    out = {}
    for f in campos:
        c = collections.Counter(str(x[f]) for x in casos if x.get(f) is not None)
        out[f] = dict(sorted(c.items(), key=lambda kv: (-kv[1], kv[0])))
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--completo", action="store_true", help="inclui colunas com nomes e textos livres (uso interno)")
    ap.add_argument("--saida", help="caminho do arquivo de saída")
    args = ap.parse_args()

    casos, problemas = construir(args.completo)
    ref = ler_referencia()

    resumo_q = collections.Counter(p["codigo"] for p in problemas)
    qualidade = {
        "totalProblemas": len(problemas),
        "registrosComProblema": sum(1 for c in casos if c["qualidade"]),
        "porCodigo": dict(resumo_q.most_common()),
        "descricoes": {
            "data_invalida": "Data não reconhecida (texto ou número fora do padrão de data do Excel).",
            "data_ano_divergente": "A data informada pertence a outro ano que não o da aba; o painel mantém o ano da aba.",
            "data_formato_corrigido": "Data digitada como texto fora do padrão; convertida automaticamente.",
            "regiao_corrigida": "Região incompatível com a UF; recalculada a partir da UF.",
            "territorio_nao_informado": "Sem UF e sem país válido.",
            "grafia_corrigida": "Variação de grafia ou maiúsculas normalizada (ex.: 'SIm', 'Basa').",
            "valor_invalido": "Valor sem significado (ex.: 'XXX').",
            "punicao_desportiva_vazia": "Coluna 'Punição Justiça Desportiva' em branco.",
            "julgamento_nao_marcado": "Há decisão desportiva registrada, mas 'Julgamento JD' não está marcado como Sim.",
            "orgao_ausente_com_decisao": "Há decisão desportiva, mas o órgão julgador não foi informado.",
            "competicao_nao_identificada": "Competição registrada como não identificada.",
            "numero_duplicado": "Número de caso repetido entre abas (ex.: 571 e 572 aparecem em 2023 e 2024).",
            "local_nao_informado": "Coluna 'Local' fora dos valores esperados.",
        },
        "problemas": problemas,
    }

    saida = args.saida or os.path.join(RAIZ, "data", "casos.interno.js" if args.completo else "casos.js")
    meta = {
        "geradoEm": datetime.now().isoformat(timespec="seconds"),
        "fonte": os.path.basename(ARQ_BASE),
        "referencia": os.path.basename(ARQ_REVISAO),
        "totalCasos": len(casos),
        "anoInicial": min(c["ano"] for c in casos),
        "anoFinal": max(c["ano"] for c in casos),
        "perfil": "interno" if args.completo else "publico",
        "camposSensiveisIncluidos": args.completo,
        "ufRegiao": UF_REGIAO,
        "ufNome": UF_NOME,
    }
    payload = {"meta": meta, "casos": casos, "referencia": ref, "qualidade": qualidade, "dominios": dominios(casos)}
    os.makedirs(os.path.dirname(saida), exist_ok=True)
    with open(saida, "w", encoding="utf-8") as f:
        f.write("// Arquivo gerado por scripts/build_data.py. Não edite manualmente.\n")
        f.write("window.ODRF_DATA = ")
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")

    print(f"{len(casos)} casos gravados em {os.path.relpath(saida, RAIZ)} ({os.path.getsize(saida)//1024} KB)")
    print(f"problemas de qualidade: {len(problemas)} em {qualidade['registrosComProblema']} registros")
    for k, v in resumo_q.most_common():
        print(f"  {v:4d}  {k}")
    if args.completo:
        print("ATENÇÃO: o arquivo contém nomes e relatos. Não publique nem versione este arquivo.")


if __name__ == "__main__":
    main()
