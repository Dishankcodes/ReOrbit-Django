import React from "react";
import { BellRing, Clock3, Tag, Ban } from "lucide-react";

/* "Unsold 7+ days" / "Slow moving" / "Dead stock" chip. */
export function AlertChip({ stock, compact = false }) {
  if (!stock.alert) {
    return null;
  }
  const Icon = stock.alert.key === "dead" ? Ban : BellRing;
  return (
    <span className={`aw-alert-chip lvl-${stock.alert.key}`}>
      <Icon size={12} />{" "}
      {compact ? `${stock.daysListed}d unsold` : stock.alert.label}
    </span>
  );
}

/* Where the item is in the sales cycle. */
export function SaleChip({ stock }) {
  if (stock.warehouse_status === "Refurbishment")
    return <span className="aw-sale">With ReMaker</span>;
  const map = {
    Listed: { text: "On sale", icon: Tag },
    "Not listed": { text: "Not listed", icon: Clock3 },
    Sold: { text: "Sold", icon: Tag },
    Donated: { text: "Donated", icon: Tag },
  };
  const m = map[stock.sale_status];
  return (
    <span
      className={`aw-sale s-${stock.sale_status.replace(" ", "-").toLowerCase()}`}
    >
      {m.text}
    </span>
  );
}

/* Days in stock as a small ageing bar (full at 30 days). */
export function AgeBar({ stock }) {
  const days =
    stock.sale_status === "Listed" && stock.warehouse_status === "Stored"
      ? stock.daysListed
      : stock.daysInStock;
  const pct = Math.min(100, (days / 30) * 100);
  const lvl = stock.alert
    ? stock.alert.key
    : stock.snoozed
      ? "snoozed"
      : days >= 4 && stock.sale_status === "Listed"
        ? "risk"
        : "ok";
  return (
    <div className="aw-age">
      <strong>{days}d</strong>
      <span className="aw-age-track">
        <i className={`lvl-${lvl}`} style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}
