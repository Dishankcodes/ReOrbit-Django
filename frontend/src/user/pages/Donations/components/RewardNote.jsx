import React from "react";
import { Star } from "lucide-react";
import { VOUCHER_MIN } from "../../../data/donationsStore";

/* What the donor will get, said the same way everywhere. ReOrbit decides the reward:
   - before it's accepted: at least a ₹100 voucher plus Orbit Points once accepted
   - accepted: what ReOrbit set (if it did), still credited when it reaches the warehouse
   - received: what was actually credited.
   Pass no donation for the "review and submit" step. */
export function rewardText(donation) {
  const min = donation?.voucherMin || VOUCHER_MIN;
  const status = donation?.status || "Pending";
  if (status === "Rejected" || status === "Cancelled") return null;

  if (status === "Received" || status === "Completed") {
    const v = donation.reward?.voucher;
    return {
      title: `You earned ${v ? `a ₹${v.amount} voucher` : "your voucher"} and ${donation.reward?.points || 0} Orbit Points`,
      text: v?.code
        ? `Voucher ${v.code} works on any marketplace order. Find it in Rewards & Vouchers.`
        : "Find your voucher in Rewards & Vouchers.",
    };
  }

  const p = donation?.promised;
  if (status !== "Pending" && p && (p.voucher_amount != null || p.points != null)) {
    const voucher = p.voucher_amount != null ? `a ₹${p.voucher_amount} voucher` : `a voucher of at least ₹${min}`;
    const points = p.points != null ? `${p.points} Orbit Points` : "Orbit Points";
    return {
      title: `ReOrbit has set your reward: ${voucher} and ${points}`,
      text: "It's credited as soon as your item reaches our warehouse and we've checked it.",
    };
  }

  if (status !== "Pending") {
    return {
      title: `Accepted! You'll get a voucher of at least ₹${min} plus Orbit Points`,
      text: "Our team sets the exact amount when your item reaches the warehouse. Bigger donations and items in better condition earn more.",
    };
  }

  return {
    title: `Once ReOrbit accepts your donation, you'll get a voucher of at least ₹${min} plus Orbit Points`,
    text: "Our team decides the final reward after checking your item. Bigger donations and items in better condition earn more. The voucher works on any marketplace order.",
  };
}

export default function RewardNote({ donation = null, className = "" }) {
  const t = rewardText(donation);
  if (!t) return null;
  return (
    <div className={`dn-banner ${className}`}>
      <Star size={18} />
      <div>
        <strong>{t.title}</strong>
        {t.text}
      </div>
    </div>
  );
}
