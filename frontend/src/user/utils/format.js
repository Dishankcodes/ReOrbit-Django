/* Small date / number helpers for the user side. */

const DAY = 86400000;

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const weekdayFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short" });
const dayMonthFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
});
const longDateFmt = new Intl.DateTimeFormat("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const valid = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDate = (value) => {
  const date = valid(value);
  return date ? dateFmt.format(date) : "—";
};

export const formatDateTime = (value) => {
  const date = valid(value);
  return date ? dateTimeFmt.format(date) : "—";
};

export const formatLongDate = (value) => {
  const date = valid(value);
  return date ? longDateFmt.format(date) : "—";
};

export const formatWeekday = (value) => {
  const date = valid(value);
  return date ? weekdayFmt.format(date) : "";
};

export const formatDayMonth = (value) => {
  const date = valid(value);
  return date ? dayMonthFmt.format(date) : "";
};

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

/* "Today", "Tomorrow", "In 3 days", "2 days ago" */
export const relativeDay = (value) => {
  if (!valid(value)) return "";
  const diff = Math.round((startOfDay(value) - startOfDay(Date.now())) / DAY);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return diff > 0 ? `In ${diff} days` : `${-diff} days ago`;
};

export const toDateInput = (value) => {
  const date = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const kg = (value) =>
  `${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 1 })} kg`;

export const plural = (count, word, many) =>
  `${count} ${count === 1 ? word : many || `${word}s`}`;
