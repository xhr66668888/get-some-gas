import { forecast } from "./engine.js";
import { resolveZip, isZip } from "./regions.js";
import { t, setLang, detectLang, getLang, applyStatic, areaName, fmtDate, fmtWeekday, fmtTime } from "./i18n.js";
import { renderChart } from "./chart.js";
import { startParticles } from "./particles.js";

// A GitHub Action republishes market.json to this repo's `data` branch every 30 minutes on
// weekdays, so the page reads that first. The copy deployed with the site is the fallback.
const DATA_SOURCES = [
  "https://raw.githubusercontent.com/xhr66668888/get-some-gas/data/market.json",
  "data/market.json",
];
const REFRESH_MS = 10 * 60 * 1000;

const $ = (id) => document.getElementById(id);
const state = { market: null, place: null, gallons: 15, f: null };

const store = {
  get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch {}
  },
};

const money = (v) => `$${v.toFixed(2)}`;

function cents(v) {
  const c = Math.abs(v * 100);
  return `${c >= 9.95 ? c.toFixed(0) : c.toFixed(1)}¢`;
}

/** Newest of the available copies of market.json. */
async function loadMarket() {
  const bucket = Math.floor(Date.now() / 300000);
  const results = await Promise.allSettled(DATA_SOURCES.map(async (url) => {
    const resp = await fetch(url.startsWith("http") ? `${url}?t=${bucket}` : url, { cache: "no-cache" });
    if (!resp.ok) throw new Error(`${url}: HTTP ${resp.status}`);
    return resp.json();
  }));
  const copies = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
  if (!copies.length) throw new Error("no market data");
  return copies.reduce((a, b) => (Date.parse(b.generated) > Date.parse(a.generated) ? b : a));
}

// ---- rendering -------------------------------------------------------------

function savingsPerGallon(f) {
  if (f.kind === "wait" || f.kind === "steady") return f.savings;
  return Math.max(0, f.rise);
}

function renderSavings() {
  const amount = savingsPerGallon(state.f) * state.gallons;
  $("answer-save").textContent = t("answer.save", { amount: `$${amount.toFixed(2)}` });
}

function renderAnswer(f) {
  const { place } = state;
  const best = f.days[f.best];
  const today = f.days[0];
  const peak = f.days[f.peak];
  $("answer-place").textContent = `${areaName(place.areaId)} · ${place.zip}`;
  $("answer-weekday").textContent = f.best === 0 ? t("answer.today") : fmtWeekday(best.day);
  $("answer-date").textContent = f.best === 0 ? `${fmtDate(best.day)} ${fmtWeekday(best.day)}` : fmtDate(best.day);
  let line;
  if (f.kind === "wait" || f.kind === "steady") line = t("answer.wait", { price: money(best.mean), cents: cents(f.savings) });
  else if (f.kind === "now") line = t("answer.now", { price: money(today.mean), peak: money(peak.mean), day: fmtWeekday(peak.day) });
  else line = t("answer.flat", { price: money(today.mean) });
  $("answer-price").textContent = line;
  renderSavings();
}

function renderTrend() {
  const host = $("chart");
  host.dataset.label = t("chart.aria", { area: areaName(state.place.areaId) });
  renderChart(host, state.f, state.market.areas[state.place.areaId], money);
}

function render() {
  if (state.market) $("updated").textContent = t("footer.updated", { time: fmtTime(state.market.generated) });
  if (!state.market || !state.place) return;
  state.f = forecast(state.market, state.place.areaId);
  $("result").hidden = false;
  document.body.classList.add("has-result");
  renderAnswer(state.f);
  renderTrend();
}

// ---- inputs ----------------------------------------------------------------

function setStatus(text, isError = false) {
  const status = $("zip-status");
  status.textContent = text;
  status.classList.toggle("is-error", isError);
}

function useZip(zip, { scroll = false } = {}) {
  if (!isZip(zip)) {
    setStatus(t("zip.invalid"), true);
    return;
  }
  state.place = resolveZip(zip, state.market.areas);
  setStatus(state.place.covered ? "" : t("zip.unsupported"));
  store.set("gsg.zip", zip);
  const url = new URL(location.href);
  url.searchParams.set("zip", zip);
  history.replaceState(null, "", url);
  render();
  if (scroll) $("result").scrollIntoView({ behavior: "smooth", block: "start" });
}

function initControls() {
  $("zip-form").addEventListener("submit", (evt) => {
    evt.preventDefault();
    if (state.market) useZip($("zip-input").value.trim(), { scroll: true });
  });
  $("zip-input").addEventListener("input", (evt) => {
    evt.target.value = evt.target.value.replace(/\D/g, "").slice(0, 5);
  });

  const gallons = $("gallons");
  const saved = Number(store.get("gsg.gallons"));
  state.gallons = saved >= 1 && saved <= 999 ? saved : 15;
  gallons.value = String(state.gallons);
  gallons.addEventListener("input", () => {
    const n = Number(gallons.value);
    if (!Number.isFinite(n) || n < 1 || n > 999) return;
    state.gallons = n;
    store.set("gsg.gallons", String(n));
    if (state.f) renderSavings();
  });

  $("lang-toggle").addEventListener("click", () => {
    setLang(getLang() === "zh" ? "en" : "zh");
    store.set("gsg.lang", getLang());
    applyStatic();
    if (state.place && !state.place.covered) setStatus(t("zip.unsupported"));
    render();
  });

  let width = window.innerWidth;
  window.addEventListener("resize", () => {
    if (Math.abs(window.innerWidth - width) < 4 || !state.f) return;
    width = window.innerWidth;
    renderTrend();
  });
}

async function refresh() {
  try {
    const market = await loadMarket();
    if (market.generated !== state.market?.generated) {
      state.market = market;
      render();
    }
  } catch (err) {
    console.error(err);
  }
}

async function init() {
  setLang(detectLang());
  applyStatic();
  initControls();
  startParticles($("hero-canvas"));

  setStatus(t("status.loading"));
  try {
    state.market = await loadMarket();
  } catch (err) {
    console.error(err);
    setStatus(t("status.error"), true);
    return;
  }
  setStatus("");

  const fromUrl = new URL(location.href).searchParams.get("zip");
  const zip = isZip(fromUrl || "") ? fromUrl : store.get("gsg.zip");
  if (zip && isZip(zip)) {
    $("zip-input").value = zip;
    useZip(zip);
  } else {
    render();
  }

  // Keep following the market while the page stays open.
  setInterval(refresh, REFRESH_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refresh();
  });
}

init();
