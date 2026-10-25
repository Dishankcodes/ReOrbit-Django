import React, { useMemo } from "react";
import { Clock } from "lucide-react";
import { SLOTS } from "../../../data/donationsStore";
import { toDateInput, relativeDay } from "../../../utils/format";

const DAY = 86400000;
const WEEKDAY = new Intl.DateTimeFormat("en-IN", { weekday: "short" });
const MONTH = new Intl.DateTimeFormat("en-IN", { month: "short" });

/* Next 14 days starting tomorrow. Sundays are off (no pickups). */
function buildDays() {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date(base.getTime() + (index + 1) * DAY);
    return { value: toDateInput(date), date, off: date.getDay() === 0 };
  });
}

export default function DateSlotPicker({ date, slot, onDate, onSlot, error }) {
  const days = useMemo(buildDays, []);
  const visible = days.slice(0, 14);

  return (
    <div className="dn-field" style={{ gap: 14 }}>
      <div className="dn-field">
        <span className="dn-label">
          Pickup date <em>*</em>
        </span>
        <div className="dn-dates" role="radiogroup" aria-label="Pickup date">
          {visible.map((day) => (
            <button
              type="button"
              key={day.value}
              role="radio"
              aria-checked={date === day.value}
              disabled={day.off}
              className={`dn-date ${date === day.value ? "is-active" : ""}`}
              onClick={() => onDate(day.value)}
            >
              <small>{WEEKDAY.format(day.date)}</small>
              <strong>{day.date.getDate()}</strong>
              <span>{day.off ? "No pickups" : MONTH.format(day.date)}</span>
            </button>
          ))}
        </div>
        {date && (
          <span className="dn-hint">
            {relativeDay(`${date}T09:00:00`)} · pickups are never charged.
          </span>
        )}
      </div>

      <div className="dn-field">
        <span className="dn-label">
          Time slot <em>*</em>
        </span>
        <div className="dn-slots" role="radiogroup" aria-label="Time slot">
          {SLOTS.map((item) => (
            <button
              type="button"
              key={item}
              role="radio"
              aria-checked={slot === item}
              className={`dn-slot ${slot === item ? "is-active" : ""}`}
              onClick={() => onSlot(item)}
            >
              <Clock size={15} />
              {item}
            </button>
          ))}
        </div>
      </div>

      {error && <span className="dn-error">{error}</span>}
    </div>
  );
}
