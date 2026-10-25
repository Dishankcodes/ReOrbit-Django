import React from "react";
import { Star } from "lucide-react";

export function Stars({ value = 0, size = 14 }) {
  return (
    <span className="dn-stars" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= Math.round(value) ? "is-on" : ""} />
      ))}
    </span>
  );
}

export function StarInput({ value, onChange }) {
  return (
    <div className="dn-starinput" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          type="button"
          key={n}
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          className={n <= value ? "is-on" : ""}
          onClick={() => onChange(n)}
        >
          <Star size={30} />
        </button>
      ))}
    </div>
  );
}
