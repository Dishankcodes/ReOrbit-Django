import React from "react";

import { timeLabel } from "../../../data/jobsStore";

export default function ProgressLog({ items }) {
  if (items.length === 0) {
    return (
      <p className="job-muted">
        No updates yet. Add photos and notes as you work so the warehouse team
        can follow along.
      </p>
    );
  }

  return (
    <ol className="job-log">
      {[...items].reverse().map((entry) => (
        <li key={entry.id}>
          <span className="job-dot" aria-hidden="true" />
          <div>
            <time dateTime={entry.at}>{timeLabel(entry.at)}</time>
            <p>{entry.text}</p>
            {entry.photo && <img src={entry.photo} alt="Progress photo" />}
          </div>
        </li>
      ))}
    </ol>
  );
}
