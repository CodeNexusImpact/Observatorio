/* =========================================================================
   ODRF — Painel de Dados
   Lógica de interface. Lê window.ODRF_DATA (gerado por scripts/build_data.py).
   Sem frameworks: JavaScript puro + Chart.js + SlimSelect + SheetJS.
   ========================================================================= */
(() => {
  "use strict";

  // ------------------------------------------------------------------ dados
  const D = window.ODRF_DATA;
  const $ = (id) => document.getElementById(id);
  if (!D || !Array.isArray(D.casos)) {
    document.body.innerHTML =
      '<div style="padding:40px;font-family:sans-serif"><h1>Base de dados não encontrada</h1><p>Gere o arquivo <code>data/casos.js</code> com <code>python3 scripts/build_data.py</code> e recarregue a página.</p></div>';
    return;
  }
  const CASOS = D.casos;
  const NA = "Não se aplica";
  const NI = "Não informado";
  const ANO_CORRENTE = new Date().getFullYear();
  const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const MESES_CURTO = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  // Regra de privacidade: o público vê apenas anos anteriores ao corrente.
  const publico = (r) => r.ano < ANO_CORRENTE;

  // ------------------------------------------------------------------ estado
  let internal = false;
  let filtered = [];
  let page = 1;
  let pageSize = 25;
  let sortKey = "data";
  let sortDir = "desc";
  let exportType = "csv";
  let qualityCode = "";
  const ss = {};
  const charts = {};

  // ------------------------------------------------------------------ campos
  const FILTROS = {
    ano: { label: "Ano", ph: "Todos os anos", num: true },
    mes: { label: "Mês", ph: "Todos os meses", num: true, fmt: (v) => MESES[Number(v) - 1] || v },
    regiao: { label: "Região", ph: "Todas as regiões" },
    estado: { label: "Estado", ph: "Todos os estados" },
    cidade: { label: "Cidade", ph: "Todas as cidades" },
    pais: { label: "País", ph: "Todos os países" },
    local: { label: "Local", ph: "Todos" },
    plataforma: { label: "Plataforma", ph: "Todas" },
    ambito: { label: "Âmbito", ph: "Todos" },
    competicao: { label: "Competição", ph: "Todas" },
    categoria: { label: "Categoria", ph: "Todas" },
    genero: { label: "Gênero", ph: "Todos" },
    origem: { label: "Origem da agressão", ph: "Todas" },
    boletim: { label: "Boletim de ocorrência", ph: "Todos" },
    sumula: { label: "Súmula", ph: "Todos" },
    desdobramento: { label: "Justiça desportiva", ph: "Todos" },
    orgao: { label: "Órgão julgador", ph: "Todos" },
    punicaoComum: { label: "Justiça comum", ph: "Todos" },
    agressorIdentificado: { label: "Agressor identificado", ph: "Todos" },
    responsabilizacao: { label: "Alguma punição", ph: "Todos" },
  };
  const FKEYS = Object.keys(FILTROS);
  const ORDEM_FIXA = {
    desdobramento: ["Punido", "Absolvido", "Não julgado", NI],
    local: ["Estádio", "Internet", "Outros espaços"],
    ambito: ["Internacional", "Nacional", "Estadual", "Regional, amador ou escolar", "Outra", "Não identificada", NA],
    boletim: ["Sim", "Não", NI],
    sumula: ["Sim", "Não", NI],
    agressorIdentificado: ["Sim", "Não", NI],
    responsabilizacao: ["Sim", "Não", NI],
    regiao: ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul", "Exterior", NA, NI],
  };

  const fmtDate = (iso) => {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };
  const cidadeUF = (r) => {
    if (r.cidade && r.uf) return `${r.cidade} (${r.uf})`;
    if (r.cidade && r.pais && r.pais !== "Brasil" && r.pais !== NA) return `${r.cidade} (${r.pais})`;
    if (r.cidade) return r.cidade;
    if (r.uf) return r.uf;
    if (r.estado === "Exterior") return r.pais;
    return "—";
  };
  const localDesc = (r) => {
    if (r.local === "Internet") return r.plataforma && r.plataforma !== "Não especificada" ? `Internet · ${r.plataforma}` : "Internet";
    if (r.local === "Outros espaços") return r.localDetalhe ? `Outros espaços · ${r.localDetalhe}` : "Outros espaços";
    return r.localDetalhe || "Estádio";
  };

  // Colunas da tabela e da exportação
  const COLS = [
    { k: "numero", l: "Nº", get: (r) => r.numero || r.id, table: true, num: true },
    { k: "data", l: "Data", get: (r) => fmtDate(r.data), table: true },
    { k: "ano", l: "Ano", get: (r) => r.ano, table: false, num: true },
    { k: "localDesc", l: "Local", get: localDesc, table: true, sortGet: (r) => localDesc(r) },
    { k: "cidadeUF", l: "Cidade / UF", get: cidadeUF, table: true, sortGet: cidadeUF },
    { k: "regiao", l: "Região", get: (r) => r.regiao, table: true },
    { k: "pais", l: "País", get: (r) => r.pais, table: false },
    { k: "competicao", l: "Competição", get: (r) => r.competicao, table: true },
    { k: "ambito", l: "Âmbito", get: (r) => r.ambito, table: false },
    { k: "categoria", l: "Categoria", get: (r) => r.categoria, table: true },
    { k: "genero", l: "Gênero", get: (r) => r.genero, table: true },
    { k: "origem", l: "Origem da agressão", get: (r) => r.origem, table: true },
    { k: "boletim", l: "B.O.", get: (r) => r.boletim, table: true },
    { k: "sumula", l: "Súmula", get: (r) => r.sumula, table: true },
    { k: "desdobramento", l: "Justiça desportiva", get: (r) => r.desdobramento, table: true, pill: true },
    { k: "orgao", l: "Órgão", get: (r) => r.orgao || "—", table: true },
    { k: "punicaoComum", l: "Justiça comum", get: (r) => r.punicaoComum, table: false },
    { k: "agressorIdentificado", l: "Agressor identificado", get: (r) => r.agressorIdentificado, table: false },
    { k: "responsabilizacao", l: "Alguma punição", get: (r) => r.responsabilizacao, table: false },
    { k: "fonte", l: "Fonte", get: (r) => r.fonte || "", table: false },
  ];

  // ------------------------------------------------------------------ utilidades
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
  const pctTxt = (a, b) => `${pct(a, b).toLocaleString("pt-BR")}%`;
  const num = (n) => Number(n).toLocaleString("pt-BR");
  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const palette = () => ["--c1", "--c2", "--c3", "--c4", "--c5", "--c6", "--c7"].map(cssVar);
  const count = (rows, key, fn) => {
    const g = {};
    rows.forEach((r) => {
      const v = fn ? fn(r) : r[key];
      if (v === null || v === undefined) return;
      g[v] = (g[v] || 0) + 1;
    });
    return g;
  };
  const sortedEntries = (g, exclude = []) =>
    Object.entries(g)
      .filter(([k]) => !exclude.includes(k))
      .sort((a, b) => b[1] - a[1]);
  let toastTimer;
  const toast = (msg) => {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
  };

  // ------------------------------------------------------------------ registros visíveis
  const visiveis = () => (internal ? CASOS : CASOS.filter(publico));
  const anosVisiveis = () => {
    const anos = [...new Set(visiveis().map((r) => r.ano))].sort();
    return anos.length ? `${anos[0]}–${anos[anos.length - 1]}` : "—";
  };

  // ------------------------------------------------------------------ filtros
  const getVals = (f) => {
    if (ss[f]) {
      const v = ss[f].getSelected();
      return (Array.isArray(v) ? v : [v]).filter((x) => x !== "" && x !== null && x !== undefined).map(String);
    }
    return [];
  };
  const setVals = (f, vals) => {
    if (ss[f]) ss[f].setSelected(vals.map(String), false);
  };
  const ordena = (f, vals) => {
    const fixa = ORDEM_FIXA[f];
    if (fixa) return vals.sort((a, b) => (fixa.indexOf(a) === -1 ? 99 : fixa.indexOf(a)) - (fixa.indexOf(b) === -1 ? 99 : fixa.indexOf(b)) || a.localeCompare(b, "pt-BR"));
    if (FILTROS[f].num) return vals.sort((a, b) => Number(a) - Number(b));
    return vals.sort((a, b) => {
      const ta = a === NA || a === NI ? 1 : 0;
      const tb = b === NA || b === NI ? 1 : 0;
      return ta - tb || a.localeCompare(b, "pt-BR");
    });
  };
  const dominio = (f, rows) => ordena(f, [...new Set(rows.map((r) => r[f]).filter((v) => v !== null && v !== undefined))].map(String));

  const fill = (f, vals) => {
    const el = $("f-" + f);
    if (!el) return;
    const cur = getVals(f);
    const fmt = FILTROS[f].fmt || ((v) => v);
    if (!ss[f]) {
      ss[f] = new SlimSelect({
        select: el,
        settings: { placeholderText: FILTROS[f].ph, allowDeselect: true, closeOnSelect: false, hideSelected: false, showSearch: vals.length > 8, searchPlaceholder: "Buscar", searchText: "Nenhum resultado" },
        events: { afterChange: () => onFilterChange(f) },
      });
    }
    ss[f].setData(vals.map((v) => ({ text: String(fmt(v)), value: String(v) })));
    ss[f].setSelected(cur.filter((c) => vals.includes(c)), false);
  };

  const refreshOptions = (changed) => {
    const base = visiveis();
    if (!changed) FKEYS.filter((f) => !["estado", "cidade"].includes(f)).forEach((f) => fill(f, dominio(f, base)));
    const rg = getVals("regiao");
    const stSrc = rg.length ? base.filter((r) => rg.includes(String(r.regiao))) : base;
    if (!changed || changed === "regiao") fill("estado", dominio("estado", stSrc));
    const st = getVals("estado");
    const ctSrc = stSrc.filter((r) => !st.length || st.includes(String(r.estado)));
    if (!changed || ["regiao", "estado"].includes(changed)) fill("cidade", dominio("cidade", ctSrc));
  };

  const filtrosAtivos = () => Object.fromEntries(FKEYS.map((f) => [f, getVals(f)]).filter(([, v]) => v.length));

  const apply = () => {
    const ativos = filtrosAtivos();
    filtered = visiveis().filter((r) => Object.entries(ativos).every(([k, arr]) => arr.includes(String(r[k]))));
    page = 1;
    renderQuery();
    syncHash();
  };

  let changing = false;
  const onFilterChange = (f) => {
    if (changing) return;
    changing = true;
    try {
      if (["regiao", "estado"].includes(f)) refreshOptions(f);
      apply();
    } finally {
      changing = false;
    }
  };

  const clearFilters = () => {
    FKEYS.forEach((f) => setVals(f, []));
    refreshOptions();
    apply();
  };

  // ------------------------------------------------------------------ link compartilhável
  const syncHash = () => {
    const ativos = filtrosAtivos();
    const view = document.querySelector(".view.active")?.id.replace("view-", "") || "overview";
    const p = new URLSearchParams();
    Object.entries(ativos).forEach(([k, v]) => p.set(k, v.join("|")));
    const q = p.toString();
    const novo = view === "consulta" && q ? `#consulta?${q}` : `#${view}`;
    if (location.hash !== novo) history.replaceState(null, "", novo);
  };
  const readHash = () => {
    const h = location.hash.replace(/^#/, "");
    if (!h) return { view: "overview", filtros: {} };
    const [view, q] = h.split("?");
    const filtros = {};
    if (q) new URLSearchParams(q).forEach((v, k) => (FILTROS[k] ? (filtros[k] = v.split("|")) : null));
    return { view, filtros };
  };

  // ------------------------------------------------------------------ gráficos
  const chartTheme = () => {
    Chart.defaults.color = cssVar("--muted");
    Chart.defaults.borderColor = cssVar("--grid");
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    Chart.defaults.font.size = 11;
  };
  const canvasIn = (id) => {
    const box = $(id);
    if (charts[id]) {
      charts[id].destroy();
      delete charts[id];
    }
    box.innerHTML = "<canvas></canvas>";
    return box.querySelector("canvas").getContext("2d");
  };
  const empty = (id, msg = "Sem dados no recorte.") => {
    if (charts[id]) {
      charts[id].destroy();
      delete charts[id];
    }
    $(id).innerHTML = `<div class="empty">${esc(msg)}</div>`;
  };

  const chartAnual = (id, rows, porLocal) => {
    const anos = [...new Set(rows.map((r) => r.ano))].sort();
    if (!anos.length) return empty(id);
    const pal = palette();
    let datasets;
    if (porLocal) {
      const locais = ["Estádio", "Internet", "Outros espaços"];
      datasets = locais.map((loc, i) => ({
        label: loc,
        data: anos.map((a) => rows.filter((r) => r.ano === a && r.local === loc).length),
        backgroundColor: pal[i],
        borderRadius: 4,
        stack: "casos",
      }));
    } else {
      datasets = [{ label: "Casos", data: anos.map((a) => rows.filter((r) => r.ano === a).length), backgroundColor: pal[0], borderRadius: 6 }];
    }
    charts[id] = new Chart(canvasIn(id), {
      type: "bar",
      data: { labels: anos, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: !!porLocal, position: "bottom" }, tooltip: { callbacks: porLocal ? { footer: (items) => "Total: " + items.reduce((s, i) => s + i.parsed.y, 0) } : {} } },
        scales: { x: { stacked: !!porLocal, grid: { display: false } }, y: { stacked: !!porLocal, beginAtZero: true, ticks: { precision: 0 } } },
      },
    });
    $(id).setAttribute("aria-label", `Casos por ano: ${anos.map((a) => `${a}: ${rows.filter((r) => r.ano === a).length}`).join(", ")}`);
  };

  const chartDonut = (id, g, ordem) => {
    const entries = ordem ? ordem.filter((k) => g[k]).map((k) => [k, g[k]]) : sortedEntries(g);
    if (!entries.length) return empty(id);
    const pal = palette();
    const total = entries.reduce((s, e) => s + e[1], 0);
    charts[id] = new Chart(canvasIn(id), {
      type: "doughnut",
      data: { labels: entries.map((e) => e[0]), datasets: [{ data: entries.map((e) => e[1]), backgroundColor: entries.map((_, i) => pal[i % pal.length]), borderColor: cssVar("--panel"), borderWidth: 2 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: {
          legend: { position: "bottom", labels: { boxWidth: 10, padding: 10 } },
          tooltip: { callbacks: { label: (i) => ` ${i.label}: ${num(i.parsed)} (${pctTxt(i.parsed, total)})` } },
        },
      },
    });
    $(id).setAttribute("aria-label", entries.map(([k, v]) => `${k}: ${v} (${pctTxt(v, total)})`).join(", "));
  };

  const chartMes = (id, rows) => {
    const g = count(rows, "mes");
    if (!Object.keys(g).length) return empty(id);
    charts[id] = new Chart(canvasIn(id), {
      type: "bar",
      data: { labels: MESES_CURTO, datasets: [{ label: "Casos", data: MESES_CURTO.map((_, i) => g[i + 1] || 0), backgroundColor: palette()[2], borderRadius: 6 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 } } } },
    });
  };

  const renderList = (id, g, { exclude = [], top = 8, total } = {}) => {
    const rows = sortedEntries(g, exclude).slice(0, top);
    const max = Math.max(1, ...rows.map((x) => x[1]));
    const tot = total || rows.reduce((s, x) => s + x[1], 0);
    $(id).innerHTML = rows.length
      ? rows
          .map(([k, v]) => `<div class="list-row" title="${esc(k)}: ${num(v)} (${pctTxt(v, tot)})"><strong>${esc(k)}</strong><div class="meter"><span style="width:${Math.round((v / max) * 100)}%"></span></div><span class="n">${num(v)}</span></div>`)
          .join("")
      : '<div class="hint">Sem dados no recorte.</div>';
  };

  const renderFunil = (id, rows) => {
    const total = rows.length;
    const passos = [
      ["Casos monitorados", total],
      ["Boletim de ocorrência", rows.filter((r) => r.boletim === "Sim").length],
      ["Registro em súmula", rows.filter((r) => r.sumula === "Sim").length],
      ["Julgados pela justiça desportiva", rows.filter((r) => r.julgamentoDesportivo === "Sim").length],
      ["Punidos pela justiça desportiva", rows.filter((r) => r.punicaoDesportiva === "Sim").length],
      ["Punidos pela justiça comum", rows.filter((r) => r.punicaoComum === "Sim").length],
    ];
    $(id).innerHTML = passos
      .map(([l, v]) => `<div class="funnel-step"><span>${l}</span><span class="pct">${num(v)} · ${pctTxt(v, total)}</span><div class="bar"><span style="width:${total ? Math.max(1, (v / total) * 100) : 0}%"></span></div></div>`)
      .join("");
  };

  // ------------------------------------------------------------------ resumo automático
  const resumo = (rows, escopo) => {
    if (!rows.length) return "Nenhum caso no recorte.";
    const total = rows.length;
    const anos = [...new Set(rows.map((r) => r.ano))].sort();
    const est = rows.filter((r) => r.local === "Estádio");
    const online = rows.filter((r) => r.local === "Internet").length;
    const regioes = sortedEntries(count(est, "regiao"), [NA, NI, "Exterior"]);
    const origem = sortedEntries(count(rows, "origem"), [NA, NI, "Internet", "Outros espaços"]);
    const julgados = rows.filter((r) => r.julgamentoDesportivo === "Sim").length;
    const punidos = rows.filter((r) => r.punicaoDesportiva === "Sim").length;
    const bo = rows.filter((r) => r.boletim === "Sim").length;
    const ident = rows.filter((r) => r.agressorIdentificado === "Sim").length;
    const frases = [];
    frases.push(`${escopo || "O recorte"} reúne ${num(total)} caso${total > 1 ? "s" : ""} de discriminação racial no futebol${anos.length > 1 ? ` entre ${anos[0]} e ${anos[anos.length - 1]}` : ` em ${anos[0]}`}.`);
    frases.push(`${pctTxt(est.length, total)} ocorreram em estádios e ${pctTxt(online, total)} em ambiente digital.`);
    if (regioes.length) frases.push(`Entre os casos em estádios no Brasil, a região ${regioes[0][0]} concentra ${pctTxt(regioes[0][1], est.filter((r) => r.pais === "Brasil").length)} das ocorrências.`);
    if (origem.length) frases.push(`A agressão parte da ${origem[0][0].toLowerCase()} em ${pctTxt(origem[0][1], total)} dos casos.`);
    frases.push(`${pctTxt(bo, total)} dos casos tiveram boletim de ocorrência e o agressor foi identificado em ${pctTxt(ident, total)}.`);
    frases.push(`${num(julgados)} caso${julgados !== 1 ? "s foram julgados" : " foi julgado"} pela justiça desportiva, com ${num(punidos)} punição${punidos !== 1 ? "ões" : ""} (${pctTxt(punidos, julgados)} dos julgados; ${pctTxt(punidos, total)} do total).`);
    return frases.join(" ");
  };

  // ------------------------------------------------------------------ visão geral
  const renderOverview = () => {
    const rows = visiveis();
    const total = rows.length;
    const est = rows.filter((r) => r.local === "Estádio");
    const online = rows.filter((r) => r.local === "Internet").length;
    const punidos = rows.filter((r) => r.punicaoDesportiva === "Sim").length;
    const julgados = rows.filter((r) => r.julgamentoDesportivo === "Sim").length;
    const ident = rows.filter((r) => r.agressorIdentificado === "Sim").length;
    const bo = rows.filter((r) => r.boletim === "Sim").length;

    $("ovCases").textContent = num(total);
    $("ovCasesSub").textContent = `casos entre ${anosVisiveis()}`;
    $("ovStadium").textContent = pctTxt(est.length, total);
    $("ovStadiumSub").textContent = `${num(est.length)} casos em estádios`;
    $("ovOnline").textContent = pctTxt(online, total);
    $("ovOnlineSub").textContent = `${num(online)} casos na internet`;
    $("ovPunished").textContent = num(punidos);
    $("ovPunishedSub").textContent = `${pctTxt(punidos, julgados)} dos ${num(julgados)} julgados`;
    $("ovIdentified").textContent = pctTxt(ident, total);
    $("ovIdentifiedSub").textContent = `${num(ident)} casos com agressor identificado`;
    $("ovBO").textContent = pctTxt(bo, total);
    $("ovBOSub").textContent = `${num(bo)} casos com boletim de ocorrência`;
    $("baseText").textContent = `${num(total)} casos · ${anosVisiveis()}`;
    $("ovChips").innerHTML = [`Dados públicos: ${anosVisiveis()}`, "Brasil, América do Sul e internet", "Sem consulta por clube", `Fonte: ${esc(D.meta.fonte)}`].map((c) => `<span class="chip">${c}</span>`).join("");

    chartTheme();
    chartAnual("chAnual", rows, true);
    chartDonut("chLocal", count(rows, "local"), ORDEM_FIXA.local);
    chartDonut("chDesdobramento", count(rows, "desdobramento"), ORDEM_FIXA.desdobramento);
    const estBR = est.filter((r) => r.pais === "Brasil");
    renderList("lsRegiao", count(estBR, "regiao"), { exclude: [NA, NI], total: estBR.length });
    $("lsRegiaoNote").textContent = `${num(estBR.length)} casos em estádios no Brasil; outros ${num(est.length - estBR.length)} em estádios no exterior.`;
    renderList("lsOrigem", count(rows, "origem"), { exclude: [NA, NI, "Internet", "Outros espaços"], total });
    renderList("lsAmbito", count(rows, "ambito"), { exclude: [NA], total });
    renderFunil("funil", rows);
    chartMes("chMes", rows);

    // destaques
    const anos = [...new Set(rows.map((r) => r.ano))].sort();
    const primeiro = rows.filter((r) => r.ano === anos[0]).length;
    const ultimo = rows.filter((r) => r.ano === anos[anos.length - 1]).length;
    const pico = sortedEntries(count(rows, "ano"))[0];
    const onlinePrimeiro = rows.filter((r) => r.ano <= anos[Math.min(2, anos.length - 1)] && r.local === "Internet").length;
    const totalPrimeiro = rows.filter((r) => r.ano <= anos[Math.min(2, anos.length - 1)]).length;
    const onlineUltimo = rows.filter((r) => r.ano >= anos[Math.max(0, anos.length - 3)] && r.local === "Internet").length;
    const totalUltimo = rows.filter((r) => r.ano >= anos[Math.max(0, anos.length - 3)]).length;
    const baseAmador = rows.filter((r) => ["Base", "Amador"].includes(r.categoria)).length;
    const semInfo = rows.filter((r) => r.desdobramento === NI).length;
    const destaques = [
      [`${num(pico[1])} casos em ${pico[0]}`, `foi o ano com mais registros. Em ${anos[0]} foram ${num(primeiro)}; em ${anos[anos.length - 1]}, ${num(ultimo)}.`],
      [`${pctTxt(punidos, julgados)} dos julgados foram punidos`, `${num(punidos)} punições em ${num(julgados)} julgamentos na justiça desportiva. Em ${num(semInfo)} casos (${pctTxt(semInfo, total)}) não há informação de desdobramento.`],
      [`Online: de ${pctTxt(onlinePrimeiro, totalPrimeiro)} para ${pctTxt(onlineUltimo, totalUltimo)}`, `participação dos casos na internet nos três primeiros anos da série comparada aos três últimos.`],
      [`${pctTxt(baseAmador, total)} em base e amador`, `${num(baseAmador)} casos fora do futebol profissional, onde a subnotificação tende a ser maior.`],
    ];
    $("insights").innerHTML = destaques.map(([t, s]) => `<div class="card insight"><strong>${esc(t)}</strong><span>${esc(s)}</span></div>`).join("");
  };

  // ------------------------------------------------------------------ consulta
  const renderChips = () => {
    const ativos = filtrosAtivos();
    const chips = Object.entries(ativos).map(([f, vals]) => {
      const fmt = FILTROS[f].fmt || ((v) => v);
      return `<span class="chip"><strong>${esc(FILTROS[f].label)}:</strong> ${esc(vals.map(fmt).join(", "))} <button type="button" data-clear="${f}" aria-label="Remover filtro ${esc(FILTROS[f].label)}">×</button></span>`;
    });
    if (!chips.length) chips.push(`<span class="chip quiet">${internal ? `Consulta interna: inclui ${ANO_CORRENTE}` : `Consulta pública: ${anosVisiveis()}`}</span>`);
    $("queryChips").innerHTML = chips.join("");
  };

  const sortRows = (rows) => {
    const col = COLS.find((c) => c.k === sortKey) || COLS[1];
    const get = (r) => {
      if (sortKey === "data") return r.data || "";
      if (col.sortGet) return col.sortGet(r);
      const v = r[col.k];
      return v === null || v === undefined ? "" : v;
    };
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      if (col.num || typeof va === "number") return (Number(va) - Number(vb)) * dir;
      return String(va).localeCompare(String(vb), "pt-BR") * dir;
    });
  };

  const renderHead = () => {
    const cols = COLS.filter((c) => c.table);
    $("resultsHead").innerHTML =
      "<tr>" +
      cols.map((c) => `<th scope="col"><button type="button" class="sort ${sortKey === c.k ? sortDir : ""}" data-sort="${c.k}">${esc(c.l)}</button></th>`).join("") +
      (internal ? '<th scope="col">Planilha</th>' : "") +
      "</tr>";
  };

  const pillClass = (v) => ({ Punido: "punido", Absolvido: "absolvido", "Não julgado": "naojulgado" }[v] || "naoinformado");

  const renderTable = () => {
    const cols = COLS.filter((c) => c.table);
    const sorted = sortRows(filtered);
    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
    page = Math.min(page, totalPages);
    const slice = sorted.slice((page - 1) * pageSize, page * pageSize);
    renderHead();
    $("resultsBody").innerHTML = slice.length
      ? slice
          .map((r) => {
            const tds = cols
              .map((c) => {
                const v = c.get(r);
                if (c.pill) return `<td data-label="${esc(c.l)}"><span class="pill ${pillClass(v)}">${esc(v)}</span></td>`;
                if (c.k === "localDesc" && r.local === "Internet") return `<td data-label="${esc(c.l)}"><span class="pill online">${esc(v)}</span></td>`;
                return `<td data-label="${esc(c.l)}" class="${c.num || c.k === "data" ? "num" : ""}">${esc(v)}</td>`;
              })
              .join("");
            const extra = internal ? `<td data-label="Planilha">aba ${r.ano}, linha ${r.linhaPlanilha}${r.qualidade.length ? ` <span class="tag">${r.qualidade.length} apontamento${r.qualidade.length > 1 ? "s" : ""}</span>` : ""}</td>` : "";
            return `<tr tabindex="0" data-id="${esc(r.id)}" aria-label="Abrir detalhe do caso ${esc(r.numero || r.id)}">${tds}${extra}</tr>`;
          })
          .join("")
      : `<tr class="empty-row"><td colspan="${cols.length + (internal ? 1 : 0)}">Nenhum resultado para os filtros escolhidos.</td></tr>`;

    const ini = sorted.length ? (page - 1) * pageSize + 1 : 0;
    const fim = Math.min(page * pageSize, sorted.length);
    $("pager").innerHTML = `
      <span>Mostrando ${num(ini)}–${num(fim)} de ${num(sorted.length)}</span>
      <div class="pages">
        <label>Por página <select id="pageSize" aria-label="Registros por página">${[25, 50, 100].map((n) => `<option ${n === pageSize ? "selected" : ""}>${n}</option>`).join("")}</select></label>
        <button class="btn small" id="prevPage" ${page <= 1 ? "disabled" : ""} aria-label="Página anterior">‹</button>
        <span>Página ${page} de ${totalPages}</span>
        <button class="btn small" id="nextPage" ${page >= totalPages ? "disabled" : ""} aria-label="Próxima página">›</button>
      </div>`;
    $("pageSize").addEventListener("change", (e) => {
      pageSize = Number(e.target.value);
      page = 1;
      renderTable();
    });
    $("prevPage").addEventListener("click", () => {
      page--;
      renderTable();
    });
    $("nextPage").addEventListener("click", () => {
      page++;
      renderTable();
    });
  };

  const renderQuery = () => {
    const total = filtered.length;
    const vis = visiveis().length;
    $("kpiCases").textContent = num(total);
    $("kpiCasesSub").textContent = `${pctTxt(total, vis)} da base visível`;
    $("kpiStates").textContent = new Set(filtered.filter((r) => r.uf).map((r) => r.uf)).size;
    $("kpiCities").textContent = new Set(filtered.filter((r) => r.cidade).map((r) => r.cidade)).size;
    const punidos = filtered.filter((r) => r.punicaoDesportiva === "Sim").length;
    const julgados = filtered.filter((r) => r.julgamentoDesportivo === "Sim").length;
    $("kpiPunished").textContent = num(punidos);
    $("kpiPunishedSub").textContent = julgados ? `${pctTxt(punidos, julgados)} dos ${num(julgados)} julgados` : "nenhum julgamento no recorte";
    const online = filtered.filter((r) => r.local === "Internet").length;
    $("kpiOnline").textContent = num(online);
    $("kpiOnlineSub").textContent = `${pctTxt(online, total)} do recorte`;
    $("resultHint").textContent = `${num(total)} resultado${total !== 1 ? "s" : ""}. Clique em uma linha para ver o detalhe.`;
    renderChips();
    chartTheme();
    chartAnual("chAnualQ", filtered, false);
    renderList("lsOrigemQ", count(filtered, "origem"), { exclude: [NA, NI], total });
    chartDonut("chDesdobramentoQ", count(filtered, "desdobramento"), ORDEM_FIXA.desdobramento);
    renderTable();
  };

  // ------------------------------------------------------------------ detalhe do caso
  const openDetail = (id) => {
    const r = CASOS.find((x) => x.id === id);
    if (!r) return;
    $("detailTitle").textContent = `Caso ${r.numero || r.id}`;
    $("detailSub").textContent = `${fmtDate(r.data)} · ${localDesc(r)} · ${cidadeUF(r)}`;
    const linhas = [
      ["Ano", r.ano],
      ["Data", fmtDate(r.data)],
      ["Local", r.local],
      ["Detalhe do local", r.localDetalhe || (r.local === "Internet" ? r.plataforma : "—")],
      ["Cidade / UF", cidadeUF(r)],
      ["Região", r.regiao],
      ["País", r.pais],
      ["Competição", r.competicao + (r.competicaoOriginal && r.competicaoOriginal !== r.competicao ? ` (na planilha: ${r.competicaoOriginal})` : "")],
      ["Âmbito", r.ambito],
      ["Categoria", r.categoria],
      ["Gênero", r.genero],
      ["Origem da agressão", r.origem],
      ["Boletim de ocorrência", r.boletim + (r.boletimDetalhe ? ` (${r.boletimDetalhe})` : "")],
      ["Registro em súmula", r.sumula],
      ["Justiça comum", r.punicaoComum + (r.punicaoComumDetalhe ? ` (${r.punicaoComumDetalhe})` : "")],
      ["Julgamento desportivo", r.julgamentoDesportivo],
      ["Punição desportiva", r.punicaoDesportiva],
      ["Órgão julgador", r.orgao || "—"],
      ["Agressor identificado", r.agressorIdentificado],
      ["Desdobramento", r.desdobramento],
      ["Alguma punição", r.responsabilizacao],
    ];
    if (r.fonte) linhas.push(["Fonte", `<a href="${esc(r.fonte)}" target="_blank" rel="noopener">${esc(r.fonte)}</a>`]);
    if (internal) {
      linhas.push(["Origem na planilha", `aba ${r.ano}, linha ${r.linhaPlanilha}`]);
      linhas.push(["Apontamentos", r.qualidade.length ? r.qualidade.map((q) => `<span class="tag" title="${esc(D.qualidade.descricoes[q] || "")}">${esc(q)}</span>`).join("") : '<span class="tag ok">sem pendências</span>']);
      if (r.nome) linhas.push(["Vítima (interno)", esc(r.nome)]);
      if (r.jogo) linhas.push(["Partida (interno)", esc(r.jogo)]);
      if (r.fato) linhas.push(["Relato (interno)", esc(r.fato)]);
      if (r.desfecho) linhas.push(["Desfecho (interno)", esc(r.desfecho)]);
    }
    $("detailBody").innerHTML = `<dl class="dl">${linhas.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${k === "Fonte" || k === "Apontamentos" || k.includes("(interno)") ? v : esc(v)}</dd>`).join("")}</dl>`;
    openModal("detailModal");
  };

  // ------------------------------------------------------------------ modais
  let lastFocus = null;
  const openModal = (id) => {
    lastFocus = document.activeElement;
    $(id).classList.add("open");
    const first = $(id).querySelector("button, [href], input, select");
    if (first) first.focus();
  };
  const closeModal = (id) => {
    $(id).classList.remove("open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  };
  document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => closeModal(b.dataset.close)));
  document.querySelectorAll(".modal-bg").forEach((m) =>
    m.addEventListener("click", (e) => {
      if (e.target === m) closeModal(m.id);
    }),
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") document.querySelectorAll(".modal-bg.open").forEach((m) => closeModal(m.id));
  });

  // ------------------------------------------------------------------ exportação
  const buildExportCols = () => {
    $("exportCols").innerHTML = COLS.map((c) => `<label><input type="checkbox" value="${c.k}" ${c.table || c.k === "ano" ? "checked" : ""} /> ${esc(c.l)}</label>`).join("");
  };
  const selectedCols = () => Array.from(document.querySelectorAll('#exportCols input:checked')).map((i) => COLS.find((c) => c.k === i.value));
  const openExport = (type) => {
    if (!filtered.length) return toast("Não há dados para exportar.");
    exportType = type;
    $("pdfOptions").style.display = type === "pdf" ? "block" : "none";
    $("includeSummary").parentElement.style.display = type === "pdf" ? "none" : "flex";
    $("doExport").textContent = { pdf: "Gerar PDF", csv: "Baixar CSV", xlsx: "Baixar Excel" }[type];
    openModal("exportModal");
  };
  const download = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const stamp = () => new Date().toISOString().slice(0, 10);
  const doExport = () => {
    const cols = selectedCols();
    if (!cols.length) return toast("Selecione pelo menos uma coluna.");
    const rows = sortRows(filtered);
    const head = cols.map((c) => c.l);
    const data = rows.map((r) => cols.map((c) => c.get(r)));
    const texto = resumo(filtered, "A consulta");
    if (exportType === "csv") {
      const q = (v) => '"' + String(v ?? "").replaceAll('"', '""') + '"';
      let csv = [head, ...data].map((row) => row.map(q).join(";")).join("\n");
      if ($("includeSummary").checked) csv += `\n\n"Resumo automático"\n${q(texto)}\n`;
      download(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }), `odrf_consulta_${stamp()}.csv`);
    } else if (exportType === "xlsx") {
      const arr = [head, ...data];
      if ($("includeSummary").checked) arr.push([], ["Resumo automático"], [texto]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(arr), "Resultados");
      const filtros = Object.entries(filtrosAtivos()).map(([k, v]) => [FILTROS[k].label, v.join(", ")]);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Filtro", "Valores"], ...(filtros.length ? filtros : [["(nenhum)", ""]]), [], ["Gerado em", new Date().toLocaleString("pt-BR")], ["Fonte", D.meta.fonte]]), "Filtros");
      XLSX.writeFile(wb, `odrf_consulta_${stamp()}.xlsx`);
    } else {
      printPdf(cols, head, data, texto);
    }
    closeModal("exportModal");
  };
  const printPdf = (cols, head, data, texto) => {
    const pz = $("print-zone");
    pz.innerHTML = "";
    const filtros = Object.entries(filtrosAtivos()).map(([k, v]) => `${FILTROS[k].label}: ${v.join(", ")}`);
    pz.innerHTML += `<h1>ODRF — Painel de Dados · Consulta</h1><div class="meta">${esc(filtros.length ? filtros.join(" · ") : "Sem filtros (base completa visível)")} · gerado em ${new Date().toLocaleString("pt-BR")}</div>`;
    if ($("pdfIncludeSummary").checked) pz.innerHTML += `<div class="notice" style="margin-bottom:16px"><strong>Resumo automático.</strong> ${esc(texto)}</div>`;
    if ($("pdfIncludeCharts").checked) {
      const view = $("view-consulta");
      const kp = view.querySelector(".kpis").cloneNode(true);
      pz.appendChild(kp);
      const an = view.querySelector(".analytics-grid").cloneNode(true);
      const orig = view.querySelectorAll(".analytics-grid canvas");
      const clones = an.querySelectorAll("canvas");
      clones.forEach((c, i) => {
        const img = new Image();
        img.src = orig[i].toDataURL("image/png");
        c.parentNode.replaceChild(img, c);
      });
      pz.appendChild(an);
    }
    if ($("pdfIncludeTable").checked) {
      const limite = 500;
      const tbl = document.createElement("table");
      tbl.innerHTML = `<thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${data
        .slice(0, limite)
        .map((row) => `<tr>${row.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
        .join("")}</tbody>`;
      pz.innerHTML += "<h2 style='font-size:15px;margin:18px 0 8px'>Dados detalhados</h2>";
      pz.appendChild(tbl);
      if (data.length > limite) pz.innerHTML += `<p style="font-size:11px;color:#555">Tabela limitada aos primeiros ${limite} de ${data.length} registros. Para a base completa, exporte em CSV ou Excel.</p>`;
    }
    setTimeout(() => window.print(), 150);
  };

  // ------------------------------------------------------------------ área interna
  const renderAdmin = () => {
    const q = D.qualidade;
    $("adminTotal").textContent = num(CASOS.length);
    $("adminCurrent").textContent = num(CASOS.filter((r) => r.ano >= ANO_CORRENTE).length);
    $("adminYearText").textContent = `${ANO_CORRENTE} · ${num(CASOS.filter((r) => r.ano >= ANO_CORRENTE).length)} registros`;
    $("adminIssues").textContent = num(q.totalProblemas);
    $("adminIssueRecords").textContent = num(q.registrosComProblema);
    $("adminIssueRecordsSub").textContent = `${pctTxt(q.registrosComProblema, CASOS.length)} da base`;
    $("adminClean").textContent = num(CASOS.length - q.registrosComProblema);
    $("adminGenerated").textContent = new Date(D.meta.geradoEm).toLocaleString("pt-BR");
  };

  const renderConferencia = () => {
    const ref = D.referencia;
    const est = CASOS.filter((r) => r.local === "Estádio");
    const linhas = [];
    const add = (grupo, rotulo, calc, rev) => linhas.push({ grupo, rotulo, calc, rev, diff: calc - rev });
    ref.anos.forEach((a) => add("Total por ano", a, CASOS.filter((r) => String(r.ano) === a).length, ref.totalPorAno[a]));
    Object.entries(ref.localPorAno).forEach(([loc, porAno]) => add("Local (todos os anos)", loc, CASOS.filter((r) => r.local === loc).length, Object.values(porAno).reduce((s, v) => s + v, 0)));
    Object.entries(ref.regiaoEstadios).forEach(([reg, v]) => add("Região (casos em estádios no Brasil)", reg, est.filter((r) => r.regiao === reg).length, v));
    add("Região (casos em estádios no Brasil)", "Exterior", est.filter((r) => r.regiao === "Exterior").length, ref.exteriorEstadios);
    Object.entries(ref.generoEstadios).forEach(([g, v]) => add("Gênero (casos em estádios)", g, est.filter((r) => r.genero === g).length, v));
    Object.entries(ref.julgamentos).forEach(([j, v]) => add("Justiça desportiva", j, CASOS.filter((r) => r.desdobramento === j).length, v));
    Object.entries(ref.estadosEstadios)
      .sort((a, b) => b[1] - a[1])
      .forEach(([uf, v]) => add("Estados (casos em estádios)", uf, est.filter((r) => r.uf === uf).length, v));
    const divergentes = linhas.filter((l) => l.diff !== 0).length;
    $("confHint").textContent = `${linhas.length} totais comparados, ${divergentes} com diferença. ${ref.observacao}`;
    let grupo = "";
    $("confTable").innerHTML =
      `<thead><tr><th>Indicador</th><th>Calculado pelo painel</th><th>Planilha de revisão</th><th>Diferença</th></tr></thead><tbody>` +
      linhas
        .map((l) => {
          const cab = l.grupo !== grupo ? `<tr><th colspan="4" style="text-align:left;background:var(--panel2)">${esc(l.grupo)}</th></tr>` : "";
          grupo = l.grupo;
          return `${cab}<tr><td>${esc(l.rotulo)}</td><td class="num">${num(l.calc)}</td><td class="num">${num(l.rev)}</td><td class="num ${l.diff === 0 ? "diff-0" : "diff-n"}">${l.diff === 0 ? "✓" : (l.diff > 0 ? "+" : "") + l.diff}</td></tr>`;
        })
        .join("") +
      "</tbody>";
  };

  const renderQualidade = () => {
    const q = D.qualidade;
    const codes = Object.entries(q.porCodigo);
    $("qSummary").innerHTML =
      `<button type="button" class="chip ${qualityCode ? "quiet" : ""}" data-code="">Todos: ${num(q.totalProblemas)}</button>` +
      codes.map(([c, n]) => `<button type="button" class="chip ${qualityCode && qualityCode !== c ? "quiet" : ""}" data-code="${esc(c)}" title="${esc(q.descricoes[c] || "")}">${esc(c)}: ${num(n)}</button>`).join("");
    const lista = q.problemas.filter((p) => !qualityCode || p.codigo === qualityCode);
    $("qHint").textContent = qualityCode ? `${num(lista.length)} apontamentos · ${q.descricoes[qualityCode] || ""}` : `${num(lista.length)} apontamentos em ${num(q.registrosComProblema)} registros`;
    $("qBody").innerHTML = lista.length
      ? lista
          .map((p) => {
            const c = CASOS.find((x) => x.id === p.id);
            return `<tr tabindex="0" data-id="${esc(p.id)}"><td data-label="Aba">${p.aba}</td><td data-label="Linha" class="num">${p.linha}</td><td data-label="Nº">${esc(c?.numero || p.id)}</td><td data-label="Tipo"><span class="tag">${esc(p.codigo)}</span></td><td data-label="Detalhe">${esc(p.detalhe || q.descricoes[p.codigo] || "")}</td></tr>`;
          })
          .join("")
      : '<tr class="empty-row"><td colspan="5">Nenhum apontamento.</td></tr>';
  };

  const renderGovernanca = () => {
    const regras = [
      ["Usuário público acessa apenas anos anteriores ao corrente", `Ativo · público vê ${anosVisiveis()}`, "ok"],
      ["Equipe interna acessa o ano corrente", `Ativo · ${ANO_CORRENTE}`, "ok"],
      ["Consulta, ranking ou comparação por clube", "Inexistente no painel e na base gerada", "lock"],
      ["Nomes de vítimas e agressores, relatos e desfechos", D.meta.camposSensiveisIncluidos ? "Presentes nesta base (perfil interno)" : "Fora da base pública", D.meta.camposSensiveisIncluidos ? "bad" : "ok"],
      ["Manutenção dos casos via planilha nesta fase", "Mantida · base regerada por script", "ok"],
      ["Exportação de resultado filtrado", "Ativa · CSV, Excel e PDF", "ok"],
      ["Conferência com a planilha de revisão", "Ativa · aba Qualidade e conferência", "ok"],
      ["Autenticação real da área interna", "Pendente · o modo interno é uma simulação de perfil", "lock"],
    ];
    $("govRows").innerHTML = regras.map(([r, s, c]) => `<div class="status-row"><span>${esc(r)}</span><span class="${c}">${esc(s)}</span></div>`).join("");
  };

  // ------------------------------------------------------------------ validador de planilha
  const COLUNAS_ESPERADAS = ["Número", "Data", "Nome", "Jogo", "Estádio", "Cidade", "Estado", "Região", "País", "Competição", "Gênero", "Local", "Categoria", "Espaço", "Fato", "Desfecho", "Boletim de Ocorrência", "Súmula", "Punição Justiça comum", "Julgamento Justiça Desportiva", "Punição Justiça Desportiva", "Orgão de Justiça Desportiva", "Agressor Identificado", "Nome Agressor", "Decisão Justiça Desportiva", "Quem punido ou absolvido", "Link", "OBS"];
  const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  const validarPlanilha = async (file) => {
    const msg = $("importMsg");
    msg.className = "notice";
    msg.textContent = "Lendo arquivo...";
    const fn = norm(file.name);
    if (["revisao", "rascunho", "copia"].some((k) => fn.includes(k))) {
      msg.className = "notice error";
      msg.innerHTML = `<strong>Arquivo recusado.</strong> <em>${esc(file.name)}</em> parece ser uma planilha de revisão ou rascunho. Valide apenas a planilha-base consolidada.`;
      return;
    }
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const anos = wb.SheetNames.filter((n) => /^\d{4}$/.test(n));
      if (!anos.length) throw new Error("nenhuma aba com nome de ano (2014, 2015, ...) foi encontrada.");
      const numerosBase = new Set(CASOS.map((r) => r.numero));
      let totalLinhas = 0;
      let novos = 0;
      const relat = anos.map((aba) => {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[aba], { header: 1, defval: "" });
        const hdrIdx = rows.findIndex((r) => r.some((c) => norm(c) === "numero"));
        const hdr = hdrIdx >= 0 ? rows[hdrIdx].map((c) => String(c).trim()) : [];
        const faltam = COLUNAS_ESPERADAS.filter((c) => !hdr.some((h) => norm(h) === norm(c)));
        const extras = hdr.filter((h) => h && !COLUNAS_ESPERADAS.some((c) => norm(c) === norm(h)));
        const idxNum = hdr.findIndex((h) => norm(h) === "numero");
        const dados = hdrIdx >= 0 ? rows.slice(hdrIdx + 1).filter((r) => r.some((c) => String(c).trim() !== "")) : [];
        const nums = idxNum >= 0 ? dados.map((r) => String(r[idxNum]).trim()).filter(Boolean) : [];
        const naBase = nums.filter((n) => numerosBase.has(n)).length;
        totalLinhas += dados.length;
        novos += Math.max(0, dados.length - naBase);
        const emBase = CASOS.filter((r) => String(r.ano) === aba).length;
        return `<tr><td>${aba}</td><td class="num">${dados.length}</td><td class="num">${emBase}</td><td class="num">${dados.length - emBase >= 0 ? "+" : ""}${dados.length - emBase}</td><td>${faltam.length ? `<span class="tag">faltam: ${esc(faltam.join(", "))}</span>` : '<span class="tag ok">completas</span>'}${extras.length ? ` <span class="tag">extras: ${esc(extras.join(", "))}</span>` : ""}</td></tr>`;
      });
      msg.className = "notice";
      msg.innerHTML = `<strong>${esc(file.name)}</strong>: ${anos.length} abas anuais, ${num(totalLinhas)} linhas de dados (base atual: ${num(CASOS.length)}). Cerca de ${num(novos)} números de caso ainda não estão na base.
        <div class="table-wrap" style="margin-top:10px"><table class="conf-table" style="min-width:0"><thead><tr><th>Aba</th><th>Linhas</th><th>Na base atual</th><th>Diferença</th><th>Colunas</th></tr></thead><tbody>${relat.join("")}</tbody></table></div>
        <p style="margin:10px 0 0">Se a validação estiver correta, substitua a planilha-base na pasta do projeto e execute <code>python3 scripts/build_data.py</code> para regerar o painel.</p>`;
    } catch (err) {
      msg.className = "notice error";
      msg.textContent = "Não foi possível validar: " + err.message;
    }
  };

  // ------------------------------------------------------------------ navegação e modo
  const switchView = (name) => {
    if (!$("view-" + name)) name = "overview";
    const btn = document.querySelector(`.nav-btn[data-view="${name}"]`);
    if (btn && btn.classList.contains("admin-only") && !internal) name = "overview";
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    $("view-" + name).classList.add("active");
    document.querySelectorAll(".nav-btn").forEach((b) => {
      const on = b.dataset.view === name;
      b.classList.toggle("active", on);
      if (on) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    closeMenu();
    if (name === "qualidade") {
      renderConferencia();
      renderQualidade();
    }
    if (name === "admin") renderAdmin();
    if (name === "governanca") renderGovernanca();
    if (name === "consulta") setTimeout(() => Object.values(charts).forEach((c) => c.resize()), 50);
    if (name === "overview") setTimeout(() => Object.values(charts).forEach((c) => c.resize()), 50);
    syncHash();
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const closeMenu = () => {
    $("sidebar").classList.remove("open");
    $("overlay").classList.remove("open");
    $("menuBtn").setAttribute("aria-expanded", "false");
  };
  const setInternal = (on) => {
    internal = on;
    $("shell").classList.toggle("internal", on);
    $("roleBadge").textContent = on ? "Modo interno (simulação)" : "Acesso público";
    $("roleBadge").classList.toggle("internal", on);
    $("modeBtn").textContent = on ? "Sair do modo interno" : "Modo interno";
    $("modeText").textContent = on ? "Interno" : "Público";
    $("privacyText").textContent = on ? `Ano corrente (${ANO_CORRENTE}) liberado` : "Ano corrente protegido";
    refreshOptions();
    renderOverview();
    apply();
    toast(on ? "Modo interno ativado. O ano corrente e os apontamentos de qualidade ficam visíveis." : "Modo público restaurado.");
  };

  // ------------------------------------------------------------------ tema
  const themeInit = () => {
    let t = null;
    try {
      t = localStorage.getItem("odrfTheme");
    } catch (e) {
      /* armazenamento indisponível */
    }
    if (!t) t = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = t;
  };
  const toggleTheme = () => {
    const n = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = n;
    try {
      localStorage.setItem("odrfTheme", n);
    } catch (e) {
      /* ignora */
    }
    renderOverview();
    renderQuery();
  };

  // ------------------------------------------------------------------ eventos
  $("themeBtn").addEventListener("click", toggleTheme);
  $("menuBtn").addEventListener("click", () => {
    const open = $("sidebar").classList.toggle("open");
    $("overlay").classList.toggle("open", open);
    $("menuBtn").setAttribute("aria-expanded", String(open));
  });
  $("overlay").addEventListener("click", closeMenu);
  document.querySelectorAll(".nav-btn").forEach((b) => b.addEventListener("click", () => switchView(b.dataset.view)));
  document.querySelectorAll("[data-goto]").forEach((b) => b.addEventListener("click", () => switchView(b.dataset.goto)));
  $("goAdvanced").addEventListener("click", () => switchView("consulta"));
  document.querySelectorAll(".quick").forEach((b) =>
    b.addEventListener("click", () => {
      FKEYS.forEach((f) => setVals(f, []));
      refreshOptions();
      setVals(b.dataset.filter, [b.dataset.value]);
      if (["regiao", "estado"].includes(b.dataset.filter)) refreshOptions(b.dataset.filter);
      switchView("consulta");
      apply();
    }),
  );
  $("applyBtn").addEventListener("click", () => {
    apply();
    toast(`${num(filtered.length)} resultado${filtered.length !== 1 ? "s" : ""}`);
  });
  $("clearBtn").addEventListener("click", clearFilters);
  $("shareBtn").addEventListener("click", async () => {
    syncHash();
    try {
      await navigator.clipboard.writeText(location.href);
      toast("Link da consulta copiado.");
    } catch (e) {
      toast("Copie o endereço da barra do navegador para compartilhar.");
    }
  });
  $("queryChips").addEventListener("click", (e) => {
    const b = e.target.closest("[data-clear]");
    if (!b) return;
    setVals(b.dataset.clear, []);
    if (["regiao", "estado"].includes(b.dataset.clear)) refreshOptions(b.dataset.clear);
    apply();
  });
  $("resultsHead").addEventListener("click", (e) => {
    const b = e.target.closest("[data-sort]");
    if (!b) return;
    if (sortKey === b.dataset.sort) sortDir = sortDir === "asc" ? "desc" : "asc";
    else {
      sortKey = b.dataset.sort;
      sortDir = "asc";
    }
    renderTable();
  });
  const rowOpen = (e) => {
    const tr = e.target.closest("tr[data-id]");
    if (!tr) return;
    if (e.type === "keydown" && e.key !== "Enter") return;
    openDetail(tr.dataset.id);
  };
  $("resultsBody").addEventListener("click", rowOpen);
  $("resultsBody").addEventListener("keydown", rowOpen);
  $("qBody").addEventListener("click", rowOpen);
  $("qBody").addEventListener("keydown", rowOpen);
  $("qSummary").addEventListener("click", (e) => {
    const b = e.target.closest("[data-code]");
    if (!b) return;
    qualityCode = b.dataset.code;
    renderQualidade();
  });
  $("exportIssues").addEventListener("click", () => {
    const q = (v) => '"' + String(v ?? "").replaceAll('"', '""') + '"';
    const lista = D.qualidade.problemas.filter((p) => !qualityCode || p.codigo === qualityCode);
    const csv = [["Aba", "Linha", "Nº do caso", "Tipo", "Detalhe", "Descrição"], ...lista.map((p) => [p.aba, p.linha, CASOS.find((x) => x.id === p.id)?.numero || p.id, p.codigo, p.detalhe || "", D.qualidade.descricoes[p.codigo] || ""])]
      .map((r) => r.map(q).join(";"))
      .join("\n");
    download(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }), `odrf_apontamentos_${stamp()}.csv`);
  });
  $("exportPdfBtn").addEventListener("click", () => openExport("pdf"));
  $("exportCsvBtn").addEventListener("click", () => openExport("csv"));
  $("exportXlsxBtn").addEventListener("click", () => openExport("xlsx"));
  $("doExport").addEventListener("click", doExport);
  $("modeBtn").addEventListener("click", () => {
    setInternal(!internal);
    switchView(internal ? "admin" : "overview");
  });
  $("contactForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    $("contactSuccess").classList.remove("hidden");
    form.reset();
  });
  $("fileInput").addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (f) validarPlanilha(f);
    e.target.value = "";
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 820) closeMenu();
  });
  window.addEventListener("hashchange", () => {
    const { view } = readHash();
    const atual = document.querySelector(".view.active")?.id.replace("view-", "");
    if (view && view !== atual) switchView(view);
  });

  // ------------------------------------------------------------------ inicialização
  themeInit();
  buildExportCols();
  $("sideMeta").innerHTML = `Base: ${esc(D.meta.fonte)}<br />${num(D.meta.totalCasos)} casos · ${D.meta.anoInicial}–${D.meta.anoFinal}<br />Gerada em ${new Date(D.meta.geradoEm).toLocaleDateString("pt-BR")}`;
  $("mTotal").textContent = num(D.meta.totalCasos);
  $("mAnos").textContent = `${D.meta.anoInicial}–${D.meta.anoFinal}`;
  refreshOptions();
  const inicial = readHash();
  Object.entries(inicial.filtros).forEach(([f, v]) => setVals(f, v));
  if (inicial.filtros.regiao || inicial.filtros.estado) {
    refreshOptions("regiao");
    if (inicial.filtros.estado) setVals("estado", inicial.filtros.estado);
    refreshOptions("estado");
    if (inicial.filtros.cidade) setVals("cidade", inicial.filtros.cidade);
  }
  renderOverview();
  apply();
  renderGovernanca();
  switchView(inicial.view || "overview");
})();
