import React, { useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Gift, Heart, Leaf, Lock, Recycle, ShoppingBag, Star, Tag, Trophy, Users } from "lucide-react";

import { useRewards } from "../../data/rewardsStore";
import { formatDate } from "../../utils/format";
import PointsNav from "./components/PointsNav";

import "../../css/shared/ui-base.css";
import "../../css/rewards/rewards-base.css";

const ICONS = { leaf: Leaf, "shopping-bag": ShoppingBag, heart: Heart, gift: Gift, recycle: Recycle, users: Users, star: Star, tag: Tag, badge: BadgeCheck, trophy: Trophy };

export function BadgeIcon({ name, earned = false, size = 22 }) {
  const Icon = ICONS[name] || Trophy;
  return <span className={`rw-bicon ${earned ? "on" : ""}`}><Icon size={size} /></span>;
}

const FILTERS = [["all", "All"], ["earned", "Earned"], ["progress", "In progress"], ["locked", "Not started"]];

export default function UserBadges() {
  const { badges, earnedBadges } = useRewards();
  const [filter, setFilter] = useState("all");

  const rows = badges.filter((b) => {
    if (filter === "earned") return b.earned;
    if (filter === "progress") return !b.earned && b.value > 0;
    if (filter === "locked") return !b.earned && b.value === 0;
    return true;
  });

  return (
    <div className="dn rw">
      <PointsNav />
      <header className="rw-head">
        <div>
          <span className="dn-eyebrow">Achievements</span>
          <h1>Badges</h1>
          <p className="dn-muted">{earnedBadges} of {badges.length} earned. Badges unlock automatically as you make a difference.</p>
        </div>
        <div className="rw-badge-meter"><b>{Math.round((earnedBadges / badges.length) * 100)}%</b><i><b style={{ width: `${(earnedBadges / badges.length) * 100}%` }} /></i></div>
      </header>

      <div className="rw-chips solo" role="tablist">
        {FILTERS.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={filter === id} className={filter === id ? "on" : ""} onClick={() => setFilter(id)}>{label}</button>)}
      </div>

      <div className="rw-badges">
        {rows.map((b) => {
          const pct = Math.round((b.value / b.target) * 100);
          return (
            <Link key={b.id} to={`/user-badges/${b.id}`} className={`rw-badge ${b.earned ? "is-earned" : ""}`}>
              <BadgeIcon name={b.icon} earned={b.earned} size={26} />
              <h3>{b.title}</h3>
              <p>{b.text}</p>
              {b.earned ? (
                <span className="rw-badge-date">Earned {formatDate(b.earnedAt)}</span>
              ) : (
                <>
                  <i className="rw-bar"><b style={{ width: `${pct}%` }} /></i>
                  <small>{b.value.toLocaleString("en-IN")} / {b.target.toLocaleString("en-IN")}{b.value === 0 && <Lock size={12} />}</small>
                </>
              )}
            </Link>
          );
        })}
      </div>
      {rows.length === 0 && <p className="dn-muted">No badges in this view yet.</p>}
    </div>
  );
}
