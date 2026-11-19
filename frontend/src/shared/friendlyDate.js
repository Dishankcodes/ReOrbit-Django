/* =========================================================
   Dates the way people say them, in Indian time:
     "Today, 3:45 pm" · "Yesterday, 9:10 am" · "17th November, 6:02 pm"
     · "17th November 2025, 6:02 pm" (another year)
   friendlyDateTime(value, { time: false }) leaves the time out.
   ========================================================= */

const TZ = "Asia/Kolkata";

function parts(d) {
  const f = new Intl.DateTimeFormat("en-IN", {
    timeZone: TZ, year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
  });
  const out = {};
  for (const p of f.formatToParts(d)) out[p.type] = p.value;
  return out;
}

export function ordinal(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th"}`;
}

/* "2026-11-17" for the day in Indian time, so "today" doesn't flip at UTC midnight */
const dayKey = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);

export function friendlyDateTime(value, { time = true } = {}) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const p = parts(d);
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);
  let day;
  if (dayKey(d) === dayKey(now)) day = "Today";
  else if (dayKey(d) === dayKey(yesterday)) day = "Yesterday";
  else {
    day = `${ordinal(Number(p.day))} ${p.month}`;
    if (p.year !== parts(now).year) day += ` ${p.year}`;
  }
  if (!time) return day;
  // date-only values ("2026-11-17") have no real time
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return day;
  return `${day}, ${p.hour}:${p.minute} ${String(p.dayPeriod || "").toLowerCase()}`.trim();
}
