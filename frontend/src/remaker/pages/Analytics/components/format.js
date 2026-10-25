import { formatPrice } from "../../../data/remakerMarketplaceData";

export { formatPrice };

export const fmtNumber = (value) => Math.round(value).toLocaleString("en-IN");

/* 12,400 -> 12.4K, 1,250,000 -> 12.5L (Indian style) */
export function fmtCompact(value) {
  const n = Math.abs(value);
  if (n >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `${(value / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${(value / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return String(Math.round(value));
}

export const fmtPercent = (value, digits = 1) => `${value.toFixed(digits)}%`;

export function fmtDelta(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

/* round a chart maximum up to a tidy number */
export function niceMax(value) {
  if (value <= 0) return 10;
  const power = 10 ** Math.floor(Math.log10(value));
  const scaled = value / power;
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
  return step * power;
}
