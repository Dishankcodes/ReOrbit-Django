import React, { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Coins, Gift, Ticket, Sparkles, Ticket as TicketIcon, ListChecks, HeartHandshake, Users, Receipt } from "lucide-react";

import { useVouchers, useUserPoints, useRedemptions, useDonationRewards } from "../../data/rewardsStore";
import useToast from "../../components/ui/useToast";
import VouchersTab from "./tabs/VouchersTab";
import RulesTab from "./tabs/RulesTab";
import DonationRewardsTab from "./tabs/DonationRewardsTab";
import UserPointsTab from "./tabs/UserPointsTab";
import RedemptionsTab from "./tabs/RedemptionsTab";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/users/AdminUserProfile.css";
import "../../css/products/AdminProducts.css";
import "../../css/orders/AdminOrders.css";
import "../../css/donations/AdminDonations.css";
import "../../css/rewards/AdminRewards.css";

const TABS = [
  { key: "vouchers", label: "Vouchers & coupons", icon: TicketIcon },
  { key: "rules", label: "Earning rules", icon: ListChecks },
  { key: "donations", label: "Donation rewards", icon: HeartHandshake },
  { key: "users", label: "User points", icon: Users },
  { key: "redemptions", label: "Redemptions", icon: Receipt },
];
const fmt = (n) => n.toLocaleString("en-IN");

export default function AdminRewards() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === params.get("tab")) ? params.get("tab") : "vouchers";
  const { toast, toastNode } = useToast();

  const vouchers = useVouchers();
  const balances = useUserPoints();
  const redemptions = useRedemptions();
  const donationRewards = useDonationRewards();

  const kpi = useMemo(() => ({
    circulation: balances.reduce((n, r) => n + r.balance, 0),
    donated: donationRewards.filter((r) => r.status === "Credited").reduce((n, r) => n + r.points, 0),
    active: vouchers.filter((v) => v.status === "Active").length,
    ending: vouchers.filter((v) => v.expiringSoon).length,
    redeemed: redemptions.filter((r) => r.status !== "Cancelled").length,
    spent: redemptions.filter((r) => r.status !== "Cancelled").reduce((n, r) => n + r.points, 0),
  }), [balances, donationRewards, vouchers, redemptions]);

  const badge = { vouchers: vouchers.length, donations: donationRewards.filter((r) => r.status === "Pending").length, redemptions: redemptions.filter((r) => r.status === "Issued").length };
  const go = (key) => setParams(key === "vouchers" ? {} : { tab: key }, { replace: true });

  return (
    <div className="au-page">
      <section className="ao-money" aria-label="Rewards summary">
        <div className="ao-money-card"><span className="ao-money-icon good"><Coins size={18} /></span><div><small>Points in circulation</small><strong>{fmt(kpi.circulation)}</strong><em>Across {balances.length} users</em></div></div>
        <button type="button" className="ao-money-card is-link" onClick={() => go("donations")}><span className="ao-money-icon good"><Gift size={18} /></span><div><small>Points from donations</small><strong>{fmt(kpi.donated)}</strong><em>Credited when a donation completes</em></div></button>
        <button type="button" className="ao-money-card is-link" onClick={() => go("vouchers")}><span className="ao-money-icon info"><Ticket size={18} /></span><div><small>Active vouchers & coupons</small><strong>{kpi.active}</strong><em>{kpi.ending ? `${kpi.ending} ending within a week` : "None ending soon"}</em></div></button>
        <button type="button" className="ao-money-card is-link" onClick={() => go("redemptions")}><span className="ao-money-icon wait"><Sparkles size={18} /></span><div><small>Redeemed with points</small><strong>{kpi.redeemed}</strong><em>{fmt(kpi.spent)} points spent</em></div></button>
      </section>

      <div className="aup-tabs rw-tabs" role="tablist" aria-label="Rewards sections">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} type="button" role="tab" id={`rw-tab-${t.key}`} aria-selected={tab === t.key} aria-controls="rw-tabpanel" className={tab === t.key ? "active" : ""} onClick={() => go(t.key)}>
              <Icon size={15} /> {t.label}
              {badge[t.key] > 0 && <span className="aup-tab-count">{badge[t.key]}</span>}
            </button>
          );
        })}
      </div>

      <div id="rw-tabpanel" role="tabpanel" aria-labelledby={`rw-tab-${tab}`}>
        {tab === "vouchers" && <VouchersTab toast={toast} />}
        {tab === "rules" && <RulesTab toast={toast} />}
        {tab === "donations" && <DonationRewardsTab toast={toast} />}
        {tab === "users" && <UserPointsTab toast={toast} />}
        {tab === "redemptions" && <RedemptionsTab toast={toast} />}
      </div>
      {toastNode}
    </div>
  );
}
