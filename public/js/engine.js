// Forecast engine. Runs the pump-price model calibrated by scripts/fetch_data.py:
//
//   target(d) = a + b * W(d - lag)
//   pump(d)   = pump(d-1) + k * (target(d) - pump(d-1)),   k = kUp if target > pump else kDown
//
// W is the region's blend of wholesale hubs. On top of the recursion, rho times last
// week's miss carries into the coming week (weekly misses are autocorrelated).
// Wholesale prices after the last market close are unknown, so we simulate them as a
// random walk built from recent daily moves. Together with the model's own error this
// gives the 80% ranges and the chance that each day is the cheapest of the week.

const DAY_MS = 86400000;

// Typical weekly rhythm at the pump in $/gal relative to Monday, indexed Sun..Sat.
// GasBuddy's station-level studies (2017-2019) find Monday cheapest and Thursday-Friday
// priciest. EIA surveys on Mondays, so the model itself is a "Monday" price.
export const DOW_ADJ = [0.006, 0, 0.003, 0.009, 0.018, 0.022, 0.014];

export const dayNum = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
};
export const isoDay = (day) => new Date(day * DAY_MS).toISOString().slice(0, 10);
export const weekday = (day) => new Date(day * DAY_MS).getUTCDay();
export const localToday = () => {
  const now = new Date();
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAY_MS;
};

function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function gaussian(rand) {
  return Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
}

function quantile(sorted, q) {
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.min(lo + 1, sorted.length - 1);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

function summarize(values) {
  const sorted = Float64Array.from(values).sort();
  let sum = 0;
  for (const v of values) sum += v;
  return { mean: sum / values.length, p10: quantile(sorted, 0.1), p50: quantile(sorted, 0.5), p90: quantile(sorted, 0.9) };
}

/**
 * 7-day forecast for one EIA region.
 * Returns daily stats (today .. today+horizon-1), the chart path from the last survey,
 * the recommended day and the drivers behind it. Prices are in $/gal.
 */
export function forecast(market, areaId, { today = localToday(), horizon = 7, paths = 3000 } = {}) {
  const area = market.areas[areaId];
  const { a, b, kUp, kDown, lag, sigma, rho = 0, surprise = 0 } = area;
  const hubs = Object.keys(area.weights).map((id) => [market.hubs[id], area.weights[id]]);
  const mix = (key, i) => hubs.reduce((sum, [hub, w]) => sum + w * hub[key][i], 0);

  const wStart = dayNum(market.hubStart);
  const known = hubs[0][0].values.map((_, i) => mix("values", i));
  const lastKnown = wStart + known.length - 1;
  const wholesale = (d) => known[Math.min(Math.max(d, wStart), lastKnown) - wStart];
  const target = (d) => a + b * wholesale(d - lag);

  const [surveyIso, surveyPrice] = area.retail[area.retail.length - 1];
  const d0 = dayNum(surveyIso);
  today = Math.max(today, d0);
  const end = today + horizon - 1;
  const carry = rho * surprise;
  const drift = (d) => {
    const h = d - d0;
    return carry * (Math.min(h, 7) + rho * Math.min(Math.max(h - 7, 0), 7)) / 7;
  };
  const adj = (d) => DOW_ADJ[weekday(d)] + drift(d);

  // Expected path with wholesale held at its latest price (one extra day to see the trend continue).
  const base = [surveyPrice];
  for (let d = d0 + 1, r = surveyPrice; d <= end + 1; d++) {
    const gap = target(d) - r;
    r += (gap > 0 ? kUp : kDown) * gap;
    base.push(r);
  }
  const baseAt = (d) => base[d - d0] + drift(d);

  // Monte Carlo: bootstrap demeaned daily wholesale moves (no drift = random walk) on weekdays.
  const rand = mulberry32(hash(`${areaId}|${today}|${market.generated}`));
  const rawShocks = hubs[0][0].shocks.map((_, i) => mix("shocks", i));
  const mean = rawShocks.reduce((s, x) => s + x, 0) / rawShocks.length;
  const shocks = rawShocks.map((x) => x - mean);
  const noise = sigma / Math.sqrt(7);
  const nSim = end - d0;
  const sims = Array.from({ length: nSim }, () => new Float64Array(paths));
  const future = new Float64Array(Math.max(0, end - lastKnown));
  for (let p = 0; p < paths; p++) {
    let w = known[known.length - 1];
    for (let d = lastKnown + 1; d <= end; d++) {
      const wd = weekday(d);
      if (wd !== 0 && wd !== 6) w += shocks[(rand() * shocks.length) | 0];
      future[d - lastKnown - 1] = w;
    }
    let r = surveyPrice;
    for (let d = d0 + 1; d <= end; d++) {
      const wd = d - lag;
      const W = wd <= lastKnown ? wholesale(wd) : future[wd - lastKnown - 1];
      const gap = a + b * W - r;
      r += (gap > 0 ? kUp : kDown) * gap + noise * gaussian(rand);
      sims[d - d0 - 1][p] = r;
    }
  }
  const simAt = (d, p) => (d === d0 ? surveyPrice : sims[d - d0 - 1][p]);

  // Daily stats with the weekly rhythm added, plus how often each day is the week's cheapest.
  const cheapest = new Float64Array(horizon);
  const belowToday = new Float64Array(horizon);
  const row = new Float64Array(horizon);
  for (let p = 0; p < paths; p++) {
    let best = 0;
    for (let i = 0; i < horizon; i++) {
      row[i] = simAt(today + i, p) + adj(today + i);
      if (row[i] < row[best]) best = i;
      if (row[i] < row[0]) belowToday[i]++;
    }
    cheapest[best]++;
  }
  const days = [];
  for (let i = 0; i < horizon; i++) {
    const d = today + i;
    const vals = new Float64Array(paths);
    for (let p = 0; p < paths; p++) vals[p] = simAt(d, p) + adj(d);
    days.push({ day: d, ...summarize(vals), pCheapest: cheapest[i] / paths, pBelowToday: belowToday[i] / paths });
  }

  const path = [];
  for (let d = d0; d <= end; d++) {
    if (d === d0) {
      path.push({ day: d, mean: surveyPrice, p10: surveyPrice, p90: surveyPrice });
      continue;
    }
    const vals = sims[d - d0 - 1].map((v) => v + adj(d));
    const s = summarize(vals);
    path.push({ day: d, mean: s.mean, p10: s.p10, p90: s.p90 });
  }

  // Recommendation: cheapest expected day, and how sure we are it beats today.
  let best = 0;
  days.forEach((x, i) => { if (x.mean < days[best].mean - 1e-9) best = i; });
  const savings = days[0].mean - days[best].mean;
  const peak = days.reduce((m, x, i) => (x.mean > days[m].mean ? i : m), 0);
  const rise = days[peak].mean - days[0].mean;
  let kind;
  if (best === 0) kind = rise >= 0.02 ? "now" : "steady-now";
  else kind = savings >= 0.02 ? "wait" : "steady";
  const pBetter = best === 0 ? 1 - days[peak].pBelowToday : days[best].pBelowToday;

  // Drivers behind the call.
  const pumpNow = baseAt(today);
  const targetNow = target(today);
  const ref = [...area.retail].reverse().find(([iso]) => dayNum(iso) <= today - 28) || area.retail[0];
  const drivers = {
    targetNow,
    pumpNow,
    gap: targetNow - pumpNow,
    wholesaleChange: b * (wholesale(lastKnown) - wholesale(lastKnown - 28)),
    pumpChange: pumpNow - ref[1],
    pipelineWeek: baseAt(end) - baseAt(today),
    stillFalling: baseAt(end + 1) < baseAt(end) - 0.002,
    stillRising: baseAt(end + 1) > baseAt(end) + 0.002,
  };

  return {
    areaId, today, d0, end, surveyPrice, lastKnown,
    spotThrough: Math.min(...hubs.map(([hub]) => dayNum(hub.spotThrough))),
    days, path, target, wholesale,
    best, peak, kind, savings, rise, pBetter, drivers,
  };
}
