import React from "react";

import { fmtPercent, formatPrice } from "./format";

const COLORS = ["#270809", "#08271f", "#7c9a8d", "#c1c8c4", "#a46d25"];

export default function DonutCard({ categories }) {
  const total = categories.reduce((sum, item) => sum + item.revenue, 0);
  let offset = 0;

  return (
    <section className="ana-card">
      <header className="ana-card-head">
        <div>
          <h3>Earnings by category</h3>
          <p>Where your money comes from</p>
        </div>
      </header>

      <div className="ana-donut-wrap">
        <div
          className="ana-donut"
          role="img"
          aria-label="Share of earnings by category"
        >
          <svg viewBox="0 0 42 42" aria-hidden="true">
            <circle
              cx="21"
              cy="21"
              r="15.9155"
              fill="none"
              stroke="#f4f1ef"
              strokeWidth="6"
            />
            {categories.map((item, index) => {
              const dash = (item.share / 100) * 100;
              const circle = (
                <circle
                  key={item.name}
                  cx="21"
                  cy="21"
                  r="15.9155"
                  fill="none"
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth="6"
                  strokeDasharray={`${Math.max(dash - 0.6, 0)} ${100 - Math.max(dash - 0.6, 0)}`}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 21 21)"
                />
              );
              offset += dash;
              return circle;
            })}
          </svg>

          <div className="ana-donut-center">
            <small>Total</small>
            <strong>{formatPrice(total)}</strong>
          </div>
        </div>

        <ul className="ana-legend">
          {categories.map((item, index) => (
            <li key={item.name}>
              <i style={{ background: COLORS[index % COLORS.length] }} />
              <span>{item.name}</span>
              <b>{fmtPercent(item.share, 0)}</b>
              <small>{formatPrice(item.revenue)}</small>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
