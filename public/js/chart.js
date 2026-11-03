// Gas price trend: recent EIA surveys, today's estimate and the 7-day forecast as one
// line with the best day marked. Plain SVG sized to its container, with a crosshair
// tooltip (pointer and arrow keys) and a screen-reader table of the same points.

import { t, fmtDate, fmtDayLong, fmtWeekday } from "./i18n.js";

const NS = "http://www.w3.org/2000/svg";
const DAY_MS = 86400000;

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

/** Weekly surveys before the last one, then a point per day from the last survey on. */
function trendPoints(f, area, historyDays) {
  const start = f.today - historyDays;
  const surveys = area.retail
    .map(([iso, price]) => ({ day: Date.parse(iso) / DAY_MS, price, actual: true }))
    .filter((p) => p.day >= start && p.day < f.d0);
  const path = f.path.map((p) => ({ day: p.day, price: p.mean, actual: p.day === f.d0 }));
  return [...surveys, ...path];
}

export function renderChart(host, f, area, money) {
  host.textContent = "";
  const width = Math.max(280, host.clientWidth);
  const narrow = width < 560;
  const height = narrow ? 220 : 280;
  const points = trendPoints(f, area, narrow ? 28 : 35);
  const m = { top: 34, right: narrow ? 14 : 20, bottom: 30, left: narrow ? 46 : 54 };
  const iw = width - m.left - m.right;
  const ih = height - m.top - m.bottom;
  const first = points[0].day;

  // The best day's label sits below its dot when prices fall into it, above otherwise.
  const best = f.days[f.best];
  const before = points.filter((p) => p.day < best.day).pop();
  const labelBelow = Boolean(before) && before.price > best.mean;
  const prices = points.map((p) => p.price);
  let lo = Math.min(...prices);
  let hi = Math.max(...prices);
  const span = Math.max(0.04, hi - lo);
  const step = niceStep(span * 1.4, narrow ? 3 : 4);
  lo = Math.floor((lo - span * (labelBelow ? 0.3 : 0.12)) / step) * step;
  hi = Math.ceil((hi + span * (labelBelow ? 0.12 : 0.3)) / step) * step;

  const x = (d) => m.left + ((d - first) / (f.end - first)) * iw;
  const y = (v) => m.top + (1 - (v - lo) / (hi - lo)) * ih;
  const line = (pts) => pts.map((p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)},${y(p.price).toFixed(1)}`).join("");

  const svg = svgEl("svg", {
    width, height, viewBox: `0 0 ${width} ${height}`, role: "img", tabindex: "0",
    "aria-label": host.dataset.label || "", class: "chart-svg",
  }, host);

  const grid = svgEl("g", { class: "chart-grid" }, svg);
  for (let v = lo; v <= hi + 1e-9; v += step) {
    svgEl("line", { x1: m.left, x2: m.left + iw, y1: y(v), y2: y(v) }, grid);
    const label = svgEl("text", { x: m.left - 10, y: y(v) + 4, "text-anchor": "end", class: "chart-tick" }, grid);
    label.textContent = `$${v.toFixed(2)}`;
  }
  // Date ticks on Mondays, spaced so labels never collide.
  const tickEvery = [7, 14, 28].find((n) => (n * iw) / (f.end - first) >= 64) || 28;
  let monday = first;
  while (new Date(monday * DAY_MS).getUTCDay() !== 1) monday++;
  for (let d = monday; d <= f.end; d += tickEvery) {
    const label = svgEl("text", { x: x(d), y: height - 8, "text-anchor": "middle", class: "chart-tick" }, grid);
    label.textContent = fmtDate(d);
  }

  svgEl("line", { x1: x(f.today), x2: x(f.today), y1: m.top - 12, y2: m.top + ih, class: "chart-today" }, svg);
  const todayLabel = svgEl("text", { x: x(f.today), y: m.top - 18, "text-anchor": "middle", class: "chart-today-label" }, svg);
  todayLabel.textContent = t("chart.today");

  const actual = points.filter((p) => p.actual);
  const ahead = points.filter((p) => p.day >= f.d0);
  svgEl("path", { d: line(actual), class: "chart-line" }, svg);
  svgEl("path", { d: line(ahead), class: "chart-line is-forecast" }, svg);
  for (const p of actual) svgEl("circle", { cx: x(p.day), cy: y(p.price), r: 3.5, class: "chart-dot" }, svg);

  const byDay = new Map(points.map((p) => [p.day, p]));
  const today = byDay.get(f.today);
  svgEl("circle", { cx: x(today.day), cy: y(today.price), r: 5, class: "chart-dot is-today" }, svg);

  // Best day: green dot plus a direct label.
  const bx = x(best.day);
  const by = y(best.mean);
  svgEl("circle", { cx: bx, cy: by, r: 6.5, class: "chart-best" }, svg);
  const anchor = bx > width - 70 ? "end" : bx < m.left + 60 ? "start" : "middle";
  const bestLabel = svgEl("text", {
    x: bx + (anchor === "end" ? 6 : 0), y: labelBelow ? by + 24 : by - 14,
    "text-anchor": anchor, class: "chart-best-label",
  }, svg);
  bestLabel.textContent = `${f.best === 0 ? t("chart.today") : fmtWeekday(best.day)} ${money(best.mean)}`;

  // Crosshair and tooltip, snapping to the points on the line.
  const hover = svgEl("g", { class: "chart-hover", visibility: "hidden" }, svg);
  const hLine = svgEl("line", { y1: m.top, y2: m.top + ih, class: "chart-crosshair" }, hover);
  const hDot = svgEl("circle", { r: 5, class: "chart-dot is-hover" }, hover);
  const tip = document.createElement("div");
  tip.className = "chart-tip";
  tip.hidden = true;
  host.appendChild(tip);

  let current = points.indexOf(today);
  function show(index) {
    current = Math.min(points.length - 1, Math.max(0, index));
    const p = points[current];
    hover.setAttribute("visibility", "visible");
    for (const attr of ["x1", "x2"]) hLine.setAttribute(attr, x(p.day));
    hDot.setAttribute("cx", x(p.day));
    hDot.setAttribute("cy", y(p.price));
    tip.textContent = "";
    const title = document.createElement("div");
    title.className = "chart-tip-title";
    title.textContent = fmtDayLong(p.day);
    const value = document.createElement("div");
    value.className = "chart-tip-value";
    const strong = document.createElement("strong");
    strong.textContent = money(p.price);
    const tag = document.createElement("span");
    tag.textContent = t(p.actual ? "chart.actual" : "chart.forecast");
    value.append(strong, tag);
    tip.append(title, value);
    tip.hidden = false;
    const tw = tip.offsetWidth;
    tip.style.left = `${Math.min(Math.max(x(p.day) - tw / 2, 4), width - tw - 4)}px`;
    tip.style.top = `${Math.max(4, y(p.price) - tip.offsetHeight - 16)}px`;
  }
  function hide() {
    hover.setAttribute("visibility", "hidden");
    tip.hidden = true;
  }
  const nearest = (evt) => {
    const box = svg.getBoundingClientRect();
    const day = first + ((evt.clientX - box.left - m.left) / iw) * (f.end - first);
    return points.reduce((bi, p, i) => (Math.abs(p.day - day) < Math.abs(points[bi].day - day) ? i : bi), 0);
  };
  const hit = svgEl("rect", { x: m.left - 6, y: 0, width: iw + 12, height, fill: "transparent" }, svg);
  hit.addEventListener("pointermove", (evt) => show(nearest(evt)));
  hit.addEventListener("pointerdown", (evt) => show(nearest(evt)));
  hit.addEventListener("pointerleave", hide);
  svg.addEventListener("focus", () => show(current));
  svg.addEventListener("blur", hide);
  svg.addEventListener("keydown", (evt) => {
    if (evt.key === "ArrowLeft" || evt.key === "ArrowRight") {
      evt.preventDefault();
      show(current + (evt.key === "ArrowLeft" ? -1 : 1));
    } else if (evt.key === "Escape") hide();
  });

  // The same points as a table for screen readers.
  const table = document.createElement("table");
  table.className = "visually-hidden";
  const head = table.createTHead().insertRow();
  for (const key of ["chart.date", "chart.price"]) {
    const th = document.createElement("th");
    th.textContent = t(key);
    head.appendChild(th);
  }
  const body = table.createTBody();
  for (const p of points) {
    const row = body.insertRow();
    row.insertCell().textContent = `${fmtDayLong(p.day)} · ${t(p.actual ? "chart.actual" : "chart.forecast")}`;
    row.insertCell().textContent = money(p.price);
  }
  host.appendChild(table);
}
