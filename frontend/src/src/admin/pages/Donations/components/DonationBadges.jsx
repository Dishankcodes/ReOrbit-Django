import React from "react";
import { Clock3, AlarmClock } from "lucide-react";

/* "Waiting 5 days" chip for donations nobody has reviewed yet. */
export function WaitChip({ donation }) {
  if (donation.status !== "Pending") return null;
  const d = donation.waitingDays;
  const tone = d >= 7 ? "late" : d >= 3 ? "slow" : "new";
  const Icon = d >= 3 ? AlarmClock : Clock3;
  return (
    <span className={`dn-wait ${tone}`}>
      <Icon size={12} />{" "}
      {d === 0 ? "Today" : `Waiting ${d} day${d === 1 ? "" : "s"}`}
    </span>
  );
}

export function ConditionTag({ condition }) {
  return (
    <span className={`dn-cond ${condition.toLowerCase()}`}>{condition}</span>
  );
}
