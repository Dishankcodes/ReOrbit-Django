import React from "react";

export default function Stars({ value, size = 16 }) {
  return (
    <span className="rvp-stars" role="img" aria-label={`${value.toFixed ? Number(value.toFixed(1)) : value} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg key={star} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={star <= Math.round(value) ? "on" : ""}>
          <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8L12 2.5z" />
        </svg>
      ))}
    </span>
  );
}
