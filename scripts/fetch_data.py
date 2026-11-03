#!/usr/bin/env python3
"""
Fetch oil and gasoline market data, calibrate the pump-price model for every EIA
region, and write public/data/market.json for the static site.

Standard library only (Python 3.9+), so it runs locally and on GitHub Actions as-is:

    python3 scripts/fetch_data.py                   # EIA's shared DEMO_KEY (rate-limited)
    EIA_API_KEY=your_key python3 scripts/fetch_data.py

The model
---------
Pump prices chase wholesale gasoline with a delay. For each region the average pump
price r closes a fraction k of its gap to a wholesale-implied target every day:

    target(d) = a + b * W(d - L)
    r(d)      = r(d-1) + k * (target(d) - r(d-1)),   k = k_up if target > r else k_down

W is the region's wholesale benchmark: a blend of EIA daily spot prices at the Gulf
Coast, New York Harbor and Los Angeles hubs, carried to today with NYMEX futures.
a + b*W covers taxes, freight and station margin, L is the delivery delay in days, and
k_up > k_down is the "rockets and feathers" asymmetry. Hub weights and parameters are
fit to EIA's weekly pump-price survey by minimising Monday-to-Monday prediction error.

Two refinements, each chosen because it cut out-of-sample error: the margin a leans on
the last few months (margins drift with the market regime), and part of last week's
miss carries into this week (rho, the autocorrelation of weekly misses). Everything is
checked with an out-of-sample backtest over the most recent year.

public/js/engine.js runs the same recursion in the browser for the 7-day forecast.
"""

import json
import math
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_PATH = os.path.join(ROOT, "public", "data", "market.json")

EIA_KEY = os.environ.get("EIA_API_KEY") or "DEMO_KEY"
USER_AGENT = "Mozilla/5.0"
ONE_DAY = timedelta(days=1)

HISTORY_YEARS = 5
CAL_WEEKS = 156          # calibration window (3 years of weekly surveys)
BACKTEST_WEEKS = 52      # out-of-sample test window
HALF_LIFE_WEEKS = 52     # recency weighting for the dynamics
MARGIN_HALF_LIFE = 13    # faster recency weighting for the margin a
CHART_WEEKS = 26         # retail history shipped to the browser
BENCH_DAYS = 220         # calendar days of wholesale history shipped to the browser
SHOCK_DAYS = 250         # daily wholesale changes kept for the Monte Carlo bootstrap

K_GRID = (0.02, 0.03, 0.045, 0.065, 0.09, 0.12, 0.16, 0.21, 0.28, 0.37, 0.5)
LAG_GRID = (0, 1, 2, 3)

SPOT = {
    "GC": ("EER_EPMRU_PF4_RGC_DPG", "U.S. Gulf Coast conventional gasoline"),
    "NYH": ("EER_EPMRU_PF4_Y35NY_DPG", "New York Harbor conventional gasoline"),
    "LA": ("EER_EPMRR_PF4_Y05LA_DPG", "Los Angeles RBOB gasoline"),
}
CRUDE_SPOT = {"WTI": "RWTC", "BRENT": "RBRTE"}

# Front-month futures on Yahoo Finance: root symbol and the day of the month after which
# the nearest contract is about to expire (so we start from the following one).
FUTURES = {"RBOB": ("RB", 26), "WTI": ("CL", 17), "BRENT": ("BZ", 26)}
MONTH_CODES = "FGHJKMNQUVXZ"

# Wholesale hubs each region's benchmark may blend; weights come from the data.
# One hub alone is fragile: since Aug 2026 New York Harbor has traded 20-40c under the
# Gulf Coast, the reverse of normal, and a NYH-only national model overshot declines.
WEST = ("LA", "GC")
NATIONAL = ("GC", "NYH", "LA")
AREA_HUBS = {"NUS": NATIONAL, "R50": WEST, "R5XCA": WEST, "SCA": WEST, "SWA": WEST,
             "Y05LA": WEST, "Y05SF": WEST, "Y48SE": WEST}
DEFAULT_HUBS = ("GC", "NYH")
WEIGHT_STEP = 0.25


def log(msg):
    print(msg, file=sys.stderr, flush=True)


def http_json(url, retries=3, timeout=40):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.load(resp)
        except Exception:
            if attempt == retries - 1:
                raise
            time.sleep(2 * (attempt + 1))


def parse_day(s):
    return date.fromisoformat(s[:10])


# ---------------------------------------------------------------------------
# Data sources
# ---------------------------------------------------------------------------

def eia_rows(route, frequency, facets, start):
    """All rows of an EIA API v2 query, following pagination (5000 rows per page)."""
    rows, offset = [], 0
    while True:
        params = [
            ("api_key", EIA_KEY), ("frequency", frequency), ("data[0]", "value"), ("start", start),
            ("sort[0][column]", "period"), ("sort[0][direction]", "asc"),
            ("offset", offset), ("length", 5000),
        ]
        for name, values in facets.items():
            params += [(f"facets[{name}][]", v) for v in values]
        url = f"https://api.eia.gov/v2/{route}/data/?" + urllib.parse.urlencode(params)
        resp = http_json(url)["response"]
        batch = resp.get("data", [])
        rows += batch
        offset += len(batch)
        if not batch or offset >= int(resp.get("total", 0)):
            return rows


def fetch_retail(start):
    """Weekly regular-gasoline pump prices, {area: {date: $/gal}}, plus area names."""
    series, names = {}, {}
    for r in eia_rows("petroleum/pri/gnd", "weekly", {"product": ["EPMR"]}, start):
        if r.get("process") != "PTE" or r.get("value") in (None, ""):
            continue
        series.setdefault(r["duoarea"], {})[parse_day(r["period"])] = float(r["value"])
        names[r["duoarea"]] = r["area-name"]
    return series, names


def fetch_spot(start):
    """Daily spot prices for the gasoline hubs and crude benchmarks, {series_id: {date: price}}."""
    ids = [sid for sid, _ in SPOT.values()] + list(CRUDE_SPOT.values())
    out = {sid: {} for sid in ids}
    for r in eia_rows("petroleum/pri/spt", "daily", {"series": ids}, start):
        if r.get("value") not in (None, ""):
            out[r["series"]][parse_day(r["period"])] = float(r["value"])
    return out


def yahoo_closes(symbol, rng="3mo"):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(symbol)}?range={rng}&interval=1d"
    result = http_json(url, retries=2)["chart"]["result"][0]
    closes = {}
    # Daily bars are stamped at midnight New York time (04:00/05:00 UTC), so the UTC date is the
    # trading date. Adding the exchange's current gmtoffset would shift pre-DST-change bars a day.
    for ts, close in zip(result.get("timestamp", []), result["indicators"]["quote"][0]["close"]):
        if close is not None:
            closes[datetime.fromtimestamp(ts, tz=timezone.utc).date()] = float(close)
    return closes


def front_contract(root, roll_day, today):
    """Nearest actively traded contract. One contract is used throughout so roll gaps never
    leak into the price changes. An expired contract stops updating, so among the next few
    months we take the one with the freshest quote, preferring the nearest on ties."""
    first = 1 + (1 if today.day >= roll_day else 0)
    best = (None, {})
    for offset in range(first, first + 3):
        m = today.month - 1 + offset
        symbol = f"{root}{MONTH_CODES[m % 12]}{(today.year + m // 12) % 100:02d}.NYM"
        try:
            closes = yahoo_closes(symbol)
        except Exception:
            continue
        if closes and (today - max(closes)).days <= 6 and (not best[1] or max(closes) > max(best[1])):
            best = (symbol, closes)
    return best


# ---------------------------------------------------------------------------
# Series helpers
# ---------------------------------------------------------------------------

def fill_calendar(points, end=None):
    """Forward-fill a business-day {date: value} series onto every calendar day."""
    if not points:
        return {}
    first = min(points)
    end = end or max(points)
    out, d, last = {}, first, None
    while d <= end:
        last = points.get(d, last)
        out[d] = last
        d += ONE_DAY
    return out


def extend_with_futures(spot, fut):
    """Carry a spot series past EIA's last print using same-contract futures changes."""
    last_spot = max(spot)
    anchors = [d for d in fut if d <= last_spot]
    out = dict(spot)
    if not anchors:
        return out, last_spot
    f0 = fut[max(anchors)]
    for d in sorted(fut):
        if d > last_spot:
            out[d] = spot[last_spot] + (fut[d] - f0)
    return out, last_spot


def wls(xs, ys, ws):
    sw = sum(ws)
    mx = sum(w * x for x, w in zip(xs, ws)) / sw
    my = sum(w * y for y, w in zip(ys, ws)) / sw
    sxx = sum(w * (x - mx) ** 2 for x, w in zip(xs, ws))
    sxy = sum(w * (x - mx) * (y - my) for x, y, w in zip(xs, ys, ws))
    b = sxy / sxx if sxx > 0 else 1.0
    return my - b * mx, b


def lag_smoothed(wdaily, d, k=0.12, days=28):
    """Wholesale averaged with geometrically decaying weights, mimicking gradual pass-through."""
    num = den = 0.0
    weight = 1.0
    for j in range(days):
        v = wdaily.get(d - timedelta(days=j))
        if v is None:
            break
        num += weight * v
        den += weight
        weight *= 1 - k
    return num / den if den else None


def recency_weights(n, half_life=HALF_LIFE_WEEKS):
    return [0.5 ** ((n - 1 - i) / half_life) for i in range(n)]


def half_life(k):
    return math.log(0.5) / math.log(1 - k)


# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------

def step_week(r, path, a, b, ku, kd):
    """Advance the pump price through one week of daily wholesale values (mirrors engine.js)."""
    for w in path:
        gap = a + b * w - r
        r += (ku if gap > 0 else kd) * gap
    return r


def weekly_pairs(retail, wdaily):
    """Consecutive weekly surveys exactly 7 days apart, with wholesale coverage for every lag."""
    days = sorted(retail)
    pairs = []
    for t0, t1 in zip(days, days[1:]):
        if (t1 - t0).days == 7 and (t0 - timedelta(days=max(LAG_GRID) + 28)) in wdaily and t1 in wdaily:
            pairs.append((t0, retail[t0], t1, retail[t1]))
    return pairs


def lag_paths(pairs, wdaily, known_through=None):
    """Wholesale value driving each simulated day, per lag. With known_through set, later
    values are held flat at the last known price, as in a real-time forecast."""
    out = {}
    for lag in LAG_GRID:
        paths = []
        for t0, _, _, _ in pairs:
            cut = known_through(t0) if known_through else None
            path = []
            for j in range(1, 8):
                d = t0 + timedelta(days=j - lag)
                path.append(wdaily[min(d, cut)] if cut else wdaily[d])
            paths.append(path)
        out[lag] = paths
    return out


def sse(pairs, paths, ws, a, b, ku, kd):
    return sum(w * (step_week(r0, p, a, b, ku, kd) - r1) ** 2 for (_, r0, _, r1), p, w in zip(pairs, paths, ws))


def refine_a(pairs, paths, ws, a, b, ku, kd, iters=3, h=0.01):
    """Gauss-Newton on the margin a with the dynamics held fixed."""
    for _ in range(iters):
        num = den = 0.0
        for (_, r0, _, r1), p, w in zip(pairs, paths, ws):
            f0 = step_week(r0, p, a, b, ku, kd)
            g = (step_week(r0, p, a + h, b, ku, kd) - f0) / h
            num += w * g * (r1 - f0)
            den += w * g * g
        if den <= 0:
            break
        a += num / den
    return a


def long_run(pairs, wdaily, ws):
    xs = [lag_smoothed(wdaily, t1) for _, _, t1, _ in pairs]
    ys = [r1 for _, _, _, r1 in pairs]
    a, b = wls(xs, ys, ws)
    b = min(max(b, 0.85), 1.35)
    a = sum(w * (y - b * x) for x, y, w in zip(xs, ys, ws)) / sum(ws)
    return a, b


def calibrate(pairs, wdaily, k_grid=K_GRID, lag_grid=LAG_GRID, rounds=2, final=True):
    ws = recency_weights(len(pairs))
    paths = lag_paths(pairs, wdaily)
    a, b = long_run(pairs, wdaily, ws)
    best = None
    for _ in range(rounds):
        best = min(
            (sse(pairs, paths[lag], ws, a, b, ku, kd), ku, kd, lag)
            for lag in lag_grid for ku in k_grid for kd in k_grid
        )
        _, ku, kd, lag = best
        a = refine_a(pairs, paths[lag], ws, a, b, ku, kd)
    _, ku, kd, lag = best
    if not final:
        err = sse(pairs, paths[lag], ws, a, b, ku, kd)
        return {"a": a, "b": b, "ku": ku, "kd": kd, "L": lag, "sigma": math.sqrt(err / sum(ws))}

    a = refine_a(pairs, paths[lag], recency_weights(len(pairs), MARGIN_HALF_LIFE), a, b, ku, kd)
    resid = [r1 - step_week(r0, p, a, b, ku, kd) for (_, r0, _, r1), p in zip(pairs, paths[lag])]
    num = sum(e0 * e1 for e0, e1 in zip(resid, resid[1:]))
    den = sum(e0 * e0 for e0 in resid[:-1])
    rho = min(max(num / den, 0.0), 0.9) if den else 0.0
    innov = [e1 - rho * e0 for e0, e1 in zip(resid, resid[1:])]
    w = ws[1:]
    sigma = math.sqrt(sum(wi * e * e for wi, e in zip(w, innov)) / sum(w))
    return {"a": a, "b": b, "ku": ku, "kd": kd, "L": lag, "sigma": sigma, "rho": rho, "surprise": resid[-1]}


def backtest(pairs, wdaily):
    """Out-of-sample: dynamics fit only on data before the test year; the margin a is
    re-estimated each week from past surveys only; wholesale after the forecast Monday
    is held flat (a random-walk forecast), exactly like the live tool."""
    test_start = len(pairs) - BACKTEST_WEEKS
    train = pairs[max(0, test_start - CAL_WEEKS):test_start]
    if len(train) < 52:
        return None
    p = calibrate(train, wdaily)
    a, b, ku, kd, lag, rho = p["a"], p["b"], p["ku"], p["kd"], p["L"], p["rho"]
    flat = lag_paths(pairs, wdaily, known_through=lambda t0: t0)[lag]
    known = lag_paths(pairs, wdaily)[lag]
    err_model, err_naive, hits, moves = [], [], 0, 0
    for i in range(test_start, len(pairs)):
        lo = max(0, i - CAL_WEEKS)
        a = refine_a(pairs[lo:i], known[lo:i], recency_weights(i - lo, MARGIN_HALF_LIFE), a, b, ku, kd, iters=2)
        _, q0, _, q1 = pairs[i - 1]
        surprise = q1 - step_week(q0, known[i - 1], a, b, ku, kd)
        _, r0, _, r1 = pairs[i]
        f = step_week(r0, flat[i], a, b, ku, kd) + rho * surprise
        err_model.append(abs(f - r1))
        err_naive.append(abs(r0 - r1))
        if abs(r1 - r0) >= 0.02:
            moves += 1
            hits += (f - r0) * (r1 - r0) > 0
    n = len(err_model)
    return {
        "weeks": n,
        "maeModel": round(sum(err_model) / n, 4),
        "maeNaive": round(sum(err_naive) / n, 4),
        "directionHit": round(hits / moves, 3) if moves else None,
        "directionWeeks": moves,
    }


def weight_grid(n):
    """Hub weights on a simplex grid (non-negative, summing to one)."""
    steps = round(1 / WEIGHT_STEP)
    def rec(left, k):
        if k == 1:
            yield (left,)
            return
        for i in range(left + 1):
            for rest in rec(left - i, k - 1):
                yield (i,) + rest
    return [tuple(c / steps for c in combo) for combo in rec(steps, n)]


def blend(hubs, names, weights):
    days = set.intersection(*(set(hubs[n]) for n in names))
    return {d: sum(w * hubs[n][d] for n, w in zip(names, weights)) for d in days}


def select_weights(retail, hubs, names, upto=None):
    """Hub blend whose quick dynamic fit is tightest over the CAL_WEEKS before index `upto`."""
    best = None
    for weights in weight_grid(len(names)):
        wdaily = blend(hubs, names, weights)
        pairs = weekly_pairs(retail, wdaily)
        pairs = pairs[:upto if upto is not None else len(pairs)][-CAL_WEEKS:]
        if len(pairs) < 60:
            continue
        p = calibrate(pairs, wdaily, k_grid=(0.03, 0.065, 0.12, 0.21, 0.37), lag_grid=(1,), rounds=1, final=False)
        if best is None or p["sigma"] < best[0]:
            best = (p["sigma"], weights)
    return best[1] if best else None


def fit_area(retail, hubs, names):
    weights = select_weights(retail, hubs, names)
    if weights is None:
        return None
    wdaily = blend(hubs, names, weights)
    pairs = weekly_pairs(retail, wdaily)
    params = calibrate(pairs[-CAL_WEEKS:], wdaily)
    params["weights"] = {n: w for n, w in zip(names, weights) if w > 0}
    # The backtest picks its own hub weights from pre-test data, so nothing peeks ahead.
    bt_weights = select_weights(retail, hubs, names, upto=len(pairs) - BACKTEST_WEEKS)
    params["backtest"] = None
    if bt_weights is not None:
        bt_daily = blend(hubs, names, bt_weights)
        params["backtest"] = backtest(weekly_pairs(retail, bt_daily), bt_daily)
    return params


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def round_list(values, nd=4):
    return [None if v is None else round(v, nd) for v in values]


def futures_snapshot(symbol, closes):
    days = sorted(closes)
    last, prev = days[-1], days[max(0, len(days) - 6)]
    return {
        "contract": symbol.split(".")[0],
        "date": last.isoformat(),
        "price": round(closes[last], 4),
        "change5d": round(closes[last] - closes[prev], 4),
        "spark": round_list([closes[d] for d in days[-45:]]),
    }


def main():
    today = datetime.now(timezone.utc).date()
    start = (today - timedelta(days=365 * HISTORY_YEARS)).isoformat()
    t_start = time.time()

    log("EIA: weekly pump prices ...")
    retail, area_names = fetch_retail(start)
    log(f"  {len(retail)} regions, latest survey {max(max(s) for s in retail.values())}")
    log("EIA: daily spot prices ...")
    spot = fetch_spot(start)
    for key, (sid, _) in SPOT.items():
        log(f"  {key}: {len(spot[sid])} days through {max(spot[sid])}")

    futures = {}
    for name, (root, roll_day) in FUTURES.items():
        symbol, closes = front_contract(root, roll_day, today)
        if symbol:
            futures[name] = (symbol, closes)
            log(f"Yahoo: {name} {symbol} {max(closes)} {closes[max(closes)]:.4f}")
        else:
            log(f"Yahoo: {name} unavailable, wholesale stops at EIA's last spot print")

    rbob = futures.get("RBOB", (None, {}))[1]
    hubs, hub_meta, spot_through = {}, {}, {}
    for key, (sid, name) in SPOT.items():
        extended, spot_through[key] = extend_with_futures(spot[sid], rbob)
        hubs[key] = fill_calendar(extended)
    # All hubs ship on one calendar so the browser can blend them index by index.
    through = min(max(daily) for daily in hubs.values())
    first = through - timedelta(days=BENCH_DAYS - 1)
    biz = sorted(set.intersection(*(set(spot[sid]) for sid, _ in SPOT.values())))[-(SHOCK_DAYS + 1):]
    for key, (sid, name) in SPOT.items():
        hub_meta[key] = {
            "name": name,
            "spotThrough": spot_through[key].isoformat(),
            "values": round_list([hubs[key][first + timedelta(days=i)] for i in range(BENCH_DAYS)]),
            "shocks": round_list([spot[sid][d1] - spot[sid][d0] for d0, d1 in zip(biz, biz[1:])]),
        }

    areas = {}
    for area_id in sorted(retail):
        names = AREA_HUBS.get(area_id, DEFAULT_HUBS)
        t0 = time.time()
        params = fit_area(retail[area_id], hubs, names)
        if not params:
            log(f"  {area_id}: not enough history, skipped")
            continue
        days = sorted(retail[area_id])[-CHART_WEEKS:]
        bt = params["backtest"] or {}
        areas[area_id] = {
            "name": area_names.get(area_id, area_id),
            "weights": params["weights"],
            "a": round(params["a"], 4),
            "b": round(params["b"], 4),
            "kUp": params["ku"],
            "kDown": params["kd"],
            "lag": params["L"],
            "sigma": round(params["sigma"], 4),
            "rho": round(params["rho"], 3),
            "surprise": round(params["surprise"], 4),
            "halfLifeUp": round(half_life(params["ku"]), 1),
            "halfLifeDown": round(half_life(params["kd"]), 1),
            "backtest": params["backtest"],
            "retail": [[d.isoformat(), retail[area_id][d]] for d in days],
        }
        mix = " ".join(f"{n}{w:.2f}" for n, w in params["weights"].items())
        log(f"  {area_id:6s} {mix:22s} a={params['a']:.3f} b={params['b']:.3f} "
            f"up={half_life(params['ku']):.1f}d down={half_life(params['kd']):.1f}d L={params['L']} "
            f"rho={params['rho']:.2f} surprise={params['surprise'] * 100:+.1f}c "
            f"sigma={params['sigma'] * 100:.1f}c  backtest model={bt.get('maeModel', 0) * 100:.1f}c "
            f"naive={bt.get('maeNaive', 0) * 100:.1f}c dir={bt.get('directionHit')}  [{time.time() - t0:.1f}s]")

    crude = {}
    for name, sid in CRUDE_SPOT.items():
        days = sorted(spot[sid])
        crude[name] = {"spotDate": days[-1].isoformat(), "spot": spot[sid][days[-1]]}

    out = {
        "generated": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "latestSurvey": max(max(s) for s in retail.values()).isoformat(),
        "futures": {name: futures_snapshot(sym, closes) for name, (sym, closes) in futures.items()},
        "crudeSpot": crude,
        "hubStart": first.isoformat(),
        "hubThrough": through.isoformat(),
        "hubs": hub_meta,
        "areas": areas,
    }
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    tmp = OUT_PATH + ".tmp"
    with open(tmp, "w") as f:
        json.dump(out, f, separators=(",", ":"))
    os.replace(tmp, OUT_PATH)
    log(f"Wrote {OUT_PATH} ({os.path.getsize(OUT_PATH) / 1024:.0f} KB) in {time.time() - t_start:.0f}s")


if __name__ == "__main__":
    try:
        main()
    except urllib.error.HTTPError as err:
        if err.code in (403, 429) and "api.eia.gov" in err.url:
            sys.exit(f"EIA API refused the request (HTTP {err.code}). The shared DEMO_KEY is rate-limited; "
                     "get a free key at https://www.eia.gov/opendata/register.php and set EIA_API_KEY. "
                     "The existing data file was left unchanged.")
        raise
