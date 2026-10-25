import React from "react";

/* Horizontal bars: traffic sources, buyer cities */
export default function BarList({ title, subtitle, items, valueLabel, sideLabel }) {
  const max = Math.max(...items.map((item) => item.percent), 1);

  return (
    <section className="ana-card">
      <header className="ana-card-head">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </header>

      <ul className="ana-bars">
        {items.map((item) => (
          <li key={item.key || item.city}>
            <div className="ana-bars-top">
              <span>
                {item.label || item.city}
                {item.state && <small>{item.state}</small>}
              </span>
              <b>{valueLabel(item)}</b>
            </div>

            <div className="ana-bar-track">
              <i style={{ width: `${(item.percent / max) * 100}%` }} />
            </div>

            {sideLabel && <small>{sideLabel(item)}</small>}
          </li>
        ))}
      </ul>
    </section>
  );
}
