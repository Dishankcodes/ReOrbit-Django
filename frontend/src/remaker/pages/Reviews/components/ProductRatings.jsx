import React from "react";

import Stars from "./Stars";

/* Side card: average rating per product, click one to filter */
export default function ProductRatings({ items, active, onSelect }) {
  return (
    <section className="rvp-side-card">
      <h3>Rating by product</h3>

      <ul className="rvp-prods">
        {items.map((item) => (
          <li key={item.productId}>
            <button
              type="button"
              className={active === item.productId ? "active" : ""}
              aria-pressed={active === item.productId}
              onClick={() => onSelect(active === item.productId ? "all" : item.productId)}
            >
              <img src={item.image} alt="" />
              <span>
                <strong>{item.title}</strong>
                <small>
                  {item.count} {item.count === 1 ? "review" : "reviews"}
                </small>
              </span>
              <b>
                {item.average.toFixed(1)}
                <Stars value={item.average} size={12} />
              </b>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
