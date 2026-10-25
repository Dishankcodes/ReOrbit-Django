import React from "react";

import { fmtNumber } from "./format";

export default function FunnelCard({ funnel }) {
  const top = funnel[0].value || 1;

  return (
    <section className="ana-card">
      <header className="ana-card-head">
        <div>
          <h3>From view to sale</h3>
          <p>How shoppers move through your products</p>
        </div>
      </header>

      <ol className="ana-funnel">
        {funnel.map((step, index) => {
          const previous = index === 0 ? null : funnel[index - 1].value;
          const kept = previous ? (step.value / previous) * 100 : 100;
          const width = Math.max((step.value / top) * 100, 4);

          return (
            <li key={step.key}>
              <div className="ana-funnel-top">
                <strong>{step.label}</strong>
                <span>{fmtNumber(step.value)}</span>
              </div>

              <div className="ana-funnel-bar">
                <i style={{ width: `${width}%` }} className={`step-${index}`} />
              </div>

              <small>
                {index === 0
                  ? "Everyone who opened a product"
                  : `${kept.toFixed(kept < 10 ? 1 : 0)}% of the step before`}
              </small>
            </li>
          );
        })}
      </ol>

      <p className="ana-foot">
        {((funnel[2].value / top) * 100).toFixed(2)}% of views turn into an order. Marketplace sellers usually see
        1 to 3%.
      </p>
    </section>
  );
}
