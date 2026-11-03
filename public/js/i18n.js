// UI copy in English and Simplified Chinese. Static text uses data-i18n="key";
// dynamic text goes through t(key, vars). scripts/subset_fonts.py reads this file to
// decide which Chinese glyphs the web fonts need.

const en = {
  "meta.title": "Get Some Gas — when to fill up this week",
  "nav.lang": "中文",

  "hero.title": "When should you fill up this week?",
  "hero.zipLabel": "ZIP code",
  "hero.zipPlaceholder": "Enter ZIP code, e.g. 92122",
  "hero.cta": "Go",

  "zip.invalid": "Enter a 5-digit U.S. ZIP code.",
  "zip.unsupported": "That ZIP isn't covered, so this is the U.S. average.",
  "status.loading": "Loading…",
  "status.error": "Couldn't load prices. Please try again later.",

  "answer.label": "Best day to fill up",
  "answer.today": "Today",
  "answer.wait": "About {price}/gal · {cents} less than today",
  "answer.now": "About {price}/gal today · {peak} by {day}",
  "answer.flat": "About {price}/gal · steady this week",
  "answer.fill": "Fill",
  "answer.gallons": "gallons",
  "answer.save": "Save {amount}",

  "chart.title": "Gas price trend",
  "chart.today": "Today",
  "chart.actual": "Actual",
  "chart.forecast": "Forecast",
  "chart.date": "Date",
  "chart.price": "Price",
  "chart.aria": "Gas price trend for {area}: recent weeks and the next 7 days.",

  "footer.updated": "Updated {time}",
};

const zh = {
  "meta.title": "Get Some Gas — 这周哪天加油最便宜",
  "nav.lang": "EN",

  "hero.title": "这周哪天加油最便宜？",
  "hero.zipLabel": "邮编",
  "hero.zipPlaceholder": "输入邮编，例如 92122",
  "hero.cta": "查看",

  "zip.invalid": "请输入 5 位美国邮编。",
  "zip.unsupported": "该邮编不在调查范围内，显示的是全美平均。",
  "status.loading": "加载中…",
  "status.error": "油价加载失败，请稍后再试。",

  "answer.label": "最佳加油日",
  "answer.today": "今天",
  "answer.wait": "预计 {price}/加仑 · 比今天便宜 {cents}",
  "answer.now": "今天约 {price}/加仑 · {day}预计涨到 {peak}",
  "answer.flat": "预计 {price}/加仑 · 本周基本持平",
  "answer.fill": "加",
  "answer.gallons": "加仑",
  "answer.save": "省 {amount}",

  "chart.title": "油价走势",
  "chart.today": "今天",
  "chart.actual": "实际",
  "chart.forecast": "预测",
  "chart.date": "日期",
  "chart.price": "油价",
  "chart.aria": "{area}油价走势：近几周的实际价格和未来 7 天的预测。",

  "footer.updated": "更新于 {time}",
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

const WEEKDAYS = {
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  zh: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
};
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

const DAY_MS = 86400000;
const parts = (day) => {
  const d = new Date(day * DAY_MS);
  return { m: d.getUTCMonth(), d: d.getUTCDate(), w: d.getUTCDay() };
};

/** "Nov 7" / "11月7日" */
export function fmtDate(day) {
  const p = parts(day);
  return lang === "zh" ? `${p.m + 1}月${p.d}日` : `${MONTHS.en[p.m]} ${p.d}`;
}

/** "Saturday, Nov 7" / "11月7日 周六" */
export function fmtDayLong(day) {
  const p = parts(day);
  return lang === "zh" ? `${p.m + 1}月${p.d}日 ${WEEKDAYS.zh[p.w]}` : `${WEEKDAYS.en[p.w]}, ${MONTHS.en[p.m]} ${p.d}`;
}

/** "Saturday" / "周六" */
export const fmtWeekday = (day) => WEEKDAYS[lang][parts(day).w];

export function fmtTime(iso) {
  return new Date(iso).toLocaleString(lang === "zh" ? "zh-CN" : "en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export function applyStatic(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  root.querySelectorAll("[data-i18n-aria]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
  document.title = t("meta.title");
}
