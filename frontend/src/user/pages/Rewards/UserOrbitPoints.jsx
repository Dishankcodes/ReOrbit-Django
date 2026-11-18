import React from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  Gift,
  ShoppingBag,
  Trophy,
  History,
  Wallet,
  TrendingUp,
} from "lucide-react";

import { LEVELS, useRewards, useWaysToEarn } from "../../data/rewardsStore";
import { useVoucherList } from "../../../shared/rewardRules";
import { kg } from "../../utils/format";
import { PageLoader } from "../../../shared/components/Spinner";
import PointsHero from "./components/PointsHero";
import PointsNav from "./components/PointsNav";
import LedgerRow from "./components/LedgerRow";
import { RewardCard } from "./components/VoucherCard";
import { BadgeIcon } from "./UserBadges";

import "../../css/shared/ui-base.css";
import "../../css/rewards/rewards-base.css";

export default function UserOrbitPoints() {
  const rewards = useRewards();
  const vouchers = useVoucherList();
  const ways = useWaysToEarn();
  const { ledger, balance, levelIndex, badges, earnedBadges, lifetime } =
    rewards;
  const spent = rewards.spent;
  const claimable = vouchers
    .filter((v) => v.kind === "points" && v.left > 0 && !v.paused)
    .slice(0, 3);
  const nextBadges = badges
    .filter((b) => !b.earned)
    .sort((a, b) => b.value / b.target - a.value / a.target)
    .slice(0, 3);

  if (!rewards.loaded) {
    return (
      <div className="dn rw">
        <PointsNav />
        {rewards.error ? (
          <p className="dn-error" role="alert">
            {rewards.error}
          </p>
        ) : (
          <PageLoader label="Loading your Orbit Points…" />
        )}
      </div>
    );
  }

  return (
    <div className="dn rw">
      <PointsNav />
      <PointsHero rewards={rewards} />

      <section className="urw-stats">
        <article>
          <span>
            <TrendingUp size={18} />
          </span>
          <div>
            <strong>{lifetime.toLocaleString("en-IN")}</strong>
            <small>Lifetime points</small>
          </div>
        </article>
        <article>
          <span>
            <Wallet size={18} />
          </span>
          <div>
            <strong>{spent.toLocaleString("en-IN")}</strong>
            <small>Points redeemed</small>
          </div>
        </article>
        <article>
          <span>
            <ShoppingBag size={18} />
          </span>
          <div>
            <strong>{rewards.counts.delivered}</strong>
            <small>Orders delivered</small>
          </div>
        </article>
        <article>
          <span>
            <Trophy size={18} />
          </span>
          <div>
            <strong>
              {earnedBadges}/{badges.length}
            </strong>
            <small>Badges earned</small>
          </div>
        </article>
      </section>

      <div className="urw-two">
        <section className="dn-card dn-card-pad">
          <div className="dn-card-head">
            <div>
              <h2>Recent activity</h2>
              <small>Points added and spent</small>
            </div>
            <Link to="/user-orbit-points/history" className="dn-link">
              See all <ChevronRight size={14} />
            </Link>
          </div>
          <div className="urw-rows">
            {ledger.slice(0, 6).map((e) => (
              <LedgerRow key={e.id} entry={e} />
            ))}
            {ledger.length === 0 && (
              <p className="dn-muted">
                No points yet. You earn them when an order is delivered, a donation is received, or you
                review what you bought.
              </p>
            )}
          </div>
        </section>

        <section className="dn-card dn-card-pad">
          <div className="dn-card-head">
            <div>
              <h2>Next badges</h2>
              <small>You're closest to these</small>
            </div>
            <Link to="/user-badges" className="dn-link">
              All <ChevronRight size={14} />
            </Link>
          </div>
          <div className="urw-next">
            {nextBadges.map((b) => (
              <Link
                key={b.id}
                to={`/user-badges/${b.id}`}
                className="urw-next-item"
              >
                <BadgeIcon name={b.icon} />
                <div>
                  <strong>{b.title}</strong>
                  <i>
                    <b
                      style={{
                        width: `${Math.round((b.value / b.target) * 100)}%`,
                      }}
                    />
                  </i>
                  <small>
                    {b.value.toLocaleString("en-IN")} of{" "}
                    {b.target.toLocaleString("en-IN")}
                  </small>
                </div>
              </Link>
            ))}
            {nextBadges.length === 0 && (
              <p className="dn-muted">You've earned every badge. Amazing!</p>
            )}
          </div>
        </section>
      </div>

      <section>
        <div className="urw-section-head">
          <div>
            <h2>Rewards you can claim</h2>
            <p className="dn-muted">Spend your points on vouchers.</p>
          </div>
          <Link to="/user-orbit-points/vouchers" className="dn-link">
            All rewards <ChevronRight size={14} />
          </Link>
        </div>
        <div className="urw-vouchers">
          {claimable.map((v) => (
            <RewardCard
              key={v.id}
              voucher={v}
              balance={balance}
              levelIndex={levelIndex}
            />
          ))}
        </div>
        {claimable.length === 0 && (
          <p className="dn-muted">No rewards are on offer right now. New ones appear here when ReOrbit adds them.</p>
        )}
      </section>

      <LevelGuide levelIndex={levelIndex} lifetime={lifetime} offers={vouchers} />

      <section className="urw-earn-strip">
        <div>
          <Gift size={22} />
          <h3>Earn more points</h3>
          <p>Buy, donate, sell, review and follow ReMakers.</p>
        </div>
        <ul>
          {ways.slice(0, 4).map((w) => (
            <li key={w.id}>
              <b>{w.points}</b>
              <span>{w.title}</span>
            </li>
          ))}
        </ul>
        <Link to="/user-orbit-points/earn" className="dn-btn dn-btn--ghost">
          See all ways <ChevronRight size={15} />
        </Link>
      </section>
    </div>
  );
}

/* What each level means and what it unlocks. Rewards and coupons can be set for a minimum level
   by the ReOrbit team; the counts below are the ones on offer right now. */
function LevelGuide({ levelIndex, lifetime, offers }) {
  const perLevel = LEVELS.map((_, i) => offers.filter((o) => (o.level || 0) === i && !o.paused).length);
  return (
    <section className="urw-lvguide" aria-labelledby="urw-lvguide-title">
      <div className="urw-lvguide-head">
        <h3 id="urw-lvguide-title">What the levels mean</h3>
        <p>
          Your level follows your <b>lifetime</b> points ({lifetime.toLocaleString("en-IN")} so far). Spending points
          on rewards never moves you down.
        </p>
      </div>
      <ol className="urw-lvguide-list">
        {LEVELS.map((l, i) => {
          const state = i < levelIndex ? "done" : i === levelIndex ? "now" : "next";
          return (
            <li key={l.key} className={`is-${state}`}>
              <span className="urw-lvguide-dot" aria-hidden="true">
                {i + 1}
              </span>
              <div>
                <header>
                  <strong>{l.name}</strong>
                  <small>{l.min ? `${l.min.toLocaleString("en-IN")}+ lifetime points` : "From your first day"}</small>
                  {state === "now" && <em>You are here</em>}
                </header>
                <p>{l.meaning}</p>
                <ul>
                  <li>{l.perk}</li>
                  {i > 0 && (
                    <li>
                      {perLevel[i]
                        ? `${perLevel[i]} reward${perLevel[i] === 1 ? "" : "s"} on offer for this level right now`
                        : "Level-only rewards appear here when ReOrbit adds them"}
                    </li>
                  )}
                  <li>Your level shows on your profile and dashboard</li>
                </ul>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
