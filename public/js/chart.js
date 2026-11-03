// Pump price vs. wholesale-implied price, with the forecast's 80% range. Plain SVG,
// sized to its container, with a crosshair tooltip (pointer and arrow keys).

import { t, fmtDate, fmtDayLong } from "./i18n.js";

const NS = "http://www.w3.org/2000/svg";
const HISTORY_DAYS = 70;
const HISTORY_DAYS_NARROW = 42;

function svgEl(name, attrs, parent) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.appendChild(node);
  return node;
}

function niceStep(span, target) {
  const raw = span / target;
  return [0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 1].find((s) => s >= raw) || 1;
}

/** Series the chart and its table view share. */
export function chartSeries(f, area, historyDays = HISTORY_DAYS) {
  const start = f.today - historyDays;
  const surveys = area.retail
    .map(([iso, price]) => ({ day: Date.parse(iso) / 86400000, price }))
    .filter((s) => s.day >= start);
  const first = Math.min(start, surveys.length ? surveys[0].day : start);
  const target = [];
  for (let d = first; d <= f.end; d++) target.push({ day: d, value: f.target(d) });
  return { first, surveys, target, path: f.path };
}

export function renderChart(host, f, area, money) {
  host.textContent = "";
  const width = Math.max(300, host.clientWidth);
  const narrow = width < 560;
  const { first, surveys, target, path } = chartSeries(f, area, narrow ? HISTORY_DAYS_NARROW : HISTORY_DAYS);
  const height = narrow ? 250 : 320;
  const m = { top: 24, right: narrow ? 52 : 64, bottom: 30, left: narrow ? 44 : 52 };
  const iw = width - m.left - m.right;
  const ih = height - m.top - m.bottom;

  const values = [
    ...surveys.map((s) => s.price),
    ...target.map((p) => p.value),
    ...path.flatMap((p) => [p.p10, p.p90]),
  ];
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  const pad = Math.max(0.02, (hi - lo) * 0.08);
  lo -= pad;
  hi += pad;
  const step = niceStep(hi - lo, narrow ? 4 : 5);
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;

  const x = (d) => m.left + ((d - first) / (f.end - first)) * iw;
  const y = (v) => m.top + (1 - (v - lo) / (hi - lo)) * ih;
  const line = (pts) => pts.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`).join("");

  const svg = svgEl("svg", {
    width, height, viewBox: `0 0 ${width} ${height}`, role: "img", tabindex: "0",
    "aria-label": host.dataset.label || "", class: "chart-svg",
  }, host);

  // Grid and axes: solid hairlines, recessive.
  const grid = svgEl("g", { class: "chart-grid" }, svg);
  for (let v = lo; v <= hi + 1e-9; v += step) {
    svgEl("line", { x1: m.left, x2: m.left + iw, y1: y(v), y2: y(v) }, grid);
    const label = svgEl("text", { x: m.left - 8, y: y(v) + 4, "text-anchor": "end", class: "chart-tick" }, grid);
    label.textContent = `$${v.toFixed(step < 0.1 ? 2 : step < 1 ? 2 : 0)}`;
  }
  // Date ticks on Mondays, spaced so labels never collide.
  const pxPerDay = iw / (f.end - first);
  const tickEvery = [7, 14, 28].find((n) => n * pxPerDay >= 62) || 28;
  let monday = first;
  while (new Date(monday * 86400000).getUTCDay() !== 1) monday++;
  for (let d = monday; d <= f.end; d += tickEvery) {
    const label = svgEl("text", { x: x(d), y: height - 8, "text-anchor": "middle", class: "chart-tick" }, grid);
    label.textContent = fmtDate(d);
  }

  // Today marker.
  svgEl("line", { x1: x(f.today), x2: x(f.today), y1: m.top - 6, y2: m.top + ih, class: "chart-today" }, svg);
  const todayLabel = svgEl("text", { x: x(f.today), y: m.top - 10, "text-anchor": "middle", class: "chart-today-label" }, svg);
  todayLabel.textContent = t("chart.today");

  // 80% range of the estimate and forecast.
  const band = [...path.map((p) => [x(p.day), y(p.p90)]), ...[...path].reverse().map((p) => [x(p.day), y(p.p10)])];
  svgEl("path", { d: `${line(band)}Z`, class: "chart-band" }, svg);

  // Wholesale-implied price: solid where wholesale is known, dashed where it's held flat.
  const knownUntil = f.lastKnown + (area.lag || 0);
  const tKnown = target.filter((p) => p.day <= knownUntil).map((p) => [x(p.day), y(p.value)]);
  const tFlat = target.filter((p) => p.day >= knownUntil).map((p) => [x(p.day), y(p.value)]);
  svgEl("path", { d: line(tKnown), class: "chart-target" }, svg);
  if (tFlat.length > 1) svgEl("path", { d: line(tFlat), class: "chart-target is-flat" }, svg);

  // Pump price: surveys (solid), then the model's estimate and forecast (dashed).
  svgEl("path", { d: line(surveys.map((s) => [x(s.day), y(s.price)])), class: "chart-pump" }, svg);
  svgEl("path", { d: line(path.map((p) => [x(p.day), y(p.mean)])), class: "chart-pump is-forecast" }, svg);
  for (const s of surveys) svgEl("circle", { cx: x(s.day), cy: y(s.price), r: 4, class: "chart-dot" }, svg);

  // Best day marker.
  const bestDay = f.days[f.best];
  svgEl("circle", { cx: x(bestDay.day), cy: y(bestDay.mean), r: 5.5, class: "chart-best" }, svg);

  // End values (selective direct labels).
  const endPump = path[path.length - 1].mean;
  const endTarget = target[target.length - 1].value;
  const ends = [[endPump, "chart-end"], [endTarget, "chart-end is-muted"]];
  if (Math.abs(y(endPump) - y(endTarget)) < 14) {
    const mid = (y(endPump) + y(endTarget)) / 2;
    const up = endPump >= endTarget ? -8 : 8;
    ends[0].push(mid + up);
    ends[1].push(mid - up);
  }
  for (const [v, cls, py] of ends) {
    const label = svgEl("text", { x: m.left + iw + 6, y: (py ?? y(v)) + 4, class: cls }, svg);
    label.textContent = money(v);
  }

  // Crosshair + tooltip.
  const hover = svgEl("g", { class: "chart-hover", visibility: "hidden" }, svg);
  const hLine = svgEl("line", { y1: m.top, y2: m.top + ih, class: "chart-crosshair" }, hover);
  const hPump = svgEl("circle", { r: 4.5, class: "chart-dot is-hover" }, hover);
  const hTarget = svgEl("circle", { r: 4, class: "chart-dot is-target" }, hover);
  const tip = document.createElement("div");
  tip.className = "chart-tip";
  tip.hidden = true;
  host.appendChild(tip);

  const surveyByDay = new Map(surveys.map((s) => [s.day, s.price]));
  const pathByDay = new Map(path.map((p) => [p.day, p]));
  const targetByDay = new Map(target.map((p) => [p.day, p.value]));
  // Crosshair stops: weekly surveys in the past, every day from the last survey on.
  const stops = [...surveys.map((s) => s.day).filter((d) => d < f.d0), ...path.map((p) => p.day)];
  const nearest = (day) => stops.reduce((best, d, i) => (Math.abs(d - day) < Math.abs(stops[best] - day) ? i : best), 0);
  let current = stops.indexOf(f.today);

  function row(keyClass, value, label) {
    const r = document.createElement("div");
    r.className = "chart-tip-row";
    const key = document.createElement("span");
    key.className = `chart-tip-key ${keyClass}`;
    const val = document.createElement("strong");
    val.textContent = value;
    const name = document.createElement("span");
    name.textContent = label;
    r.append(key, val, name);
    return r;
  }

  function show(index) {
    current = Math.min(stops.length - 1, Math.max(0, index));
    const day = stops[current];
    const survey = surveyByDay.get(day);
    const est = pathByDay.get(day);
    const pump = survey ?? est.mean;
    hover.setAttribute("visibility", "visible");
    hLine.setAttribute("x1", x(day));
    hLine.setAttribute("x2", x(day));
    hTarget.setAttribute("cx", x(day));
    hTarget.setAttribute("cy", y(targetByDay.get(day)));
    hPump.setAttribute("cx", x(day));
    hPump.setAttribute("cy", y(pump));
    tip.textContent = "";
    const title = document.createElement("div");
    title.className = "chart-tip-title";
    title.textContent = fmtDayLong(day);
    tip.appendChild(title);
    if (survey != null) tip.appendChild(row("is-pump", money(survey), t("chart.survey")));
    else {
      tip.appendChild(row("is-forecast", money(est.mean), t("chart.estimate")));
      tip.appendChild(row("is-band", `${money(est.p10)} – ${money(est.p90)}`, t("chart.range")));
    }
    tip.appendChild(row("is-target", money(targetByDay.get(day)), t("chart.target")));
    tip.hidden = false;
    const left = x(day);
    const tw = tip.offsetWidth;
    tip.style.left = `${Math.min(Math.max(left - tw / 2, 4), width - tw - 4)}px`;
    tip.style.top = `${m.top + 8}px`;
  }

  function hide() {
    hover.setAttribute("visibility", "hidden");
    tip.hidden = true;
  }

  const hit = svgEl("rect", { x: m.left, y: 0, width: iw + 6, height, fill: "transparent" }, svg);
  const toStop = (evt) => {
    const box = svg.getBoundingClientRect();
    return nearest(first + ((evt.clientX - box.left - m.left) / iw) * (f.end - first));
  };
  hit.addEventListener("pointermove", (evt) => show(toStop(evt)));
  hit.addEventListener("pointerdown", (evt) => show(toStop(evt)));
  hit.addEventListener("pointerleave", hide);
  svg.addEventListener("focus", () => show(current));
  svg.addEventListener("blur", hide);
  svg.addEventListener("keydown", (evt) => {
    if (evt.key === "ArrowLeft" || evt.key === "ArrowRight") {
      evt.preventDefault();
      show(current + (evt.key === "ArrowLeft" ? -1 : 1));
    } else if (evt.key === "Escape") hide();
  });
}

/** Table view of the same numbers, so nothing is only reachable by hovering. */
export function renderTable(host, f, area, money) {
  const { surveys, path, target } = chartSeries(f, area);
  const targetByDay = new Map(target.map((p) => [p.day, p.value]));
  const rows = [
    ...surveys.map((s) => ({ day: s.day, pump: s.price, survey: true })),
    ...path.filter((p) => p.day > f.d0).map((p) => ({ day: p.day, pump: p.mean, lo: p.p10, hi: p.p90 })),
  ];
  const table = document.createElement("table");
  table.className = "data-table";
  const head = table.createTHead().insertRow();
  for (const key of ["chart.col.date", "chart.col.pump", "chart.col.low", "chart.col.high", "chart.col.target"]) {
    const th = document.createElement("th");
    th.textContent = t(key);
    head.appendChild(th);
  }
  const body = table.createTBody();
  for (const r of rows) {
    const tr = body.insertRow();
    if (r.day === f.today) tr.className = "is-today";
    const cells = [
      `${fmtDate(r.day)}${r.survey ? ` · ${t("chart.survey")}` : r.day === f.today ? ` · ${t("chart.today")}` : ""}`,
      money(r.pump),
      r.lo != null ? money(r.lo) : "—",
      r.hi != null ? money(r.hi) : "—",
      money(targetByDay.get(r.day)),
    ];
    for (const c of cells) tr.insertCell().textContent = c;
  }
  host.textContent = "";
  host.appendChild(table);
}
