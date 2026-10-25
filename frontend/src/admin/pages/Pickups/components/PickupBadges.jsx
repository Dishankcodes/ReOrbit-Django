import React from "react";
import { Gift, Package, AlarmClock, CalendarCheck2, CalendarClock } from "lucide-react";

export function TypeChip({ type }) {
  const Icon = type === "Donation" ? Gift : Package;
  return <span className={`pk-type ${type.toLowerCase()}`}><Icon size={11} /> {type}</span>;
}

/* Overdue / Today / Tomorrow chip for scheduled pickups. */
export function DueChip({ pickup }) {
  const due = pickup.due;
  if (!due) return null;
  const Icon = due.key === "overdue" ? AlarmClock : due.key === "today" ? CalendarCheck2 : CalendarClock;
  return <span className={`pk-due ${due.key}`}><Icon size={12} /> {due.label}</span>;
}
