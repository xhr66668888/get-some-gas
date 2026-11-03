import { forecast, localToday, dayNum } from "./engine.js";
import { resolveZip, isZip, CYCLING_STATES, REMOTE_STATES } from "./regions.js";
import {
  t, setLang, detectLang, getLang, applyStatic, areaName, stateName,
  fmtDate, fmtDayLong, fmtWeekday, fmtWeekdayShort, fmtTime,
} from "./i18n.js";
import { renderChart, renderTable } from "./chart.js";
import { startParticles } from "./particles.js";

const $ = (id) => document.getElementById(id);
const state = { market: null, place: null, areaId: "NUS", gallons: 15, f: null };
const TANKS = [10, 12, 15, 18, 20, 25, 30];
const HORIZON = 7;

const store = {
  get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch {}
  },
};

// ---- formatting -----------------------------------------------------------

const money = (v) => `$${v.toFixed(2)}`;
const money3 = (v) => `$${v.toFixed(3)}`;
const dollars = (v) => `$${Math.abs(v).toFixed(2)}`;

function cents(v) {
  const c = Math.abs(v * 100);
  return c >= 9.95 ? c.toFixed(0) : c.toFixed(1);
}

function signedCents(v) {
  const c = v * 100;
  if (Math.abs(c) < 0.05) return "±0¢";
  return `${c > 0 ? "+" : "−"}${cents(v)}¢`;
}

const trendClass = (v, flat = 0.001) => (v > flat ? "is-up" : v < -flat ? "is-down" : "is-flat");
const pct = (p) => Math.round(p * 100);

function node(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text != null) el.textContent = text;
  return el;
}

function dayLabel(f, day) {
  if (day === f.today) return t("week.today");
  if (day === f.today + 1) return t("week.tomorrow");
  return fmtWeekday(day);
}

// ---- sections -------------------------------------------------------------

function renderHeader(f) {
  const area = areaName(state.areaId);
  $("forecast-title").textContent = t("forecast.title", { area });
  const place = state.place;
  let line;
  if (!place) line = t("zip.national");
  else if (!place.covered) line = t("zip.unsupported", { zip: place.zip });
  else line = t("zip.resolved", { zip: place.zip, state: stateName(place.state), area });
  $("area-line").textContent = line;

  const staleDays = localToday() - f.lastKnown;
  const notice = $("notice");
  notice.hidden = staleDays <= 5;
  notice.textContent = staleDays > 5 ? t("status.stale", { days: staleDays }) : "";
}

function renderVerdict(f) {
  const today = f.days[0];
  const best = f.days[f.best];
  const peak = f.days[f.peak];
  const gal = state.gallons;
  let headline, reason, other, savings, chip;

  if (f.kind === "wait") {
    headline = t("verdict.wait", { day: fmtWeekday(best.day) });
    reason = t("verdict.wait.reason", { cents: cents(f.savings), day: fmtWeekday(best.day) });
    if (f.best === f.days.length - 1 && f.drivers.stillFalling) reason += ` ${t("verdict.wait.more")}`;
    other = best;
    savings = t("verdict.save", { amount: dollars(f.savings * gal), gal });
    chip = t("verdict.pBetter", { pct: pct(f.pBetter), day: fmtWeekday(best.day) });
  } else if (f.kind === "now") {
    headline = t("verdict.now");
    reason = t("verdict.now.reason", { cents: cents(f.rise), day: fmtWeekday(peak.day) });
    other = peak;
    savings = t("verdict.cost", { day: fmtWeekday(peak.day), amount: dollars(f.rise * gal), gal });
    chip = t("verdict.pHigher", { pct: pct(f.pBetter), day: fmtWeekday(peak.day) });
  } else if (f.kind === "steady") {
    headline = t("verdict.steady", { day: fmtWeekday(best.day) });
    reason = t("verdict.steady.reason", { cents: cents(f.savings), day: fmtWeekday(best.day) });
    other = best;
    savings = t("verdict.save", { amount: dollars(f.savings * gal), gal });
    chip = t("verdict.pBetter", { pct: pct(f.pBetter), day: fmtWeekday(best.day) });
  } else {
    headline = t("verdict.steadyNow");
    reason = t("verdict.steadyNow.reason");
    other = peak;
    savings = t("verdict.small", { amount: dollars(Math.max(f.rise, 0.005) * gal), gal });
    chip = "";
  }

  const verdict = $("verdict");
  verdict.dataset.kind = f.kind;
  $("verdict-headline").textContent = headline;
  $("verdict-reason").textContent = reason;
  $("verdict-chip").textContent = chip;
  $("verdict-chip").hidden = !chip;
  $("vp-a-label").textContent = t("verdict.today");
  $("vp-a").textContent = money(today.mean);
  $("vp-b-label").textContent = t("verdict.expected", { day: fmtDayLong(other.day) });
  $("vp-b").textContent = money(other.mean);
  const delta = other.mean - today.mean;
  const deltaEl = $("vp-delta");
  deltaEl.className = `verdict-delta ${trendClass(delta, 0.0005)}`;
  deltaEl.textContent = `${delta < -0.0005 ? "▼" : delta > 0.0005 ? "▲" : "•"} ${signedCents(delta)}`;
  $("verdict-savings").textContent = savings;
}

function renderWeek(f) {
  const list = $("week");
  list.textContent = "";
  const today = f.days[0].mean;
  const maxP = Math.max(...f.days.map((d) => d.pCheapest));
  f.days.forEach((d, i) => {
    const li = node("li", `day${i === f.best ? " is-best" : ""}${i === 0 ? " is-today" : ""}`);
    const top = node("div", "day-top");
    top.append(node("span", "day-name", dayLabel(f, d.day)));
    if (i === f.best) top.append(node("span", "day-badge", t("week.best")));
    li.append(top, node("span", "day-date", fmtDate(d.day)));
    li.append(node("span", "day-price", money(d.mean)));
    const change = d.mean - today;
    li.append(node("span", `day-change ${i === 0 ? "is-flat" : trendClass(change, 0.0005)}`,
      i === 0 ? "—" : `${signedCents(change)} ${t("week.vsToday")}`));
    li.append(node("span", "day-range", t("week.range", { lo: money(d.p10), hi: money(d.p90) })));
    const meter = node("div", "meter");
    meter.setAttribute("aria-hidden", "true");
    const fill = node("span", "meter-fill");
    fill.style.width = `${maxP > 0 ? (d.pCheapest / maxP) * 100 : 0}%`;
    meter.append(fill);
    li.append(meter, node("span", "day-chance", `${pct(d.pCheapest)}% ${t("week.cheapest")}`));
    list.append(li);
  });
}

function renderChartBlock(f) {
  const area = state.market.areas[state.areaId];
  const host = $("chart");
  host.dataset.label = t("chart.aria", { area: areaName(state.areaId) });
  renderChart(host, f, area, money3);
  renderTable($("chart-table"), f, area, money3);
}

function card(num, title, body) {
  const el = node("article", "why-card");
  el.append(node("span", "why-num", String(num)), node("h3", null, title), node("p", null, body));
  return el;
}

function renderWhy(f) {
  const area = state.market.areas[state.areaId];
  const name = areaName(state.areaId);
  const d = f.drivers;
  const grid = $("why-grid");
  grid.textContent = "";
  const vars = { w: signedCents(d.wholesaleChange), p: signedCents(d.pumpChange), gap: cents(d.gap) };
  const pipeline = Math.abs(d.gap) < 0.02 ? "why.pipeline.flat" : d.gap < 0 ? "why.pipeline.down" : "why.pipeline.up";
  let n = 1;
  grid.append(card(n++, t("why.pipeline.title"), t(pipeline, vars)));

  const up = area.halfLifeUp;
  const down = area.halfLifeDown;
  let speed = up === down ? t("why.speed.even", { area: name, up: Math.round(up) }) :
    t("why.speed.body", { area: name, up: Math.round(up), down: Math.round(down) });
  const st = state.place?.state;
  if (st && REMOTE_STATES.has(st)) speed += ` ${t("why.remote", { state: stateName(st) })}`;
  grid.append(card(n++, t("why.speed.title"), speed));
  grid.append(card(n++, t("why.dow.title"), t("why.dow.body")));
  if (st && CYCLING_STATES.has(st)) {
    grid.append(card(n++, t("why.cycle.title", { state: stateName(st) }), t("why.cycle.body")));
  }
  const bt = area.backtest;
  const track = $("track");
  track.hidden = !(bt && bt.directionHit != null);
  track.textContent = "";
  if (!track.hidden) {
    track.append(node("strong", null, t("why.track.title")), node("span", null, t("why.track.body", {
      weeks: bt.weeks, area: name, hit: pct(bt.directionHit),
      model: cents(bt.maeModel), naive: cents(bt.maeNaive),
    })));
  }
}

// Trend line stretched to the tile width; the end dot is HTML so it stays round.
function sparkline(values) {
  const w = 240;
  const h = 40;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * (w - 8) + 4,
    h - 4 - ((v - lo) / (hi - lo || 1)) * (h - 8),
  ]);
  const wrap = node("div", "spark");
  wrap.setAttribute("aria-hidden", "true");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("preserveAspectRatio", "none");
  const line = document.createElementNS(svg.namespaceURI, "polyline");
  line.setAttribute("points", pts.map((p) => p.map((n) => n.toFixed(1)).join(",")).join(" "));
  line.setAttribute("class", "spark-line");
  svg.append(line);
  const [lx, ly] = pts[pts.length - 1];
  const dot = node("span", "spark-dot");
  dot.style.left = `${(lx / w) * 100}%`;
  dot.style.top = `${(ly / h) * 100}%`;
  wrap.append(svg, dot);
  return wrap;
}

function statTile({ label, value, unit, delta, deltaText, note, spark }) {
  const tile = node("article", "stat");
  tile.append(node("h3", "stat-label", label));
  const val = node("p", "stat-value", value);
  val.append(node("span", "stat-unit", unit));
  tile.append(val);
  tile.append(node("p", `stat-delta ${trendClass(delta)}`, deltaText));
  if (spark) tile.append(sparkline(spark));
  tile.append(node("p", "stat-note", note));
  return tile;
}

function renderMarket() {
  const { market } = state;
  const grid = $("stat-grid");
  grid.textContent = "";
  const fut = market.futures;
  const crude = (key, labelKey) => {
    const q = fut[key];
    if (!q) return;
    const sign = q.change5d > 0 ? "+" : q.change5d < 0 ? "−" : "±";
    grid.append(statTile({
      label: t(labelKey), value: `$${q.price.toFixed(2)}`, unit: t("market.perBarrel"), delta: q.change5d,
      deltaText: `${sign}$${Math.abs(q.change5d).toFixed(2)} (${sign}${Math.abs((q.change5d / (q.price - q.change5d)) * 100).toFixed(1)}%) · ${t("market.days5")}`,
      note: t("market.contract", { contract: q.contract }), spark: q.spark,
    }));
  };
  crude("BRENT", "market.brent");
  crude("WTI", "market.wti");
  const rb = fut.RBOB;
  if (rb) {
    grid.append(statTile({
      label: t("market.rbob"), value: `$${rb.price.toFixed(2)}`, unit: t("market.perGallon"), delta: rb.change5d,
      deltaText: `${signedCents(rb.change5d)} · ${t("market.days5")}`,
      note: t("market.contract", { contract: rb.contract }), spark: rb.spark,
    }));
  }
  const area = market.areas[state.areaId];
  const retail = area.retail;
  const [lastIso, last] = retail[retail.length - 1];
  const prev = retail[retail.length - 2][1];
  grid.append(statTile({
    label: t("market.pump", { area: areaName(state.areaId) }), value: `$${last.toFixed(2)}`,
    unit: t("market.perGallon"), delta: last - prev,
    deltaText: `${signedCents(last - prev)} · ${t("market.week")}`,
    note: t("market.survey", { date: fmtDate(dayNum(lastIso)) }), spark: retail.slice(-12).map((r) => r[1]),
  }));
}

function renderMethod() {
  const area = state.market.areas[state.areaId];
  $("params-title").textContent = t("method.params.title", { area: areaName(state.areaId) });
  const days = (n) => t(n === 1 ? "method.params.day" : "method.params.days", { n });
  const rows = [
    ["method.params.bench", Object.entries(area.weights)
      .sort((x, y) => y[1] - x[1])
      .map(([id, w]) => `${t(`hub.${id}`)} ${Math.round(w * 100)}%`).join(" · ")],
    ["method.params.margin", `$${area.a.toFixed(2)}`],
    ["method.params.pass", area.b.toFixed(2)],
    ["method.params.lag", days(area.lag)],
    ["method.params.up", days(area.halfLifeUp)],
    ["method.params.down", days(area.halfLifeDown)],
    ["method.params.rho", `${Math.round((area.rho || 0) * 100)}%`],
    ["method.params.sigma", `${cents(area.sigma)}¢`],
  ];
  const table = $("params-table");
  table.textContent = "";
  const body = table.createTBody();
  for (const [key, value] of rows) {
    const tr = body.insertRow();
    const th = document.createElement("th");
    th.scope = "row";
    th.textContent = t(key);
    tr.append(th);
    tr.insertCell().textContent = value;
  }
}

function renderFooter(f) {
  const { market } = state;
  const list = $("footer-data");
  list.textContent = "";
  for (const text of [
    t("footer.updated", { time: fmtTime(market.generated) }),
    t("footer.survey", { date: fmtDate(dayNum(market.latestSurvey)) }),
    t("footer.wholesale", { date: fmtDate(f.lastKnown) }),
  ]) list.append(node("li", null, text));
  $("copyright").textContent = t("footer.copy", { year: new Date().getFullYear() });
}

function render() {
  if (!state.market) return;
  const f = forecast(state.market, state.areaId, { horizon: HORIZON });
  state.f = f;
  renderHeader(f);
  renderVerdict(f);
  renderWeek(f);
  renderChartBlock(f);
  renderWhy(f);
  renderMarket();
  renderMethod();
  renderFooter(f);
  document.body.classList.add("is-ready");
}

// ---- inputs ---------------------------------------------------------------

function useZip(zip, { scroll = false } = {}) {
  const status = $("zip-status");
  if (!isZip(zip)) {
    status.textContent = t("zip.invalid");
    status.classList.add("is-error");
    return;
  }
  status.textContent = "";
  status.classList.remove("is-error");
  state.place = resolveZip(zip, state.market.areas);
  state.areaId = state.place.areaId;
  store.set("gsg.zip", zip);
  const url = new URL(location.href);
  url.searchParams.set("zip", zip);
  history.replaceState(null, "", url);
  render();
  if (scroll) $("forecast").scrollIntoView({ behavior: "smooth", block: "start" });
}

function initControls() {
  $("zip-form").addEventListener("submit", (evt) => {
    evt.preventDefault();
    if (!state.market) return;
    useZip($("zip-input").value.trim(), { scroll: true });
  });
  $("zip-input").addEventListener("input", (evt) => {
    evt.target.value = evt.target.value.replace(/\D/g, "").slice(0, 5);
  });

  const select = $("tank-select");
  for (const g of TANKS) select.append(new Option(String(g), String(g)));
  const savedTank = Number(store.get("gsg.gallons"));
  state.gallons = TANKS.includes(savedTank) ? savedTank : 15;
  select.value = String(state.gallons);
  select.addEventListener("change", () => {
    state.gallons = Number(select.value);
    store.set("gsg.gallons", select.value);
    if (state.f) renderVerdict(state.f);
  });

  $("lang-toggle").addEventListener("click", () => {
    setLang(getLang() === "zh" ? "en" : "zh");
    store.set("gsg.lang", getLang());
    applyStatic();
    if (state.market) render();
    else $("zip-status").textContent = t("status.loading");
  });

  let width = window.innerWidth;
  window.addEventListener("resize", () => {
    if (Math.abs(window.innerWidth - width) < 4 || !state.f) return;
    width = window.innerWidth;
    renderChartBlock(state.f);
  });
}

async function init() {
  setLang(detectLang());
  applyStatic();
  initControls();
  startParticles($("hero-canvas"));

  const status = $("zip-status");
  status.textContent = t("status.loading");
  try {
    const resp = await fetch("data/market.json", { cache: "no-cache" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    state.market = await resp.json();
  } catch (err) {
    console.error(err);
    status.textContent = t("status.error");
    status.classList.add("is-error");
    return;
  }
  status.textContent = "";

  const fromUrl = new URL(location.href).searchParams.get("zip");
  const zip = isZip(fromUrl || "") ? fromUrl : store.get("gsg.zip");
  if (zip && isZip(zip)) {
    $("zip-input").value = zip;
    useZip(zip);
  } else {
    render();
  }
}

init();
