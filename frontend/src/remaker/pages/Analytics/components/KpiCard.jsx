import React from "react";

import { fmtDelta } from "./format";

/* Tiny line under the number. Stretches to fill the card. */
function Sparkline({ values }) {
  if (!values || values.length < 2) return null;

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;

  const points = values
    .map((value, i) => `${(i / (values.length - 1)) * 100},${92 - ((value - min) / span) * 84}`)
    .join(" ");

  return (
    <svg className="ana-spark" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <polygon points={`0,100 ${points} 100,100`} className="area" />
      <polyline points={points} className="line" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function KpiCard({ label, value, hint, delta, series, tone = "default", lowerIsBetter = false }) {
  const hasDelta = delta !== null && delta !== undefined && !Number.isNaN(delta);
  const good = hasDelta && (lowerIsBetter ? delta <= 0 : delta >= 0);

  return (
    <article className={`ana-kpi ${tone}`}>
      <header>
        <span>{label}</span>
        {hasDelta && (
          <em className={good ? "up" : "down"} title="Compared with the period before">
            {delta >= 0 ? "▲" : "▼"} {fmtDelta(Math.abs(delta)).replace("+", "")}
          </em>
        )}
      </header>

      <strong>{value}</strong>
      {hint && <small>{hint}</small>}

      <Sparkline values={series} />
    </article>
  );
}
