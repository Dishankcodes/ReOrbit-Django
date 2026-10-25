import React from "react";

import { RANGES } from "../../../data/analyticsData";

export default function RangeTabs({ value, onChange }) {
  return (
    <div className="ana-range" role="tablist" aria-label="Date range">
      {RANGES.map((range) => (
        <button
          type="button"
          role="tab"
          aria-selected={value === range.key}
          className={value === range.key ? "active" : ""}
          key={range.key}
          onClick={() => onChange(range.key)}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
