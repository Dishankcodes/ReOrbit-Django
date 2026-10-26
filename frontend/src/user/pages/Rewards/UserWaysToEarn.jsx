import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Gift, HandHeart, ShoppingBag, Tag, Users } from "lucide-react";

import { LEVELS, WAYS_TO_EARN, useRewards } from "../../data/rewardsStore";
import PointsNav from "./components/PointsNav";

import "../../css/shared/ui-base.css";
import "../../css/rewards/rewards-base.css";

const ICON = { Buying: ShoppingBag, Donating: HandHeart, Community: Users };

export default function UserWaysToEarn() {
  const { lifetime, levelIndex } = useRewards();
  const groups = [...new Set(WAYS_TO_EARN.map((w) => w.group))];

  return (
    <div className="dn rw">
      <PointsNav />
      <header className="rw-head">
        <div>
          <span className="dn-eyebrow">Orbit Points</span>
          <h1>Ways to earn</h1>
          <p className="dn-muted">Every sustainable action adds up. Points never expire.</p>
        </div>
        <Link to="/user-orbit-points/vouchers" className="dn-btn"><Gift size={16} /> Spend points</Link>
      </header>

      {groups.map((g) => {
        const Icon = ICON[g] || Tag;
        return (
          <section key={g} className="rw-group">
            <h3><Icon size={18} /> {g}</h3>
            <div className="rw-earn-grid">
              {WAYS_TO_EARN.filter((w) => w.group === g).map((w) => (
                <article key={w.id} className="dn-card rw-earn">
                  <span className="rw-earn-pts">{w.points}</span>
                  <h4>{w.title}</h4>
                  <p>{w.text}</p>
                  <Link to={w.path} className="dn-link">{w.cta} <ArrowRight size={14} /></Link>
                </article>
              ))}
            </div>
          </section>
        );
      })}

      <section className="dn-card dn-card-pad">
        <div className="dn-card-head"><div><h2>Levels</h2><small>You've earned {lifetime.toLocaleString("en-IN")} points in total</small></div></div>
        <ol className="rw-level-list">
          {LEVELS.map((l, i) => (
            <li key={l.key} className={i <= levelIndex ? "on" : ""}>
              <span>{i + 1}</span>
              <div><strong>{l.name}</strong><small>{l.min.toLocaleString("en-IN")}+ lifetime points</small></div>
              <em>{l.perk}</em>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
