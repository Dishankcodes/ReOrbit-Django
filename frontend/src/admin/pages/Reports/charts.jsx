import React, { useEffect, useRef, useState } from "react";
import { BarChart3, Table2, Download } from "lucide-react";

export const SERIES = [
  "var(--rp-c1)",
  "var(--rp-c2)",
  "var(--rp-c3)",
  "var(--rp-c4)",
];
export const inr = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;
export const compactInr = (n) =>
  n >= 1e7
    ? `₹${(n / 1e7).toFixed(1)}Cr`
    : n >= 1e5
      ? `₹${(n / 1e5).toFixed(1)}L`
      : n >= 1e3
        ? `₹${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}k`
        : `₹${Math.round(n)}`;
export const num = (n) => Math.round(n).toLocaleString("en-IN");

export function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(640);
  useEffect(() => {
    if (!ref.current) return undefined;
    const el = ref.current;
    const read = () =>
      setW(Math.max(260, Math.floor(el.getBoundingClientRect().width)));
    read();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/* ---------- card shell with chart/table toggle + legend ---------- */
export function ChartCard({
  title,
  sub,
  legend,
  table,
  children,
  csv,
  className = "",
}) {
  const [view, setView] = useState("chart");
  return (
    <section className={`rp-card ${className}`}>
      <header className="rp-card-head">
        <div>
          <h3>{title}</h3>
          {sub && <p>{sub}</p>}
        </div>
        <div className="rp-card-tools">
          {csv && (
            <button
              type="button"
              className="rp-icon-btn"
              onClick={csv}
              aria-label={`Export ${title} as CSV`}
              title="Export CSV"
            >
              <Download size={15} />
            </button>
          )}
          {table && (
            <div className="rp-seg" role="group" aria-label="View">
              <button
                type="button"
                className={view === "chart" ? "on" : ""}
                onClick={() => setView("chart")}
                aria-label="Chart view"
                title="Chart"
              >
                <BarChart3 size={15} />
              </button>
              <button
                type="button"
                className={view === "table" ? "on" : ""}
                onClick={() => setView("table")}
                aria-label="Table view"
                title="Table"
              >
                <Table2 size={15} />
              </button>
            </div>
          )}
        </div>
      </header>
      {legend && view === "chart" && (
        <ul className="rp-legend">
          {legend.map((l, i) => (
            <li key={l.label}>
              <i style={{ background: l.color || SERIES[i] }} />
              {l.label}
            </li>
          ))}
        </ul>
      )}
      {view === "chart" ? (
        children
      ) : (
        <div className="rp-table-wrap">
          <table className="rp-table">
            <thead>
              <tr>
                {table.columns.map((c) => (
                  <th key={c.key} className={c.num ? "num" : ""}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i}>
                  {table.columns.map((c) => (
                    <td key={c.key} className={c.num ? "num" : ""}>
                      {c.fmt ? c.fmt(r[c.key]) : r[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ---------- shared axis helpers ---------- */
export function niceMax(v) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  const m = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  return m < 40 && Number.isInteger(v)
    ? Math.ceil(m / 4) * 4
    : m; /* whole-number ticks for counts */
}
export const PAD = { l: 46, r: 12, t: 12, b: 26 };
export const H = 250;

export function Tooltip({ x, y, width, title, rows }) {
  const left = x > width * 0.6;
  return (
    <div
      className="rp-tip"
      style={{
        left: left ? undefined : x + 14,
        right: left ? width - x + 14 : undefined,
        top: Math.max(4, y),
      }}
      role="status"
    >
      <b>{title}</b>
      {rows.map((r) => (
        <div key={r.label}>
          <i style={{ background: r.color }} />
          <span>{r.label}</span>
          <strong>{r.value}</strong>
        </div>
      ))}
    </div>
  );
}

/* ---------- line / area chart: crosshair + one tooltip listing every series ---------- */
export function LineChart({
  data,
  series,
  format = num,
  axisFormat = format,
  area = false,
}) {
  const [ref, w] = useWidth();
  const [hover, setHover] = useState(null);
  const iw = w - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const max = niceMax(
    Math.max(...data.flatMap((d) => series.map((s) => d[s.key] || 0)), 1),
  );
  const x = (i) =>
    PAD.l + (data.length <= 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v) => PAD.t + ih - (v / max) * ih;
  const ticks = [0, 1, 2, 3, 4].map((k) => (max / 4) * k);
  const every = Math.ceil(data.length / Math.max(2, Math.floor(iw / 62)));

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) * (w / r.width) - PAD.l;
    const i = Math.max(
      0,
      Math.min(data.length - 1, Math.round((px / iw) * (data.length - 1))),
    );
    setHover(i);
  };
  const path = (k) =>
    data
      .map(
        (d, i) =>
          `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d[k] || 0).toFixed(1)}`,
      )
      .join(" ");

  return (
    <div className="rp-plot" ref={ref}>
      <svg
        width={w}
        height={H}
        role="img"
        aria-label={`Line chart of ${series.map((s) => s.label).join(", ")}`}
      >
        {ticks.map((tk) => (
          <g key={tk}>
            <line
              x1={PAD.l}
              x2={w - PAD.r}
              y1={y(tk)}
              y2={y(tk)}
              className="rp-grid"
            />
            <text
              x={PAD.l - 8}
              y={y(tk) + 4}
              textAnchor="end"
              className="rp-axis"
            >
              {axisFormat(tk)}
            </text>
          </g>
        ))}
        {data.map((d, i) =>
          i % every === 0 ? (
            <text
              key={d.label}
              x={x(i)}
              y={H - 6}
              textAnchor={
                i === data.length - 1 ? "end" : i === 0 ? "start" : "middle"
              }
              className="rp-axis"
            >
              {d.label}
            </text>
          ) : null,
        )}
        {area &&
          series
            .slice(0, 1)
            .map((s) => (
              <path
                key={s.key}
                d={`${path(s.key)} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`}
                fill={s.color}
                opacity="0.12"
              />
            ))}
        {series.map((s) => (
          <path
            key={s.key}
            d={path(s.key)}
            fill="none"
            stroke={s.color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {hover != null && (
          <g>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD.t}
              y2={PAD.t + ih}
              className="rp-cross"
            />
            {series.map((s) => (
              <circle
                key={s.key}
                cx={x(hover)}
                cy={y(data[hover][s.key] || 0)}
                r="4.5"
                fill={s.color}
                className="rp-ring"
              />
            ))}
          </g>
        )}
        <rect
          x={PAD.l}
          y={PAD.t}
          width={iw}
          height={ih}
          fill="transparent"
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {hover != null && (
        <Tooltip
          x={x(hover)}
          y={PAD.t}
          width={w}
          title={data[hover].label}
          rows={series.map((s) => ({
            label: s.label,
            color: s.color,
            value: format(data[hover][s.key] || 0),
          }))}
        />
      )}
    </div>
  );
}

/* ---------- vertical stacked bars (2px gaps, rounded top) ---------- */
export function StackedBars({ data, series, format = num }) {
  const [ref, w] = useWidth();
  const [hover, setHover] = useState(null);
  const iw = w - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const totals = data.map((d) =>
    series.reduce((n, s) => n + (d[s.key] || 0), 0),
  );
  const max = niceMax(Math.max(...totals, 1));
  const slot = iw / Math.max(data.length, 1);
  const bw = Math.max(6, Math.min(34, slot * 0.58));
  const y = (v) => PAD.t + ih - (v / max) * ih;
  const ticks = [0, 1, 2, 3, 4].map((k) => (max / 4) * k);
  const every = Math.ceil(data.length / Math.max(2, Math.floor(iw / 62)));

  return (
    <div className="rp-plot" ref={ref}>
      <svg
        width={w}
        height={H}
        role="img"
        aria-label={`Stacked bar chart of ${series.map((s) => s.label).join(", ")}`}
      >
        {ticks.map((tk) => (
          <g key={tk}>
            <line
              x1={PAD.l}
              x2={w - PAD.r}
              y1={y(tk)}
              y2={y(tk)}
              className="rp-grid"
            />
            <text
              x={PAD.l - 8}
              y={y(tk) + 4}
              textAnchor="end"
              className="rp-axis"
            >
              {num(tk)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = PAD.l + slot * i + slot / 2;
          let acc = 0;
          const segs = series.filter((s) => (d[s.key] || 0) > 0);
          return (
            <g key={d.label} opacity={hover == null || hover === i ? 1 : 0.55}>
              {i % every === 0 && (
                <text x={cx} y={H - 6} textAnchor="middle" className="rp-axis">
                  {d.label}
                </text>
              )}
              {segs.map((s, si) => {
                const v = d[s.key];
                const y1 = y(acc + v);
                const y0 = y(acc);
                acc += v;
                const top = si === segs.length - 1;
                const h = Math.max(1, y0 - y1 - (si === 0 ? 0 : 2));
                const yy = y0 - h;
                const rx = top ? Math.min(4, bw / 2, h) : 0;
                const p = `M${cx - bw / 2},${yy + h} V${yy + rx} Q${cx - bw / 2},${yy} ${cx - bw / 2 + rx},${yy} H${cx + bw / 2 - rx} Q${cx + bw / 2},${yy} ${cx + bw / 2},${yy + rx} V${yy + h} Z`;
                return <path key={s.key} d={p} fill={s.color} />;
              })}
            </g>
          );
        })}
        {data.map((d, i) => (
          <rect
            key={`h${d.label}`}
            x={PAD.l + slot * i}
            y={PAD.t}
            width={slot}
            height={ih}
            fill="transparent"
            onPointerEnter={() => setHover(i)}
            onPointerMove={() => setHover(i)}
            onPointerDown={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
          />
        ))}
      </svg>
      {hover != null && (
        <Tooltip
          x={PAD.l + slot * hover + slot / 2}
          y={PAD.t}
          width={w}
          title={`${data[hover].label} · ${format(totals[hover])} total`}
          rows={series.map((s) => ({
            label: s.label,
            color: s.color,
            value: format(data[hover][s.key] || 0),
          }))}
        />
      )}
    </div>
  );
}

/* ---------- horizontal ranked bars (one hue = magnitude) ---------- */
export function BarList({ rows, format = num, total, unit = "" }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(...rows.map((r) => r.value), 1);
  const sum = total ?? rows.reduce((n, r) => n + r.value, 0);
  if (!rows.length || !sum)
    return <p className="rp-empty">No data in this range.</p>;
  return (
    <ul className="rp-bars">
      {rows.map((r, i) => (
        <li
          key={`${r.label}-${i}`}
          onPointerEnter={() => setHover(i)}
          onPointerLeave={() => setHover(null)}
          className={hover === i ? "hot" : ""}
        >
          <span className="rp-bar-label">{r.label}</span>
          <span className="rp-bar-track">
            <span
              className={`rp-bar-fill ${r.label === "Other" ? "muted" : ""}`}
              style={{ width: `${Math.max(1.5, (r.value / max) * 100)}%` }}
            />
          </span>
          <span className="rp-bar-val">
            {format(r.value)}
            {unit}
          </span>
          {hover === i && (
            <span className="rp-bar-tip" role="status">
              {r.label}: {format(r.value)}
              {unit} · {Math.round((r.value / sum) * 100)}% of total
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ---------- KPI tile with period delta ---------- */
export function Tile({ icon: Icon, label, value, delta, hint, tone = "" }) {
  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  return (
    <div className={`rp-tile ${tone}`}>
      <span className="rp-tile-ico">
        <Icon size={18} />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        {hasDelta ? (
          <em className={delta >= 0 ? "up" : "down"}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}% vs previous period
          </em>
        ) : hint ? (
          <em>{hint}</em>
        ) : null}
      </div>
    </div>
  );
}
export const delta = (cur, prev) =>
  prev ? Math.round(((cur - prev) / prev) * 100) : null;
