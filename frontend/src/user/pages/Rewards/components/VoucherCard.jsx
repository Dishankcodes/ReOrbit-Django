import React from "react";
import { Link } from "react-router-dom";
import { Lock, Star, Ticket } from "lucide-react";
import { LEVELS } from "../../../data/rewardsStore";
import { formatDate } from "../../../utils/format";

/* A reward you can buy with points. */
export function RewardCard({ voucher, balance, levelIndex }) {
  const locked = levelIndex < voucher.level;
  const out = voucher.left <= 0 || voucher.paused;
  const short = balance < voucher.cost;
  const state = out ? "Unavailable" : locked ? `Reach ${LEVELS[voucher.level].name}` : short ? `${voucher.cost - balance} more points` : "Redeem";

  return (
    <article className={`rw-voucher ${out || locked ? "is-off" : ""}`}>
      <div className="rw-voucher-top">
        <span><Ticket size={20} /></span>
        <b><Star size={13} fill="currentColor" /> {voucher.cost.toLocaleString("en-IN")}</b>
      </div>
      <h3>{voucher.title}</h3>
      <p>{voucher.description}</p>
      <ul>
        {voucher.minOrder > 0 && <li>Min order ₹{voucher.minOrder.toLocaleString("en-IN")}</li>}
        <li>Valid till {formatDate(voucher.validTo)}</li>
      </ul>
      <Link to={`/user-orbit-points/rewards/${voucher.id}`} className={`dn-btn dn-btn--sm dn-btn--block ${out || locked || short ? "dn-btn--ghost" : ""}`}>
        {locked && <Lock size={13} />} {state}
      </Link>
    </article>
  );
}
