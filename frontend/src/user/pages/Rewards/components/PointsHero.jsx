import React from "react";
import { Link } from "react-router-dom";
import { Award, ChevronRight, Star } from "lucide-react";
import { LEVELS } from "../../../data/rewardsStore";

/* Balance + level progress. */
export default function PointsHero({ rewards, compact = false }) {
  const { balance, lifetime, level, next, progress, toNext } = rewards;
  const r = 52;
  const c = 2 * Math.PI * r;

  return (
    <section className={`rw-hero ${compact ? "is-compact" : ""}`}>
      <div className="rw-hero-main">
        <span className="dn-eyebrow">Your Orbit Points</span>
        <div className="rw-balance"><Star size={30} fill="currentColor" /> <strong>{balance.toLocaleString("en-IN")}</strong></div>
        <p>
          {next
            ? <><b>{toNext.toLocaleString("en-IN")} points</b> to reach <b>{next.name}</b></>
            : "You've reached the top level. Thank you for giving things a second life."}
        </p>
        {!compact && (
          <div className="rw-hero-actions">
            <Link to="/user-orbit-points/vouchers" className="dn-btn">Redeem rewards <ChevronRight size={15} /></Link>
            <Link to="/user-orbit-points/earn" className="dn-btn dn-btn--ghost">Ways to earn</Link>
          </div>
        )}
      </div>

      <div className="rw-ring" aria-label={`${progress}% to the next level`}>
        <svg viewBox="0 0 120 120" width="150" height="150" aria-hidden="true">
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="10" />
          <circle cx="60" cy="60" r={r} fill="none" stroke="#2a4d3a" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * progress) / 100} transform="rotate(-90 60 60)" />
        </svg>
        <div><Award size={20} /><b>{level.name}</b><small>{lifetime.toLocaleString("en-IN")} lifetime</small></div>
      </div>

      <ol className="rw-levels">
        {LEVELS.map((l) => (
          <li key={l.key} className={l.min <= lifetime ? "on" : ""}>
            <i /><span>{l.name}</span><small>{l.min.toLocaleString("en-IN")}</small>
          </li>
        ))}
      </ol>
    </section>
  );
}
