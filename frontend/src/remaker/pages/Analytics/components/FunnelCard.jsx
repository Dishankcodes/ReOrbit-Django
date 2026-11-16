import React from "react";

import { fmtNumber } from "./format";

export default function FunnelCard({ funnel }) {
  const top = Math.max(...funnel.map((step) => step.value), 1);

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
          /* saves and orders are measured against views, completed orders against orders placed */
          const base = index === 0 ? null : funnel[index === 3 ? 2 : 0].value;
          const kept = base ? (step.value / base) * 100 : 0;
          const width = step.value ? Math.max((step.value / top) * 100, 4) : 0;

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
                  : `${kept.toFixed(kept < 10 ? 1 : 0)}% of ${index === 3 ? "orders placed" : "views"}`}
              </small>
            </li>
          );
        })}
      </ol>

      <p className="ana-foot">
        {funnel[0].value
          ? `${((funnel[2].value / funnel[0].value) * 100).toFixed(2)}% of views turn into an order.`
          : "Once shoppers start viewing your products, you will see how many turn into orders."}
      </p>
    </section>
  );
}
