# Get Some Gas

**这周哪天加油最便宜？** 加油站的价格会跟着国际油价和批发汽油价格变动，但要晚几天到几周。本站每天抓取 EIA 和 NYMEX 的数据，为每个地区校准一个“涨快跌慢”模型，预测未来 7 天的加油站平均价格，并告诉你本周哪天加油最便宜。输入邮编可以得到本地预测；页面支持中英文切换，设计沿用 Panshaker 官网的配色和字体。

Gas prices follow oil and wholesale gasoline, a few days to a few weeks late. This site
uses that delay to forecast the average pump price in your area for the next 7 days and
tells you which day this week is likely to be cheapest.

## How the forecast works

For each of EIA's 29 survey regions (U.S., PADDs, 9 states, 10 cities):

```
target(d) = a + b × wholesale(d − lag)
pump(d)   = pump(d−1) + k × [target(d) − pump(d−1)]     k = k_up if target > pump, else k_down
forecast  = pump + ρ × last week's miss
```

- **wholesale** is a blend of EIA daily spot prices at the Gulf Coast, New York Harbor and
  Los Angeles hubs. The blend weights are picked per region by fit, and the last few days
  are filled in from NYMEX futures, always using one contract so roll gaps can't leak in.
- **k_up > k_down** is the "rockets and feathers" asymmetry: increases reach the pump faster
  than decreases.
- The margin **a** leans on the last few months, because margins drift with the market.
- **ρ** carries part of last week's miss into this week, because misses tend to persist.
- Future wholesale prices are simulated as a random walk built from recent daily moves
  (3,000 paths). That gives the 80% ranges and each day's chance of being the cheapest.
  A small day-of-week pattern is added on top (GasBuddy: Monday cheapest, Thursday–Friday
  priciest).

**Why 7 days:** wholesale moves that have already happened take one to two weeks to reach
the pump, so the next few days are predictable. Beyond that, the forecast mostly depends
on where oil goes next.

**Track record:** an out-of-sample backtest over the latest 52 weeks, with dynamics and hub
weights fit only on earlier data. On data through Oct 26, 2026, the model beat "assume no
change" in all 29 regions. For the U.S. average it missed by 5.6¢ on average (vs 7.8¢)
and called the direction 89% of the time. Each region's numbers are shown on the page.

## Project layout

```
public/                 static site, no build step
  index.html
  assets/css/style.css  Panshaker look: brand blue #0E427E, green #62BA46, Smartisan Compact
  assets/fonts/         Smartisan Compact subset to the glyphs the site uses (~80 KB per weight)
  js/engine.js          forecast engine (same recursion as the Python calibration)
  js/regions.js         ZIP → state → most specific EIA survey (city, state, PADD, U.S.)
  js/i18n.js            English and Simplified Chinese copy
  js/chart.js           SVG chart and table view
  js/app.js             page logic
  data/market.json      market data and fitted parameters (generated)
scripts/
  fetch_data.py         fetch EIA and Yahoo Finance data, calibrate, backtest, write market.json
  serve.py              local static server
  subset_fonts.py       rebuild the font subsets after changing Chinese copy
.github/workflows/refresh-data.yml   weekday refresh of market.json
```

## Run it locally

Needs Python 3.9+ and nothing else.

```bash
python3 scripts/fetch_data.py        # refresh public/data/market.json (~10 s)
python3 scripts/serve.py             # http://127.0.0.1:8765/
```

`fetch_data.py` uses EIA's shared `DEMO_KEY` by default, which is rate-limited and fails
with HTTP 429 after a handful of calls. Get a free key at
https://www.eia.gov/opendata/register.php and run with `EIA_API_KEY=your_key`. If a fetch
fails, the existing `market.json` is left as it is.

## Deploy

`public/` is a plain static site: Azure Static Web Apps (like the Panshaker site), GitHub
Pages, Netlify and similar hosts all work, with `public` as the app folder and no build
command.

To keep the data fresh, the GitHub Actions workflow re-runs `fetch_data.py` every weekday
at 23:00 UTC and commits `market.json` when it changes. That commit triggers your host's
redeploy. Setup:

1. Add an `EIA_API_KEY` repository secret.
2. Under Settings → Actions → General, set workflow permissions to "Read and write".

## Fonts

The Smartisan Compact TTFs are ~8 MB each because they include every CJK glyph. The site
ships subsets. After changing Chinese text, rebuild them:

```bash
pip install fonttools brotli
python3 scripts/subset_fonts.py ../panshaker-official-websites-legacy-main/assets/fonts
```

## Limits

- Forecasts are regional averages, not the price at a particular station.
- Great Lakes markets (OH, MI, IN, IL, WI, KY) have Edgeworth price cycles: overnight jumps
  of 10–40¢ the model can't time. The page flags this for those states.
- Colorado, Denver and Chicago follow the coastal hubs least closely and have the weakest
  backtest numbers. The page shows each region's own track record.
- Data sources: EIA (public domain) and Yahoo Finance's unofficial chart endpoint for
  futures. If Yahoo blocks requests, the forecast falls back to EIA spot prices, which
  are up to a week old.
