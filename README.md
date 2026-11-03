# Get Some Gas

**这周哪天加油最便宜？** 输入邮编，网站告诉你本周哪天（周几、几号）加油最便宜，能省多少钱，并显示油价走势。预测基于国际油价和批发汽油价格：加油站价格会跟着它们变动，只是晚几天到几周。

Enter a ZIP code and the site tells you which day this week gas will be cheapest near you,
how much that saves on a fill-up, and the recent price trend.

## How it works

For each of EIA's 29 pump-price survey regions (U.S., PADDs, 9 states, 10 cities):

```
target(d) = a + b × wholesale(d − lag)
pump(d)   = pump(d−1) + k × [target(d) − pump(d−1)]     k = k_up if target > pump, else k_down
forecast  = pump + ρ × last week's miss
```

- **wholesale** blends EIA daily spot prices at the Gulf Coast, New York Harbor and Los
  Angeles hubs, weighted by fit for each region. The days since EIA's last spot print are
  filled in from the live NYMEX RBOB gasoline future, always using one contract so roll
  gaps can't leak in.
- **k_up > k_down**: increases reach the pump faster than decreases.
- The margin **a** leans on recent months, and **ρ** carries part of last week's miss into
  this week. Both cut out-of-sample error.
- Future wholesale prices are simulated as a random walk built from recent daily moves.
  The best day is the one with the lowest expected price. A small day-of-week pattern is
  added on top: Monday is typically cheapest, Thursday–Friday priciest (GasBuddy).

**Accuracy:** in an out-of-sample backtest over the latest 52 weeks, the model beat
"assume no change" in all 29 regions. For the U.S. average it missed by 5.6¢ on average
(vs 7.8¢) and called the direction of the weekly move 89% of the time.

## Live data

`.github/workflows/refresh-data.yml` keeps prices current with no API key to set up:

- **Full refresh:** EIA history plus recalibration, on every push to `main` and each
  weekday at 22:30 UTC (after EIA's Monday survey release and the NYMEX settle).
- **Quick refresh:** the latest NYMEX gasoline quote, every 30 minutes from 12:00 to 22:00
  UTC on weekdays.

Each run force-pushes `market.json` to the `data` branch, which the page loads from
`raw.githubusercontent.com`, so new prices appear without a redeploy. The copy in
`public/data/` is the fallback. The page re-checks every 10 minutes while open.

EIA data comes from the EIA API using the `EIA_API_KEY` repository secret if you add one,
otherwise EIA's public `DEMO_KEY`. When the API refuses or rate-limits the request, the
same series come from EIA's keyless bulk spreadsheets.

GitHub pauses scheduled workflows in repositories with no activity for 60 days; re-enable
it from the Actions tab if that happens.

## Deploy

Serve `public/` as a static site. It needs no build step, server or API key, and works on
Vercel, Netlify, Cloudflare Pages, Azure Static Web Apps or similar.

If you fork or rename the repository, update `DATA_SOURCES` at the top of `public/js/app.js`
to point at your own `data` branch.

## Run locally

```bash
pip install xlrd                       # only needed if the EIA API refuses the demo key
python3 scripts/fetch_data.py          # full refresh (~10 s)
python3 scripts/fetch_data.py --futures   # quick refresh (~2 s)
python3 scripts/serve.py               # http://127.0.0.1:8765/
```

## Files

```
public/index.html, assets/        page, styles, Smartisan Compact subset, icon
public/js/engine.js               forecast engine (same recursion as the Python calibration)
public/js/regions.js              ZIP → most specific EIA survey (city, state, PADD, U.S.)
public/js/chart.js                price trend chart
public/js/app.js                  page logic and data loading
public/js/i18n.js                 English and Chinese text
scripts/fetch_data.py             fetch, calibrate, backtest, write market.json
scripts/subset_fonts.py           rebuild the font subsets after changing Chinese text
scripts/serve.py                  local static server
```

Rebuild the fonts after editing Chinese text:

```bash
pip install fonttools brotli
python3 scripts/subset_fonts.py ../panshaker-official-websites-legacy-main/assets/fonts
```

## Limits

- Forecasts are regional averages; individual stations can differ by 20¢ or more.
- Great Lakes markets (OH, MI, IN, IL, WI, KY) have sudden price-cycle jumps the model
  can't time, and Colorado, Denver and Chicago track the coastal hubs least closely.
- NYMEX quotes come from Yahoo Finance's unofficial chart endpoint. If it's unavailable,
  wholesale prices fall back to EIA spot prices, which can be up to a week old.
