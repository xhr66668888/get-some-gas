// ZIP code -> state -> the most specific EIA pump-price survey that covers it
// (city, then state, then PADD region, then the U.S. average).

// [first ZIP3, last ZIP3, state] - USPS prefix ranges.
const ZIP3_STATES = [
  [5, 5, "NY"], [6, 9, "PR"], [10, 27, "MA"], [28, 29, "RI"], [30, 38, "NH"], [39, 49, "ME"],
  [50, 54, "VT"], [55, 55, "MA"], [56, 59, "VT"], [60, 69, "CT"], [70, 89, "NJ"], [90, 99, "AE"],
  [100, 149, "NY"], [150, 196, "PA"], [197, 199, "DE"], [200, 200, "DC"], [201, 201, "VA"],
  [202, 205, "DC"], [206, 219, "MD"], [220, 246, "VA"], [247, 268, "WV"], [270, 289, "NC"],
  [290, 299, "SC"], [300, 319, "GA"], [320, 339, "FL"], [340, 340, "AA"], [341, 349, "FL"],
  [350, 369, "AL"], [370, 385, "TN"], [386, 397, "MS"], [398, 399, "GA"], [400, 427, "KY"],
  [430, 459, "OH"], [460, 479, "IN"], [480, 499, "MI"], [500, 528, "IA"], [530, 549, "WI"],
  [550, 567, "MN"], [569, 569, "DC"], [570, 577, "SD"], [580, 588, "ND"], [590, 599, "MT"],
  [600, 629, "IL"], [630, 658, "MO"], [660, 679, "KS"], [680, 693, "NE"], [700, 714, "LA"],
  [716, 729, "AR"], [730, 732, "OK"], [733, 733, "TX"], [734, 749, "OK"], [750, 799, "TX"],
  [800, 816, "CO"], [820, 831, "WY"], [832, 838, "ID"], [840, 847, "UT"], [850, 865, "AZ"],
  [870, 884, "NM"], [885, 885, "TX"], [889, 898, "NV"], [900, 961, "CA"], [962, 966, "AP"],
  [967, 968, "HI"], [969, 969, "GU"], [970, 979, "OR"], [980, 994, "WA"], [995, 999, "AK"],
];

// EIA city surveys, by metro-area ZIP3 ranges.
const CITY_ZIP3 = {
  YBOS: [[18, 24]],
  Y35NY: [[100, 104], [110, 114], [116, 116]],
  YMIA: [[330, 334]],
  YORD: [[600, 608]],
  YCLE: [[440, 441]],
  Y44HO: [[770, 775]],
  YDEN: [[800, 804]],
  Y05LA: [[900, 918], [926, 928], [935, 935]],
  Y05SF: [[940, 941], [943, 949]],
  Y48SE: [[980, 984]],
};

const STATE_SERIES = { CA: "SCA", CO: "SCO", FL: "SFL", MA: "SMA", MN: "SMN", NY: "SNY", OH: "SOH", TX: "STX", WA: "SWA" };

const PADD = {
  R1X: ["CT", "ME", "MA", "NH", "RI", "VT"],
  R1Y: ["DE", "DC", "MD", "NJ", "NY", "PA"],
  R1Z: ["FL", "GA", "NC", "SC", "VA", "WV"],
  R20: ["IL", "IN", "IA", "KS", "KY", "MI", "MN", "MO", "NE", "ND", "SD", "OH", "OK", "TN", "WI"],
  R30: ["AL", "AR", "LA", "MS", "NM", "TX"],
  R40: ["CO", "ID", "MT", "UT", "WY"],
  R50: ["CA"],
  R5XCA: ["AK", "AZ", "HI", "NV", "OR", "WA"],
};
const STATE_PADD = Object.fromEntries(Object.entries(PADD).flatMap(([id, states]) => states.map((s) => [s, id])));

export function isZip(text) {
  return /^\d{5}$/.test(text);
}

export function stateForZip(zip) {
  const z3 = Number(zip.slice(0, 3));
  const hit = ZIP3_STATES.find(([lo, hi]) => z3 >= lo && z3 <= hi);
  return hit ? hit[2] : null;
}

/** Most specific surveyed area for a ZIP, falling back toward the U.S. average. */
export function resolveZip(zip, areas) {
  const state = stateForZip(zip);
  const z3 = Number(zip.slice(0, 3));
  const city = Object.keys(CITY_ZIP3).find((id) => CITY_ZIP3[id].some(([lo, hi]) => z3 >= lo && z3 <= hi));
  const chain = [city, STATE_SERIES[state], STATE_PADD[state], "NUS"].filter((id) => id && areas[id]);
  const areaId = chain[0];
  return { zip, state, areaId, covered: Boolean(STATE_PADD[state]) };
}
