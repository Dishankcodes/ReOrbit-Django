import React from "react";

export default function Heatmap({ heatmap }) {
  const { days, blocks, cells, max, best } = heatmap;

  return (
    <section className="ana-card">
      <header className="ana-card-head">
        <div>
          <h3>When customers order</h3>
          <p>Darker squares mean more orders at that time</p>
        </div>

        <div className="ana-best">
          <small>Busiest time</small>
          <strong>
            {best.day}, {best.block}
          </strong>
        </div>
      </header>

      <div
        className="ana-heat"
        role="table"
        aria-label="Orders by day and time of day"
      >
        <div className="ana-heat-corner" />
        {blocks.map((block) => (
          <span className="ana-heat-col" role="columnheader" key={block}>
            {block}
          </span>
        ))}

        {days.map((day, d) => (
          <React.Fragment key={day}>
            <span className="ana-heat-row" role="rowheader">
              {day}
            </span>

            {blocks.map((block, b) => {
              const value = cells[d][b];
              const level = value / max;

              return (
                <span
                  className={`ana-heat-cell ${level > 0.62 ? "dark" : ""} ${
                    best.day === day && best.block === block ? "best" : ""
                  }`}
                  style={{ "--level": level.toFixed(2) }}
                  role="cell"
                  title={`${day}, ${block}: about ${Math.round(value)} orders`}
                  key={block}
                >
                  {value >= 1 ? Math.round(value) : ""}
                </span>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      <div className="ana-heat-scale" aria-hidden="true">
        <span>Fewer</span>
        <i />
        <span>More</span>
      </div>
    </section>
  );
}
