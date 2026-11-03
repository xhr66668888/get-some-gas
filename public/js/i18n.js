// UI copy in English and Simplified Chinese. Static text uses data-i18n="key";
// dynamic text goes through t(key, vars). scripts/subset_fonts.py reads this file to
// decide which Chinese glyphs the web fonts need.

const en = {
  "meta.title": "Get Some Gas — when to fill up this week",
  "nav.forecast": "Forecast",
  "nav.why": "Why",
  "nav.market": "Market",
  "nav.method": "How it works",
  "nav.lang": "中文",

  "hero.kicker": "Gas price timing · next 7 days",
  "hero.line": "Gas prices follow oil, just a few days late.",
  "hero.title": "When should you fill up this week?",
  "hero.sub": "We track crude oil and wholesale gasoline every day and forecast your local pump price for the next 7 days.",
  "hero.zipLabel": "Your ZIP code",
  "hero.zipPlaceholder": "ZIP code, e.g. 92122",
  "hero.cta": "Check my week",
  "hero.badge1": "Updated every weekday",
  "hero.badge2": "EIA + NYMEX data",
  "hero.badge3": "Backtested model",
  "hero.badge4": "Free · no sign-up",

  "zip.invalid": "Enter a 5-digit U.S. ZIP code.",
  "zip.unsupported": "ZIP {zip} is outside EIA's survey area, so this is the U.S. average.",
  "zip.national": "Showing the U.S. average. Enter your ZIP code for a local forecast.",
  "zip.resolved": "ZIP {zip} · {state} · using EIA's {area} average",

  "status.loading": "Loading market data…",
  "status.error": "Couldn't load market data. Please try again later.",
  "status.stale": "Market data is {days} days old, so this forecast may be off.",

  "forecast.title": "This week's forecast: {area}",
  "verdict.label": "Best day to fill up",
  "verdict.wait": "Wait until {day}",
  "verdict.wait.reason": "Pump prices are still catching up with cheaper wholesale gasoline. Expect about {cents}¢/gal less by {day}.",
  "verdict.wait.more": "Prices will likely keep easing after that.",
  "verdict.now": "Fill up today",
  "verdict.now.reason": "Wholesale gasoline has risen and pump prices usually follow within days. Expect about {cents}¢/gal more by {day}.",
  "verdict.steadyNow": "No rush this week",
  "verdict.steadyNow.reason": "Prices look steady. Today is as good as any day this week.",
  "verdict.steady": "Slightly cheaper on {day}",
  "verdict.steady.reason": "Prices look steady. {day} comes out about {cents}¢/gal cheaper, mostly from the usual weekly rhythm.",
  "verdict.today": "Today (estimated)",
  "verdict.expected": "{day} (expected)",
  "verdict.save": "Save about {amount} on {gal} gallons",
  "verdict.cost": "Waiting costs about {amount} more on {gal} gallons",
  "verdict.small": "Under {amount} difference on {gal} gallons",
  "verdict.pBetter": "{pct}% chance {day} beats today",
  "verdict.pHigher": "{pct}% chance prices are higher by {day}",
  "tank.label": "Gallons",

  "week.title": "Your next 7 days",
  "week.sub": "Expected average pump price, its 80% range, and the chance each day is the week's cheapest.",
  "week.today": "Today",
  "week.tomorrow": "Tomorrow",
  "week.best": "Best",
  "week.cheapest": "cheapest",
  "week.range": "{lo} – {hi}",
  "week.vsToday": "vs today",

  "chart.title": "Pump price vs. where wholesale is pulling it",
  "chart.sub": "Pump prices drift toward the level implied by wholesale gasoline. The gap between the two lines is the move still on its way.",
  "chart.pump": "Pump price (EIA survey)",
  "chart.forecast": "Estimate & forecast, 80% range",
  "chart.target": "Wholesale-implied price",
  "chart.today": "Today",
  "chart.survey": "EIA survey",
  "chart.estimate": "Estimate",
  "chart.range": "80% range",
  "chart.table": "Show the numbers",
  "chart.col.date": "Date",
  "chart.col.pump": "Pump price",
  "chart.col.low": "80% low",
  "chart.col.high": "80% high",
  "chart.col.target": "Wholesale-implied",
  "chart.aria": "Line chart of {area} average pump prices: recent EIA surveys, today's estimate and a 7-day forecast, next to the price implied by wholesale gasoline.",

  "why.title": "Why this forecast",
  "why.sub": "What's behind this week's call, and how far to trust it.",
  "why.pipeline.title": "What's still in the pipeline",
  "why.pipeline.down": "Over the past four weeks, wholesale moves added up to {w} at the pump level, and pump prices moved {p}. Pumps are still about {gap}¢/gal above the level wholesale implies, so more decline is on its way.",
  "why.pipeline.up": "Over the past four weeks, wholesale moves added up to {w} at the pump level, and pump prices moved {p}. Pumps are still about {gap}¢/gal below the level wholesale implies, so increases are on their way.",
  "why.pipeline.flat": "Over the past four weeks, wholesale moves added up to {w} at the pump level, and pump prices moved {p}. Pumps are within {gap}¢ of the level wholesale implies, so little is left in the pipeline.",
  "why.speed.title": "Rockets and feathers",
  "why.speed.body": "{area} pump prices close half the gap to wholesale in about {up} days when rising but {down} days when falling. Increases arrive fast; decreases drift down slowly.",
  "why.speed.even": "{area} pump prices close half the gap to wholesale in about {up} days, rising or falling.",
  "why.dow.title": "The weekly rhythm",
  "why.dow.body": "Stations tend to be cheapest Sunday–Tuesday and priciest Thursday–Friday, about 2¢/gal apart on average. That small pattern is added on top.",
  "why.cycle.title": "Price cycles in {state}",
  "why.cycle.body": "Great Lakes stations often move in sharp cycles: prices can jump 10–40¢ overnight, then slide for a week or two. If your station just jumped, wait it out; if prices have been sliding for a while, a jump may be near.",
  "why.remote": "Prices in {state} run well above this regional average, but the timing signal still applies.",
  "why.track.title": "Track record",
  "why.track.body": "Tested on the past {weeks} weeks it never saw, the model called the direction of the weekly price move here {hit}% of the time. Average miss: {model}¢, versus {naive}¢ for assuming no change.",

  "market.title": "Markets today",
  "market.sub": "Front-month futures for crude oil and wholesale gasoline, with the change over the last 5 trading days.",
  "market.brent": "Brent crude",
  "market.wti": "WTI crude",
  "market.rbob": "Wholesale gasoline (RBOB)",
  "market.pump": "Pump price · {area}",
  "market.perBarrel": "/bbl",
  "market.perGallon": "/gal",
  "market.days5": "5 days",
  "market.week": "vs prior week",
  "market.contract": "{contract} contract",
  "market.survey": "EIA survey of {date}",

  "method.title": "How it works",
  "method.sub": "Oil becomes gasoline, gasoline moves through terminals, and stations reprice. Every step adds delay, and that delay is what makes the next few days forecastable.",
  "method.s1.title": "Crude oil",
  "method.s1.body": "Brent and WTI set the cost of the raw material, roughly half of what you pay at the pump.",
  "method.s1.lag": "Real time",
  "method.s2.title": "Wholesale gasoline",
  "method.s2.body": "Refiners sell gasoline at spot hubs: New York Harbor, the Gulf Coast and Los Angeles.",
  "method.s2.lag": "Same day",
  "method.s3.title": "Terminal rack",
  "method.s3.body": "Distributors load trucks at local terminals; rack prices follow the spot market within a day or two.",
  "method.s3.lag": "1–2 days",
  "method.s4.title": "Your gas station",
  "method.s4.body": "Stations reprice as new loads arrive and rivals move: fast when costs rise, slowly when they fall.",
  "method.s4.lag": "1–4 weeks",
  "method.model.title": "The model",
  "method.model.p1": "For each of EIA's 29 survey regions we fit a \"rockets and feathers\" model: every day, the average pump price closes a fixed share of its gap to the price implied by wholesale gasoline, a bigger share when the gap points up than when it points down.",
  "method.model.p2": "Each region's wholesale benchmark is a blend of the Gulf Coast, New York Harbor and Los Angeles spot markets, weighted by how well it explains local pump prices. Misses tend to persist, so part of last week's miss carries into this week. Everything is re-fit every weekday on five years of EIA data.",
  "method.model.p2b": "To forecast, we start from today's wholesale price and simulate 3,000 possible market paths from recent price swings, so the ranges cover both market risk and model error.",
  "method.model.p3": "Why 7 days? Wholesale moves that already happened take one to two weeks to reach the pump, so the next few days are predictable. Further out, the answer depends on where oil goes next, which nobody can forecast reliably.",
  "method.params.title": "Parameters for {area}",
  "method.params.bench": "Wholesale benchmark (spot)",
  "method.params.margin": "Margin a (taxes, freight, station)",
  "method.params.pass": "Pass-through b",
  "method.params.lag": "Delivery lag",
  "method.params.up": "Half-life when rising",
  "method.params.down": "Half-life when falling",
  "method.params.rho": "Carry-over of last week's miss",
  "method.params.sigma": "Typical 1-week model error",
  "method.params.days": "{n} days",
  "method.params.day": "{n} day",
  "method.sources.title": "Data sources",
  "method.sources.s1": "U.S. EIA weekly retail gasoline prices, 29 regions, surveyed every Monday",
  "method.sources.s2": "U.S. EIA daily spot prices for gasoline (NY Harbor, Gulf Coast, Los Angeles) and crude (WTI, Brent)",
  "method.sources.s3": "NYMEX futures (RBOB gasoline, WTI, Brent) to bridge the days since EIA's last spot update",
  "method.sources.s4": "Weekly rhythm: GasBuddy studies of station prices, 2017–2019",
  "method.disclaimer": "Forecasts are regional averages, not the price at a particular station; nearby stations can differ by 20¢ or more. For planning only.",

  "hub.GC": "Gulf Coast",
  "hub.NYH": "NY Harbor",
  "hub.LA": "Los Angeles",

  "footer.about": "Get Some Gas forecasts when gas will be cheapest in your area this week, from public energy-market data.",
  "footer.data": "Data",
  "footer.fine": "Fine print",
  "footer.updated": "Updated {time}",
  "footer.survey": "Latest EIA survey: {date}",
  "footer.wholesale": "Wholesale prices through {date}",
  "footer.note": "Not affiliated with EIA, NYMEX or GasBuddy.",
  "footer.copy": "© {year} Get Some Gas",
};

const zh = {
  "meta.title": "Get Some Gas — 这周哪天加油最便宜",
  "nav.forecast": "预测",
  "nav.why": "原因",
  "nav.market": "市场",
  "nav.method": "原理",
  "nav.lang": "EN",

  "hero.kicker": "加油时机 · 未来 7 天",
  "hero.line": "加油站的价格跟着油价走，只是慢几天。",
  "hero.title": "这周哪天加油最便宜？",
  "hero.sub": "我们每天追踪国际原油和批发汽油价格，预测你所在地区未来 7 天的加油站价格。",
  "hero.zipLabel": "你的邮编",
  "hero.zipPlaceholder": "邮编，例如 92122",
  "hero.cta": "查看本周",
  "hero.badge1": "工作日每日更新",
  "hero.badge2": "EIA + NYMEX 数据",
  "hero.badge3": "经回测验证",
  "hero.badge4": "免费 · 无需注册",

  "zip.invalid": "请输入 5 位美国邮编。",
  "zip.unsupported": "邮编 {zip} 不在 EIA 调查范围内，显示的是全美平均。",
  "zip.national": "当前显示全美平均。输入邮编即可获取本地预测。",
  "zip.resolved": "邮编 {zip} · {state} · 采用 EIA {area}平均价",

  "status.loading": "正在加载市场数据…",
  "status.error": "无法加载市场数据，请稍后再试。",
  "status.stale": "市场数据已有 {days} 天未更新，预测可能不准。",

  "forecast.title": "{area}本周油价",
  "verdict.label": "本周最佳加油日",
  "verdict.wait": "等到{day}再加",
  "verdict.wait.reason": "批发汽油已经降价，加油站还在慢慢跟跌。预计到{day}每加仑便宜约 {cents} 美分。",
  "verdict.wait.more": "之后很可能还会继续下降。",
  "verdict.now": "今天就加",
  "verdict.now.reason": "批发汽油已经涨价，加油站通常几天内就会跟涨。预计到{day}每加仑贵约 {cents} 美分。",
  "verdict.steadyNow": "这周不用急",
  "verdict.steadyNow.reason": "油价基本稳定，今天加和本周其他日子差不多。",
  "verdict.steady": "{day}略便宜",
  "verdict.steady.reason": "油价基本稳定。{day}每加仑便宜约 {cents} 美分，主要来自每周的固定规律。",
  "verdict.today": "今天（估算）",
  "verdict.expected": "{day}（预计）",
  "verdict.save": "加 {gal} 加仑约省 {amount}",
  "verdict.cost": "晚加的话，{gal} 加仑约多花 {amount}",
  "verdict.small": "加 {gal} 加仑相差不到 {amount}",
  "verdict.pBetter": "{day}比今天便宜的概率 {pct}%",
  "verdict.pHigher": "到{day}油价更高的概率 {pct}%",
  "tank.label": "加仑数",

  "week.title": "未来 7 天",
  "week.sub": "加油站平均价格预测、80% 区间，以及每天成为本周最低价的概率。",
  "week.today": "今天",
  "week.tomorrow": "明天",
  "week.best": "最便宜",
  "week.cheapest": "最低",
  "week.range": "{lo} – {hi}",
  "week.vsToday": "比今天",

  "chart.title": "加油站价格与批发价对应的目标价",
  "chart.sub": "加油站价格会逐渐靠拢批发汽油对应的价格水平，两条线之间的差距，就是还在传导途中的涨跌。",
  "chart.pump": "加油站价格（EIA 调查）",
  "chart.forecast": "估算与预测，80% 区间",
  "chart.target": "批发价对应的目标价",
  "chart.today": "今天",
  "chart.survey": "EIA 调查",
  "chart.estimate": "估算",
  "chart.range": "80% 区间",
  "chart.table": "查看数据",
  "chart.col.date": "日期",
  "chart.col.pump": "加油站价格",
  "chart.col.low": "80% 下限",
  "chart.col.high": "80% 上限",
  "chart.col.target": "批发价对应",
  "chart.aria": "{area}加油站平均价格折线图：近期 EIA 调查、今日估算与未来 7 天预测，以及批发汽油对应的目标价。",

  "why.title": "为什么这样预测",
  "why.sub": "本周判断背后的原因，以及它有多可靠。",
  "why.pipeline.title": "还在传导中的价格",
  "why.pipeline.down": "过去四周，批发价的变动折合到加油站约为 {w}，加油站价格实际变动了 {p}。目前加油站价格仍比批发价对应的水平高约 {gap} 美分/加仑，后面还会继续跌。",
  "why.pipeline.up": "过去四周，批发价的变动折合到加油站约为 {w}，加油站价格实际变动了 {p}。目前加油站价格仍比批发价对应的水平低约 {gap} 美分/加仑，后面还会继续涨。",
  "why.pipeline.flat": "过去四周，批发价的变动折合到加油站约为 {w}，加油站价格实际变动了 {p}。两者差距在 {gap} 美分以内，传导中的涨跌已经不多。",
  "why.speed.title": "涨得快，跌得慢",
  "why.speed.body": "在{area}，油价上涨时约 {up} 天就能补上一半差距，下跌时却要约 {down} 天。涨价来得快，降价来得慢。",
  "why.speed.even": "在{area}，无论涨跌，油价约 {up} 天能补上一半差距。",
  "why.dow.title": "每周规律",
  "why.dow.body": "加油站通常周日到周二较便宜，周四、周五较贵，平均相差约 2 美分/加仑。这个小规律已叠加在预测上。",
  "why.cycle.title": "{state}的价格周期",
  "why.cycle.body": "五大湖地区的加油站常有“价格周期”：可能一夜之间上涨 10–40 美分，然后一两周内慢慢回落。如果附近刚涨过，可以等等；如果已经跌了很久，可能快要再涨了。",
  "why.remote": "{state}的油价明显高于这个地区平均，但涨跌时机依然适用。",
  "why.track.title": "历史表现",
  "why.track.body": "在模型没见过的最近 {weeks} 周里，它对{area}每周油价涨跌方向的判断准确率为 {hit}%；平均误差 {model} 美分，“假设不变”则为 {naive} 美分。",

  "market.title": "今日市场",
  "market.sub": "原油和批发汽油的近月期货价格，以及近 5 个交易日的变化。",
  "market.brent": "布伦特原油",
  "market.wti": "WTI 原油",
  "market.rbob": "批发汽油 (RBOB)",
  "market.pump": "加油站价格 · {area}",
  "market.perBarrel": "/桶",
  "market.perGallon": "/加仑",
  "market.days5": "5 日",
  "market.week": "比上周",
  "market.contract": "{contract} 合约",
  "market.survey": "EIA {date} 调查",

  "method.title": "原理",
  "method.sub": "原油炼成汽油，汽油经过油库分销，加油站再调价。每一步都有延迟，正是这些延迟让未来几天的油价可以预测。",
  "method.s1.title": "原油",
  "method.s1.body": "布伦特和 WTI 决定原料成本，约占你在加油站所付价格的一半。",
  "method.s1.lag": "实时",
  "method.s2.title": "批发汽油",
  "method.s2.body": "炼厂在现货枢纽出售汽油：纽约港、墨西哥湾沿岸和洛杉矶。",
  "method.s2.lag": "当天",
  "method.s3.title": "油库批发架",
  "method.s3.body": "分销商在本地油库装车，批发架价格一两天内跟随现货市场。",
  "method.s3.lag": "1–2 天",
  "method.s4.title": "你家附近的加油站",
  "method.s4.body": "加油站在新货到站、对手调价时跟着调：成本涨时调得快，跌时调得慢。",
  "method.s4.lag": "1–4 周",
  "method.model.title": "模型",
  "method.model.p1": "我们为 EIA 的 29 个调查地区分别拟合“涨快跌慢”模型：每天，平均油价会补上与批发价对应目标价之间差距的一定比例，向上时比例更大，向下时更小。",
  "method.model.p2": "每个地区的批发基准由墨西哥湾沿岸、纽约港和洛杉矶三个现货市场按权重混合而成，权重取决于哪种组合最能解释当地油价。模型误差往往会延续，所以上周的偏差会部分带入本周。所有参数在每个工作日基于 EIA 五年数据重新拟合。",
  "method.model.p2b": "预测时，以今天的批发价为起点，按近期的价格波动模拟 3,000 种市场走势，因此区间同时涵盖市场风险和模型误差。",
  "method.model.p3": "为什么是 7 天？批发市场已经发生的涨跌，需要一到两周才能传到加油站，所以未来几天是可以预测的。再往后就取决于油价下一步怎么走，而这没有人能可靠预测。",
  "method.params.title": "{area}的模型参数",
  "method.params.bench": "批发基准（现货）",
  "method.params.margin": "价差 a（税费、运输、加油站）",
  "method.params.pass": "传导系数 b",
  "method.params.lag": "交付延迟",
  "method.params.up": "上涨半衰期",
  "method.params.down": "下跌半衰期",
  "method.params.rho": "上周偏差带入比例",
  "method.params.sigma": "模型 1 周典型误差",
  "method.params.days": "{n} 天",
  "method.params.day": "{n} 天",
  "method.sources.title": "数据来源",
  "method.sources.s1": "美国能源信息署 (EIA) 每周零售汽油价格，29 个地区，每周一调查",
  "method.sources.s2": "EIA 每日现货价格：汽油（纽约港、墨西哥湾沿岸、洛杉矶）和原油（WTI、布伦特）",
  "method.sources.s3": "NYMEX 期货（RBOB 汽油、WTI、布伦特），补足 EIA 最近一次现货更新之后的价格",
  "method.sources.s4": "每周规律：GasBuddy 对加油站价格的研究，2017–2019",
  "method.disclaimer": "预测为地区平均价格，不代表某个具体加油站；附近不同加油站可能相差 20 美分以上。仅供参考。",

  "hub.GC": "墨西哥湾沿岸",
  "hub.NYH": "纽约港",
  "hub.LA": "洛杉矶",

  "footer.about": "Get Some Gas 利用公开的能源市场数据，预测你所在地区本周什么时候加油最便宜。",
  "footer.data": "数据",
  "footer.fine": "说明",
  "footer.updated": "更新于 {time}",
  "footer.survey": "最新 EIA 调查：{date}",
  "footer.wholesale": "批发价截至 {date}",
  "footer.note": "本站与 EIA、NYMEX、GasBuddy 无关联。",
  "footer.copy": "© {year} Get Some Gas",
};

const AREAS = {
  NUS: ["U.S.", "全美"],
  R10: ["East Coast", "东海岸"],
  R1X: ["New England", "新英格兰地区"],
  R1Y: ["Central Atlantic", "中大西洋地区"],
  R1Z: ["Lower Atlantic", "南大西洋沿岸"],
  R20: ["Midwest", "中西部"],
  R30: ["Gulf Coast", "墨西哥湾沿岸"],
  R40: ["Rocky Mountain", "落基山地区"],
  R50: ["West Coast", "西海岸"],
  R5XCA: ["West Coast (excl. California)", "西海岸（不含加州）"],
  SCA: ["California", "加州"],
  SCO: ["Colorado", "科罗拉多州"],
  SFL: ["Florida", "佛罗里达州"],
  SMA: ["Massachusetts", "马萨诸塞州"],
  SMN: ["Minnesota", "明尼苏达州"],
  SNY: ["New York State", "纽约州"],
  SOH: ["Ohio", "俄亥俄州"],
  STX: ["Texas", "得克萨斯州"],
  SWA: ["Washington", "华盛顿州"],
  YBOS: ["Boston", "波士顿"],
  YORD: ["Chicago", "芝加哥"],
  YCLE: ["Cleveland", "克利夫兰"],
  YDEN: ["Denver", "丹佛"],
  Y44HO: ["Houston", "休斯敦"],
  Y05LA: ["Los Angeles", "洛杉矶"],
  YMIA: ["Miami", "迈阿密"],
  Y35NY: ["New York City", "纽约市"],
  Y05SF: ["San Francisco", "旧金山"],
  Y48SE: ["Seattle", "西雅图"],
};

const STATES = {
  AL: ["Alabama", "阿拉巴马州"], AK: ["Alaska", "阿拉斯加州"], AZ: ["Arizona", "亚利桑那州"],
  AR: ["Arkansas", "阿肯色州"], CA: ["California", "加利福尼亚州"], CO: ["Colorado", "科罗拉多州"],
  CT: ["Connecticut", "康涅狄格州"], DE: ["Delaware", "特拉华州"], DC: ["Washington, D.C.", "华盛顿特区"],
  FL: ["Florida", "佛罗里达州"], GA: ["Georgia", "佐治亚州"], HI: ["Hawaii", "夏威夷州"],
  ID: ["Idaho", "爱达荷州"], IL: ["Illinois", "伊利诺伊州"], IN: ["Indiana", "印第安纳州"],
  IA: ["Iowa", "艾奥瓦州"], KS: ["Kansas", "堪萨斯州"], KY: ["Kentucky", "肯塔基州"],
  LA: ["Louisiana", "路易斯安那州"], ME: ["Maine", "缅因州"], MD: ["Maryland", "马里兰州"],
  MA: ["Massachusetts", "马萨诸塞州"], MI: ["Michigan", "密歇根州"], MN: ["Minnesota", "明尼苏达州"],
  MS: ["Mississippi", "密西西比州"], MO: ["Missouri", "密苏里州"], MT: ["Montana", "蒙大拿州"],
  NE: ["Nebraska", "内布拉斯加州"], NV: ["Nevada", "内华达州"], NH: ["New Hampshire", "新罕布什尔州"],
  NJ: ["New Jersey", "新泽西州"], NM: ["New Mexico", "新墨西哥州"], NY: ["New York", "纽约州"],
  NC: ["North Carolina", "北卡罗来纳州"], ND: ["North Dakota", "北达科他州"], OH: ["Ohio", "俄亥俄州"],
  OK: ["Oklahoma", "俄克拉何马州"], OR: ["Oregon", "俄勒冈州"], PA: ["Pennsylvania", "宾夕法尼亚州"],
  RI: ["Rhode Island", "罗得岛州"], SC: ["South Carolina", "南卡罗来纳州"], SD: ["South Dakota", "南达科他州"],
  TN: ["Tennessee", "田纳西州"], TX: ["Texas", "得克萨斯州"], UT: ["Utah", "犹他州"],
  VT: ["Vermont", "佛蒙特州"], VA: ["Virginia", "弗吉尼亚州"], WA: ["Washington", "华盛顿州"],
  WV: ["West Virginia", "西弗吉尼亚州"], WI: ["Wisconsin", "威斯康星州"], WY: ["Wyoming", "怀俄明州"],
  PR: ["Puerto Rico", "波多黎各"], GU: ["Guam", "关岛"], AE: ["Military mail", "美军邮区"],
  AA: ["Military mail", "美军邮区"], AP: ["Military mail", "美军邮区"],
};

const WEEKDAYS = {
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  zh: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
};
const WEEKDAYS_SHORT = { en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], zh: WEEKDAYS.zh };
const MONTHS = { en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] };

const STRINGS = { en, zh };
let lang = "en";

export const getLang = () => lang;
export function setLang(next) {
  lang = STRINGS[next] ? next : "en";
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
}

export function detectLang() {
  let saved = null;
  try {
    saved = localStorage.getItem("gsg.lang");
  } catch {}
  if (saved && STRINGS[saved]) return saved;
  return (navigator.languages || [navigator.language]).some((l) => /^zh/i.test(l)) ? "zh" : "en";
}

export function t(key, vars = {}) {
  const text = STRINGS[lang][key] ?? en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => (name in vars ? vars[name] : `{${name}}`));
}

export const areaName = (id) => (AREAS[id] || [id, id])[lang === "zh" ? 1 : 0];
export const stateName = (code) => (STATES[code] || [code, code])[lang === "zh" ? 1 : 0];

const DAY_MS = 86400000;
const parts = (day) => {
  const d = new Date(day * DAY_MS);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), w: d.getUTCDay() };
};

/** "Nov 7" / "11月7日" */
export function fmtDate(day) {
  const p = parts(day);
  return lang === "zh" ? `${p.m + 1}月${p.d}日` : `${MONTHS.en[p.m]} ${p.d}`;
}

/** "Saturday, Nov 7" / "11月7日周六" */
export function fmtDayLong(day) {
  const p = parts(day);
  return lang === "zh" ? `${p.m + 1}月${p.d}日${WEEKDAYS.zh[p.w]}` : `${WEEKDAYS.en[p.w]}, ${MONTHS.en[p.m]} ${p.d}`;
}

/** "Saturday" / "周六" */
export const fmtWeekday = (day) => WEEKDAYS[lang][parts(day).w];
export const fmtWeekdayShort = (day) => WEEKDAYS_SHORT[lang][parts(day).w];

export function fmtTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString(lang === "zh" ? "zh-CN" : "en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
  });
}

export function applyStatic(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  root.querySelectorAll("[data-i18n-aria]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
  document.title = t("meta.title");
}
