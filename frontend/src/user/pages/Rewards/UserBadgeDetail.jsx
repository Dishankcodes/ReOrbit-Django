import React from "react";
import { Link, useParams } from "react-router-dom";
import { Award, CheckCircle2, Share2, Trophy } from "lucide-react";

import { useRewards } from "../../data/rewardsStore";
import { formatLongDate } from "../../utils/format";
import Crumbs from "../../components/ui/Crumbs";
import EmptyState from "../../components/ui/EmptyState";
import useToast from "../../components/ui/useToast";
import { BadgeIcon } from "./UserBadges";

import "../../css/shared/ui-base.css";
import "../../css/rewards/rewards-base.css";

export default function UserBadgeDetail() {
  const { badgeId } = useParams();
  const { badges } = useRewards();
  const { toast, show } = useToast();
  const badge = badges.find((b) => b.id === badgeId);

  if (!badge) return <div className="dn"><EmptyState icon={Trophy} title="Badge not found" text="Check the badges page." actionLabel="All badges" to="/user-badges" /></div>;

  const pct = Math.round((badge.value / badge.target) * 100);
  const share = async () => {
    try { await navigator.clipboard.writeText(`I earned the ${badge.title} badge on ReOrbit!`); show("Copied. Paste it anywhere to share."); } catch { show("Couldn't copy."); }
  };

  return (
    <div className="dn rw">
      <Crumbs items={[{ label: "Badges", to: "/user-badges" }, { label: badge.title }]} />
      <section className={`dn-card rw-bdetail ${badge.earned ? "is-earned" : ""}`}>
        <BadgeIcon name={badge.icon} earned={badge.earned} size={46} />
        <span className="dn-eyebrow">{badge.earned ? "Badge earned" : "Badge in progress"}</span>
        <h1>{badge.title}</h1>
        <p>{badge.text}</p>

        <div className="rw-bdetail-progress">
          <div><b>{pct}%</b><span>{badge.value.toLocaleString("en-IN")} of {badge.target.toLocaleString("en-IN")}</span></div>
          <i className="rw-bar"><b style={{ width: `${pct}%` }} /></i>
        </div>

        {badge.earned ? (
          <p className="rw-bdetail-done"><CheckCircle2 size={18} /> Earned on {formatLongDate(badge.earnedAt)}</p>
        ) : (
          <p className="rw-bdetail-left"><Award size={18} /> {(badge.target - badge.value).toLocaleString("en-IN")} to go</p>
        )}

        <div className="rw-done-actions">
          {badge.earned ? (
            <button type="button" className="dn-btn" onClick={share}><Share2 size={15} /> Share badge</button>
          ) : (
            <Link to={badge.hint.to} className="dn-btn">{badge.hint.label}</Link>
          )}
          <Link to="/user-badges" className="dn-btn dn-btn--ghost">All badges</Link>
        </div>
      </section>
      {toast}
    </div>
  );
}
