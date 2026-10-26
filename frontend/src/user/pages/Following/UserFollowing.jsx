import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Compass, HeartHandshake, UserMinus, Users, Sparkles, Newspaper, ArrowRight } from "lucide-react";

import { REMAKERS, ITEMS, formatPrice } from "../../../data/marketplaceData";
import { useFollowing } from "../../data/followStore";
import ConfirmModal from "../../components/ui/ConfirmModal";
import EmptyState from "../../components/ui/EmptyState";
import SafeImage from "../../components/ui/SafeImage";
import useToast from "../../components/ui/useToast";
import RemakerCard from "../Remakers/components/RemakerCard";

import "../../css/shared/ui-base.css";
import "../../css/following/UserFollowing.css";

export default function UserFollowing() {
  const navigate = useNavigate();
  const { ids, isFollowing, toggle } = useFollowing();
  const { toast, show } = useToast();
  const [tab, setTab] = useState("updates");
  const [leaving, setLeaving] = useState(null);

  const following = useMemo(() => REMAKERS.filter((m) => ids.includes(m.id)), [ids]);
  const suggested = useMemo(() => REMAKERS.filter((m) => !ids.includes(m.id)), [ids]);

  /* newest products from the ReMakers you follow */
  const feed = useMemo(
    () =>
      ITEMS.filter((i) => i.sellerType === "remaker" && ids.includes(i.sellerId))
        .sort((a, b) => String(b.listedDate).localeCompare(String(a.listedDate))),
    [ids],
  );

  const onToggle = (maker) => {
    if (isFollowing(maker.id)) { setLeaving(maker); return; }
    toggle(maker.id);
    show(`You're now following ${maker.name}.`);
  };

  const tabs = [
    { id: "updates", label: "Latest updates", icon: Newspaper, count: feed.length },
    { id: "following", label: "Following", icon: Users, count: following.length },
    { id: "discover", label: "Discover", icon: Compass, count: suggested.length },
  ];

  return (
    <div className="dn fl">
      <section className="fl-hero">
        <div>
          <span className="dn-eyebrow">Your makers</span>
          <h1>Stay close to the people who make things.</h1>
          <p>Follow ReMakers to see their newest pieces first. Their work is rare, and it sells out fast.</p>
          <div className="fl-hero-actions">
            <Link to="/user-remakers" className="dn-btn"><Compass size={16} /> Discover ReMakers</Link>
          </div>
        </div>
        <ul className="fl-hero-stats">
          <li><b>{following.length}</b><span>Following</span></li>
          <li><b>{feed.length}</b><span>Products to explore</span></li>
        </ul>
      </section>

      <div className="fl-tabs" role="tablist">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? "is-active" : ""} onClick={() => setTab(t.id)}>
              <Icon size={15} /> {t.label} <em>{t.count}</em>
            </button>
          );
        })}
      </div>

      {tab === "updates" && (
        following.length === 0 ? (
          <EmptyState icon={HeartHandshake} title="Follow a ReMaker to see updates" text="Their newest products will show up here." actionLabel="Discover ReMakers" to="/user-remakers" />
        ) : feed.length === 0 ? (
          <EmptyState icon={Sparkles} title="No new products yet" text="The makers you follow haven't listed anything new. Check back soon." />
        ) : (
          <div className="fl-feed">
            {feed.map((i) => {
              const maker = REMAKERS.find((m) => m.id === i.sellerId);
              return (
                <article key={i.id} className="fl-post" onClick={() => navigate(`/user-marketplace/product/${i.id}`)} role="link" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && navigate(`/user-marketplace/product/${i.id}`)}>
                  <SafeImage src={i.image} alt={i.title} className="fl-post-img" />
                  <div className="fl-post-body">
                    <Link to={`/user-marketplace/remaker/${i.sellerId}`} className="fl-post-maker" onClick={(e) => e.stopPropagation()}>
                      <SafeImage src={maker?.image} alt="" /> <span>{i.seller}</span> <small>posted a new piece</small>
                    </Link>
                    <h3>{i.title}</h3>
                    <p>{i.summary}</p>
                    <div className="fl-post-foot"><strong>{formatPrice(i.price)}</strong><span>{i.category} · {i.condition}</span><em>View <ArrowRight size={14} /></em></div>
                  </div>
                </article>
              );
            })}
          </div>
        )
      )}

      {tab === "following" && (
        following.length === 0 ? (
          <EmptyState icon={Users} title="You're not following anyone yet" text="Find ReMakers whose work you love and tap Follow." actionLabel="Discover ReMakers" to="/user-remakers" />
        ) : (
          <div className="fl-grid">
            {following.map((m) => <RemakerCard key={m.id} maker={m} following onToggle={onToggle} />)}
          </div>
        )
      )}

      {tab === "discover" && (
        suggested.length === 0 ? (
          <EmptyState icon={Sparkles} title="You follow every ReMaker" text="New makers join often. We'll show them here." />
        ) : (
          <div className="fl-grid">
            {suggested.map((m) => <RemakerCard key={m.id} maker={m} following={false} onToggle={onToggle} />)}
          </div>
        )
      )}

      {leaving && (
        <ConfirmModal icon={UserMinus} title={`Unfollow ${leaving.name}?`} confirmLabel="Unfollow" cancelLabel="Keep following" onClose={() => setLeaving(null)} onConfirm={() => { toggle(leaving.id); show(`You unfollowed ${leaving.name}.`); setLeaving(null); }}>
          <p>You'll stop seeing {leaving.name}'s newest pieces in your updates.</p>
        </ConfirmModal>
      )}
      {toast}
    </div>
  );
}
