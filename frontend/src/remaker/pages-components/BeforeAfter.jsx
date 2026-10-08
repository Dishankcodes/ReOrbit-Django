import React, { useState } from "react";

/* Before / after comparison.
   - interactive: drag (or use arrow keys) to reveal more of either side
   - static: fixed split used on cards */
export default function BeforeAfter({
  before,
  after,
  title = "this work",
  interactive = false,
  initial = 50,
  className = "",
}) {
  const [position, setPosition] = useState(initial);

  return (
    <div
      className={`rpt-ba ${interactive ? "interactive" : "static"} ${className}`}
      style={{ "--pos": position }}
    >
      <img className="rpt-ba-after" src={after} alt={interactive ? `${title}, after` : ""} draggable="false" />
      <img className="rpt-ba-before" src={before} alt={interactive ? `${title}, before` : ""} draggable="false" />

      <span className="rpt-ba-line" aria-hidden="true">
        <i />
      </span>

      <span className="rpt-ba-label left">Before</span>
      <span className="rpt-ba-label right">After</span>

      {interactive && (
        <input
          className="rpt-ba-range"
          type="range"
          min="0"
          max="100"
          step="1"
          value={position}
          onChange={(event) => setPosition(Number(event.target.value))}
          aria-label={`Compare before and after for ${title}`}
          aria-valuetext={`${position} percent before`}
        />
      )}
    </div>
  );
}
