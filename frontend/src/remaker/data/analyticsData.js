/* =========================================================
   REMAKER ANALYTICS - SAMPLE DATA GENERATOR (no backend yet)
   Builds one year of believable daily numbers for the ReMaker's
   products so every range (7 days, 30 days, 90 days, 12 months)
   can be summed and compared with the period before it.

   The numbers are seeded, so they look the same on every refresh.
   Replace getAnalytics() with an API call later; the page only
   uses the shape returned here.
   ========================================================= */

import { REMAKER_PRODUCTS } from "./remakerProducts";
import { FEE_RATE } from "./salesStore";

export const RANGES = [
  { key: "7", label: "7 days", days: 7, long: "Last 7 days" },
  { key: "30", label: "30 days", days: 30, long: "Last 30 days" },
  { key: "90", label: "90 days", days: 90, long: "Last 90 days" },
  { key: "365", label: "12 months", days: 365, long: "Last 12 months" },
];

const DAY = 86400000;
const TOTAL_DAYS = 365 + 365; /* a year, plus a year before it for comparison */

/* small seeded random number generator */
function mulberry(seed) {
  let a = seed;

  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* The four live products, each with its own traffic and conversion */
const PROFILE = {
  "rp-1001": { views: 8, save: 0.075, conv: 0.007, growth: 0.7 },
  "rp-1002": { views: 11, save: 0.058, conv: 0.012, growth: 1.1 },
  "rp-1003": { views: 14, save: 0.051, conv: 0.018, growth: 0.9 },
  "rp-1004": { views: 5, save: 0.082, conv: 0.009, growth: 0.4 },
};

const products = REMAKER_PRODUCTS.filter((product) => PROFILE[product.id]);

const SOURCES = [
  { key: "search", label: "Marketplace search", share: 0.36 },
  { key: "browse", label: "Category browsing", share: 0.24 },
  { key: "profile", label: "Your profile page", share: 0.17 },
  { key: "feed", label: "Followers' feed", share: 0.14 },
  { key: "link", label: "Shared links", share: 0.09 },
];

const CITIES = [
  { city: "Ahmedabad", state: "Gujarat", weight: 0.22 },
  { city: "Mumbai", state: "Maharashtra", weight: 0.17 },
  { city: "Bengaluru", state: "Karnataka", weight: 0.15 },
  { city: "Pune", state: "Maharashtra", weight: 0.11 },
  { city: "Delhi", state: "Delhi", weight: 0.1 },
  { city: "Jaipur", state: "Rajasthan", weight: 0.08 },
  { city: "Kolkata", state: "West Bengal", weight: 0.07 },
  { city: "Other cities", state: "", weight: 0.1 },
];

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIME_BLOCKS = ["6 to 9 am", "9 am to 12", "12 to 3 pm", "3 to 6 pm", "6 to 9 pm", "9 to 12 pm"];

/* ---------- build the daily rows once ---------- */

const today = new Date();
today.setHours(0, 0, 0, 0);

function buildDays() {
  const random = mulberry(20261008);
  const rows = [];

  for (let index = 0; index < TOTAL_DAYS; index += 1) {
    const date = new Date(today.getTime() - (TOTAL_DAYS - 1 - index) * DAY);
    const weekday = (date.getDay() + 6) % 7; /* Monday = 0 */
    const weekend = weekday >= 5 ? 1.22 : weekday === 4 ? 1.08 : 0.96;
    const progress = index / (TOTAL_DAYS - 1); /* 0 a year ago, 1 today */
    const season = 1 + 0.18 * Math.sin((date.getMonth() / 12) * Math.PI * 2 + 1);

    const day = {
      date,
      perProduct: {},
      views: 0,
      saves: 0,
      orders: 0,
      revenue: 0,
      visits: 0,
      followers: 0,
    };

    products.forEach((product) => {
      const profile = PROFILE[product.id];
      const trend = 0.6 + progress * 0.9 * profile.growth;
      const noise = 0.78 + random() * 0.45;
      const views = Math.round(profile.views * weekend * season * trend * noise);
      const saves = Math.round(views * profile.save * (0.8 + random() * 0.4));

      /* orders: expected value from conversion, drawn from a small distribution */
      const expected = views * profile.conv * (0.75 + random() * 0.5);
      let orders = Math.floor(expected);
      if (random() < expected - orders) orders += 1;

      const revenue = Math.round(orders * product.price * (1 - FEE_RATE));

      day.perProduct[product.id] = { views, saves, orders, revenue };
      day.views += views;
      day.saves += saves;
      day.orders += orders;
      day.revenue += revenue;
    });

    day.visits = Math.round(day.views * (0.34 + random() * 0.08));
    day.followers = Math.round((day.views / 105) * (0.5 + random() * 1.0));

    rows.push(day);
  }

  return rows;
}

const DAYS = buildDays();

/* ---------- helpers ---------- */

function sumRows(rows) {
  const total = { views: 0, saves: 0, orders: 0, revenue: 0, visits: 0, followers: 0 };

  rows.forEach((row) => {
    total.views += row.views;
    total.saves += row.saves;
    total.orders += row.orders;
    total.revenue += row.revenue;
    total.visits += row.visits;
    total.followers += row.followers;
  });

  total.aov = total.orders ? Math.round(total.revenue / total.orders) : 0;
  total.conv = total.views ? (total.orders / total.views) * 100 : 0;

  return total;
}

function change(current, previous) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* group rows into points: daily, weekly or monthly depending on the range */
function bucketize(rows, days) {
  const points = [];

  if (days <= 31) {
    rows.forEach((row) => {
      points.push({
        label: `${row.date.getDate()} ${MONTHS[row.date.getMonth()]}`,
        short: days <= 7 ? WEEK_DAYS[(row.date.getDay() + 6) % 7] : String(row.date.getDate()),
        rows: [row],
      });
    });
  } else if (days <= 90) {
    for (let i = 0; i < rows.length; i += 7) {
      const slice = rows.slice(i, i + 7);
      points.push({
        label: `Week of ${slice[0].date.getDate()} ${MONTHS[slice[0].date.getMonth()]}`,
        short: `${slice[0].date.getDate()} ${MONTHS[slice[0].date.getMonth()]}`,
        rows: slice,
      });
    }
  } else {
    const map = new Map();

    rows.forEach((row) => {
      const key = `${row.date.getFullYear()}-${row.date.getMonth()}`;
      if (!map.has(key)) {
        map.set(key, {
          label: `${MONTHS[row.date.getMonth()]} ${row.date.getFullYear()}`,
          short: MONTHS[row.date.getMonth()],
          rows: [],
        });
      }
      map.get(key).rows.push(row);
    });

    points.push(...map.values());
  }

  return points.map((point) => {
    const total = sumRows(point.rows);
    return { label: point.label, short: point.short, ...total };
  });
}

/* ---------- main entry ---------- */

export function getAnalytics(rangeKey = "30") {
  const range = RANGES.find((item) => item.key === rangeKey) || RANGES[1];
  const days = range.days;

  const currentRows = DAYS.slice(DAYS.length - days);
  const previousRows = DAYS.slice(DAYS.length - days * 2, DAYS.length - days);

  const current = sumRows(currentRows);
  const previous = sumRows(previousRows);

  const deltas = {
    revenue: change(current.revenue, previous.revenue),
    orders: change(current.orders, previous.orders),
    views: change(current.views, previous.views),
    conv: change(current.conv, previous.conv),
    aov: change(current.aov, previous.aov),
    followers: change(current.followers, previous.followers),
  };

  const series = bucketize(currentRows, days);

  /* per product totals */
  const productRows = products
    .map((product) => {
      const totals = { views: 0, saves: 0, orders: 0, revenue: 0 };
      const before = { revenue: 0 };

      currentRows.forEach((row) => {
        const cell = row.perProduct[product.id];
        totals.views += cell.views;
        totals.saves += cell.saves;
        totals.orders += cell.orders;
        totals.revenue += cell.revenue;
      });

      previousRows.forEach((row) => {
        before.revenue += row.perProduct[product.id].revenue;
      });

      return {
        id: product.id,
        title: product.title,
        category: product.category,
        image: product.images[0],
        price: product.price,
        status: product.status,
        ...totals,
        conv: totals.views ? (totals.orders / totals.views) * 100 : 0,
        delta: change(totals.revenue, before.revenue),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  /* sales by category */
  const categoryMap = new Map();
  productRows.forEach((row) => {
    categoryMap.set(row.category, (categoryMap.get(row.category) || 0) + row.revenue);
  });

  const categoryTotal = [...categoryMap.values()].reduce((a, b) => a + b, 0) || 1;
  const categories = [...categoryMap.entries()]
    .map(([name, revenue]) => ({ name, revenue, share: (revenue / categoryTotal) * 100 }))
    .sort((a, b) => b.revenue - a.revenue);

  /* traffic sources: shares drift a little with the range so each looks real */
  const sources = SOURCES.map((source, index) => {
    const wobble = 1 + (((days * (index + 3)) % 7) - 3) * 0.012;
    return { ...source, value: Math.round(current.views * source.share * wobble) };
  });
  const sourceTotal = sources.reduce((total, source) => total + source.value, 0) || 1;
  sources.forEach((source) => {
    source.percent = (source.value / sourceTotal) * 100;
  });

  /* where buyers are */
  const cities = CITIES.map((item) => ({
    ...item,
    orders: Math.round(current.orders * item.weight),
    revenue: Math.round(current.revenue * item.weight),
    percent: item.weight * 100,
  }));

  /* orders by weekday and time of day (weights are fixed, scaled to the range) */
  const dayWeight = [0.8, 0.85, 0.9, 0.95, 1.15, 1.35, 1.2];
  const blockWeight = [0.3, 0.7, 0.9, 1, 1.45, 1.1];
  const cells = WEEK_DAYS.map((day, d) =>
    TIME_BLOCKS.map((block, b) => {
      const jitter = 0.9 + (((d * 7 + b * 3) % 5) / 5) * 0.25;
      return dayWeight[d] * blockWeight[b] * jitter;
    }),
  );
  const cellTotal = cells.flat().reduce((a, b) => a + b, 0);
  const heat = cells.map((row) => row.map((value) => Math.round((value / cellTotal) * current.orders * 10) / 10));
  const heatMax = Math.max(...heat.flat(), 0.1);

  let best = { d: 0, b: 0, value: -1 };
  heat.forEach((row, d) =>
    row.forEach((value, b) => {
      if (value > best.value) best = { d, b, value };
    }),
  );

  /* sales funnel */
  const completed = Math.round(current.orders * 0.94);
  const funnel = [
    { key: "views", label: "Product views", value: current.views },
    { key: "saves", label: "Saved to wishlist", value: current.saves },
    { key: "orders", label: "Orders placed", value: current.orders },
    { key: "done", label: "Orders completed", value: completed },
  ];

  return {
    range,
    current,
    previous,
    deltas,
    series,
    products: productRows,
    categories,
    sources,
    cities,
    heatmap: {
      days: WEEK_DAYS,
      blocks: TIME_BLOCKS,
      cells: heat,
      max: heatMax,
      best: { day: WEEK_DAYS[best.d], block: TIME_BLOCKS[best.b], value: best.value },
    },
    funnel,
  };
}
