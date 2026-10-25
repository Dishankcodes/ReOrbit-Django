import React, { useMemo, useRef, useState } from "react";

import { fmtCompact, fmtNumber, formatPrice, niceMax } from "./format";

const METRICS = [
  {
    key: "revenue",
    label: "Earnings",
    unit: "₹",
    format: (v) => formatPrice(v),
    axis: (v) => `₹${fmtCompact(v)}`,
  },
  {
    key: "orders",
    label: "Orders",
    unit: "",
    format: (v) => fmtNumber(v),
    axis: (v) => fmtCompact(v),
  },
  {
    key: "views",
    label: "Product views",
    unit: "",
    format: (v) => fmtNumber(v),
    axis: (v) => fmtCompact(v),
  },
];

export default function TrendChart({ series, rangeLabel }) {
  const [metric, setMetric] = useState("revenue");
  const [hover, setHover] = useState(null);
  const stage = useRef(null);

  const config = METRICS.find((item) => item.key === metric);
  const values = series.map((point) => point[metric]);
  const count = values.length;

  const max = niceMax(Math.max(...values, 1));
  const total = values.reduce((a, b) => a + b, 0);
  const average = count ? total / count : 0;
  const peakIndex = values.indexOf(Math.max(...values));

  const geometry = useMemo(() => {
    const x = (i) => (count === 1 ? 50 : (i / (count - 1)) * 100);
    const y = (v) => 100 - (v / max) * 100;
    const points = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");

    return { x, y, points };
  }, [values, count, max]);

  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const step = Math.max(1, Math.ceil(count / 8));

  const handleMove = (event) => {
    const box = stage.current?.getBoundingClientRect();
    if (!box) return;

    const ratio = Math.min(
      1,
      Math.max(0, (event.clientX - box.left) / box.width),
    );
    setHover(Math.round(ratio * (count - 1)));
  };

  const active = hover !== null ? hover : null;

  return (
    <section className="ana-card ana-trend">
      <header className="ana-card-head">
        <div>
          <h3>Performance over time</h3>
          <p>{rangeLabel}</p>
        </div>

        <div className="ana-metric-tabs" role="tablist" aria-label="Metric">
          {METRICS.map((item) => (
            <button
              type="button"
              role="tab"
              aria-selected={metric === item.key}
              className={metric === item.key ? "active" : ""}
              key={item.key}
              onClick={() => setMetric(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <dl className="ana-trend-stats">
        <div>
          <dt>Total</dt>
          <dd>{config.format(total)}</dd>
        </div>
        <div>
          <dt>Average per {count > 14 ? "period" : "day"}</dt>
          <dd>{config.format(Math.round(average))}</dd>
        </div>
        <div>
          <dt>Best period</dt>
          <dd>
            {config.format(values[peakIndex] || 0)}{" "}
            <small>{series[peakIndex]?.label}</small>
          </dd>
        </div>
      </dl>

      <div className="ana-chart">
        <div className="ana-yaxis" aria-hidden="true">
          {[...ticks].reverse().map((tick) => (
            <span key={tick}>{config.axis(max * tick)}</span>
          ))}
        </div>

        <div
          className="ana-stage"
          ref={stage}
          onPointerMove={handleMove}
          onPointerLeave={() => setHover(null)}
          role="img"
          aria-label={`${config.label} chart for ${rangeLabel}. Total ${config.format(total)}.`}
        >
          {ticks.map((tick) => (
            <i
              className="ana-grid"
              style={{ bottom: `${tick * 100}%` }}
              key={tick}
            />
          ))}

          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="anaFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#270809" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#270809" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon
              points={`0,100 ${geometry.points} 100,100`}
              fill="url(#anaFill)"
            />
            <polyline
              points={geometry.points}
              className="ana-line"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {active !== null && (
            <>
              <span
                className="ana-cursor"
                style={{ left: `${geometry.x(active)}%` }}
              />
              <span
                className="ana-dot"
                style={{
                  left: `${geometry.x(active)}%`,
                  bottom: `${100 - geometry.y(values[active])}%`,
                }}
              />
              <div
                className={`ana-tip ${geometry.x(active) > 70 ? "left" : ""}`}
                style={{
                  left: `${geometry.x(active)}%`,
                  bottom: `${100 - geometry.y(values[active])}%`,
                }}
              >
                <small>{series[active].label}</small>
                <strong>{config.format(values[active])}</strong>
              </div>
            </>
          )}
        </div>

        <div className="ana-xaxis" aria-hidden="true">
          {series.map((point, i) => (
            <span
              key={point.label + i}
              className={i % step === 0 ? "show" : ""}
            >
              {point.short}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
