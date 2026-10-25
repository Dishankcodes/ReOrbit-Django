import React from "react";
import { STATUS_META } from "../../../data/donationsStore";

export function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.Pending;
  return (
    <span className={`dn-badge dn-badge--${meta.tone}`}>{meta.label}</span>
  );
}

const CONDITION_TONE = { Good: "green", Medium: "amber", Worst: "red" };
const CONDITION_LABEL = {
  Good: "Good",
  Medium: "Medium",
  Worst: "Needs repair",
};

export function ConditionBadge({ condition }) {
  return (
    <span
      className={`dn-badge dn-badge--${CONDITION_TONE[condition] || "grey"}`}
    >
      {CONDITION_LABEL[condition] || condition}
    </span>
  );
}
