import React from "react";
import { Link } from "react-router-dom";
import { Gift, HandHeart, ShoppingBag, Star, Tag, UserPlus, Ticket } from "lucide-react";
import { formatDate } from "../../../utils/format";

const ICON = { purchase: ShoppingBag, donation: HandHeart, listing: Tag, review: Star, follow: UserPlus, spend: Ticket };

export default function LedgerRow({ entry }) {
  const Icon = ICON[entry.kind] || Gift;
  const gain = entry.points > 0;
  return (
    <Link to={entry.to} className="rw-row">
      <span className={`rw-row-icon ${gain ? "" : "spent"}`}><Icon size={18} /></span>
      <div><strong>{entry.title}</strong><small>{entry.detail}</small></div>
      <time>{formatDate(entry.at)}</time>
      <b className={gain ? "gain" : "loss"}>{gain ? "+" : "−"}{Math.abs(entry.points).toLocaleString("en-IN")}</b>
    </Link>
  );
}
