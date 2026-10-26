import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Gift, ShoppingBag, Trophy, History, Wallet, TrendingUp } from "lucide-react";

import { VOUCHERS, WAYS_TO_EARN, useRewards } from "../../data/rewardsStore";
import { kg } from "../../utils/format";
import PointsHero from "./components/PointsHero";
import PointsNav from "./components/PointsNav";
import LedgerRow from "./components/LedgerRow";
import { RewardCard } from "./components/VoucherCard";
import { BadgeIcon } from "./UserBadges";

import "../../css/shared/ui-base.css";
import "../../css/rewards/rewards-base.css";

export default function UserOrbitPoints() {
  const rewards = useRewards();
  const { ledger, balance, levelIndex, badges, earnedBadges, lifetime } = rewards;
  const spent = ledger.filter((e) => e.points < 0).reduce((n, e) => n + Math.abs(e.points), 0);
  const claimable = VOUCHERS.filter((v) => v.kind === "points" && v.left > 0 && !v.paused).slice(0, 3);
  const nextBadges = badges.filter((b) => !b.earned).sort((a, b) => b.value / b.target - a.value / a.target).slice(0, 3);

  return (
    <div className="dn rw">
      <PointsNav />
      <PointsHero rewards={rewards} />

      <section className="rw-stats">
        <article><span><TrendingUp size={18} /></span><div><strong>{lifetime.toLocaleString("en-IN")}</strong><small>Lifetime points</small></div></article>
        <article><span><Wallet size={18} /></span><div><strong>{spent.toLocaleString("en-IN")}</strong><small>Points redeemed</small></div></article>
        <article><span><ShoppingBag size={18} /></span><div><strong>{rewards.counts.delivered}</strong><small>Orders delivered</small></div></article>
        <article><span><Trophy size={18} /></span><div><strong>{earnedBadges}/{badges.length}</strong><small>Badges earned</small></div></article>
      </section>

      <div className="rw-two">
        <section className="dn-card dn-card-pad">
          <div className="dn-card-head">
            <div><h2>Recent activity</h2><small>Points added and spent</small></div>
            <Link to="/user-orbit-points/history" className="dn-link">See all <ChevronRight size={14} /></Link>
          </div>
          <div className="rw-rows">{ledger.slice(0, 6).map((e) => <LedgerRow key={e.id} entry={e} />)}</div>
        </section>

        <section className="dn-card dn-card-pad">
          <div className="dn-card-head">
            <div><h2>Next badges</h2><small>You're closest to these</small></div>
            <Link to="/user-badges" className="dn-link">All <ChevronRight size={14} /></Link>
          </div>
          <div className="rw-next">
            {nextBadges.map((b) => (
              <Link key={b.id} to={`/user-badges/${b.id}`} className="rw-next-item">
                <BadgeIcon name={b.icon} />
                <div>
                  <strong>{b.title}</strong>
                  <i><b style={{ width: `${Math.round((b.value / b.target) * 100)}%` }} /></i>
                  <small>{b.value.toLocaleString("en-IN")} of {b.target.toLocaleString("en-IN")}</small>
                </div>
              </Link>
            ))}
            {nextBadges.length === 0 && <p className="dn-muted">You've earned every badge. Amazing!</p>}
          </div>
        </section>
      </div>

      <section>
        <div className="rw-section-head">
          <div><h2>Rewards you can claim</h2><p className="dn-muted">Spend your points on vouchers.</p></div>
          <Link to="/user-orbit-points/vouchers" className="dn-link">All rewards <ChevronRight size={14} /></Link>
        </div>
        <div className="rw-vouchers">{claimable.map((v) => <RewardCard key={v.id} voucher={v} balance={balance} levelIndex={levelIndex} />)}</div>
      </section>

      <section className="rw-earn-strip">
        <div><Gift size={22} /><h3>Earn more points</h3><p>Buy, donate, sell, review and follow ReMakers.</p></div>
        <ul>
          {WAYS_TO_EARN.slice(0, 4).map((w) => <li key={w.id}><b>{w.points}</b><span>{w.title}</span></li>)}
        </ul>
        <Link to="/user-orbit-points/earn" className="dn-btn dn-btn--ghost">See all ways <ChevronRight size={15} /></Link>
      </section>
      
    </div>
  );
}
