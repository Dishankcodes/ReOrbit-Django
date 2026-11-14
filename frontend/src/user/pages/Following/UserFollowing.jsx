import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Compass,
  HeartHandshake,
  UserMinus,
  Users,
  Sparkles,
  Newspaper,
  ArrowRight,
} from "lucide-react";

import { fetchPublicRemakers } from "../../../api/remakers";
import { followApi } from "../../../api/social";
import { formatPrice } from "../../../data/marketplaceData";
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

  /* every active ReMaker, from the server (counts included) */
  const [directory, setDirectory] = useState({
    rows: [],
    loading: true,
    error: "",
  });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    setDirectory((current) => ({ ...current, loading: true, error: "" }));
    fetchPublicRemakers()
      .then((rows) => {
        if (active) setDirectory({ rows, loading: false, error: "" });
      })
      .catch((e) => {
        if (active)
          setDirectory({
            rows: [],
            loading: false,
            error: e.message || "We couldn't load ReMakers. Please try again.",
          });
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const following = useMemo(
    () => directory.rows.filter((m) => ids.includes(m.id)),
    [directory.rows, ids],
  );
  const suggested = useMemo(
    () => directory.rows.filter((m) => !ids.includes(m.id)),
    [directory.rows, ids],
  );

  /* newest products from the ReMakers you follow (fetched again when the
     list of people you follow changes) */
  const [posts, setPosts] = useState([]);
  const followKey = [...ids].sort().join(",");

  useEffect(() => {
    let active = true;

    if (!followKey) {
      setPosts([]);
      return undefined;
    }

    followApi
      .feed()
      .then((rows) => {
        if (!active) return;
        setPosts(
          rows.map((row) => ({
            id: row.id,
            title: row.title,
            summary: row.summary,
            image: row.cover,
            price: Number(row.price) || 0,
            category: row.category?.name || "",
            condition: row.condition || "Handmade",
            seller: row.seller?.name || "",
            sellerId: row.seller?.id || "",
            createdAt: row.created_at,
          })),
        );
      })
      .catch(() => {
        if (active) setPosts([]);
      });

    return () => {
      active = false;
    };
  }, [followKey]);

  /* unfollowing hides a maker's posts straight away */
  const feed = useMemo(
    () => posts.filter((post) => ids.includes(post.sellerId)),
    [posts, ids],
  );

  const onToggle = (maker) => {
    if (isFollowing(maker.id)) {
      setLeaving(maker);
      return;
    }
    toggle(maker.id);
    show(`You're now following ${maker.name}.`);
  };

  const tabs = [
    {
      id: "updates",
      label: "Latest updates",
      icon: Newspaper,
      count: feed.length,
    },
    {
      id: "following",
      label: "Following",
      icon: Users,
      count: following.length,
    },
    {
      id: "discover",
      label: "Discover",
      icon: Compass,
      count: suggested.length,
    },
  ];

  return (
    <div className="dn fl">
      <section className="fl-hero">
        <div>
          <span className="dn-eyebrow">Your makers</span>
          <h1>Stay close to the people who make things.</h1>
          <p>
            Follow ReMakers to see their newest pieces first. Their work is
            rare, and it sells out fast.
          </p>
          <div className="fl-hero-actions">
            <Link to="/user-remakers" className="dn-btn">
              <Compass size={16} /> Discover ReMakers
            </Link>
          </div>
        </div>
        <ul className="fl-hero-stats">
          <li>
            <b>{following.length}</b>
            <span>Following</span>
          </li>
          <li>
            <b>{feed.length}</b>
            <span>Products to explore</span>
          </li>
        </ul>
      </section>

      <div className="fl-tabs" role="tablist">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? "is-active" : ""}
              onClick={() => setTab(t.id)}
            >
              <Icon size={15} /> {t.label} <em>{t.count}</em>
            </button>
          );
        })}
      </div>

      {directory.loading && (
        <div className="dn mk-empty" role="status">
          Loading ReMakers...
        </div>
      )}

      {!directory.loading && directory.error && (
        <div className="dn mk-empty" role="alert">
          <h3>We couldn&apos;t load ReMakers</h3>
          <p>{directory.error}</p>
          <button
            type="button"
            className="dn-btn"
            onClick={() => setReloadKey((value) => value + 1)}
          >
            Try again
          </button>
        </div>
      )}

      {!directory.loading && !directory.error && tab === "updates" &&
        (following.length === 0 ? (
          <EmptyState
            icon={HeartHandshake}
            title="Follow a ReMaker to see updates"
            text="Their newest products will show up here."
            actionLabel="Discover ReMakers"
            to="/user-remakers"
          />
        ) : feed.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No new products yet"
            text="The makers you follow haven't listed anything new. Check back soon."
          />
        ) : (
          <div className="fl-feed">
            {feed.map((i) => {
              const maker = directory.rows.find((m) => m.id === i.sellerId);
              return (
                <article
                  key={i.id}
                  className="fl-post"
                  onClick={() => navigate(`/user-marketplace/product/${i.id}`)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    navigate(`/user-marketplace/product/${i.id}`)
                  }
                >
                  <SafeImage
                    src={i.image}
                    alt={i.title}
                    className="fl-post-img"
                  />
                  <div className="fl-post-body">
                    <Link
                      to={`/user-marketplace/remaker/${i.sellerId}`}
                      className="fl-post-maker"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <SafeImage src={maker?.image} alt="" />{" "}
                      <span>{i.seller}</span> <small>posted a new piece</small>
                    </Link>
                    <h3>{i.title}</h3>
                    <p>{i.summary}</p>
                    <div className="fl-post-foot">
                      <strong>{formatPrice(i.price)}</strong>
                      <span>
                        {i.category} · {i.condition}
                      </span>
                      <em>
                        View <ArrowRight size={14} />
                      </em>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ))}

      {!directory.loading && !directory.error && tab === "following" &&
        (following.length === 0 ? (
          <EmptyState
            icon={Users}
            title="You're not following anyone yet"
            text="Find ReMakers whose work you love and tap Follow."
            actionLabel="Discover ReMakers"
            to="/user-remakers"
          />
        ) : (
          <div className="fl-grid">
            {following.map((m) => (
              <RemakerCard key={m.id} maker={m} following onToggle={onToggle} />
            ))}
          </div>
        ))}

      {!directory.loading && !directory.error && tab === "discover" &&
        (suggested.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="You follow every ReMaker"
            text="New makers join often. We'll show them here."
          />
        ) : (
          <div className="fl-grid">
            {suggested.map((m) => (
              <RemakerCard
                key={m.id}
                maker={m}
                following={false}
                onToggle={onToggle}
              />
            ))}
          </div>
        ))}

      {leaving && (
        <ConfirmModal
          icon={UserMinus}
          title={`Unfollow ${leaving.name}?`}
          confirmLabel="Unfollow"
          cancelLabel="Keep following"
          onClose={() => setLeaving(null)}
          onConfirm={() => {
            toggle(leaving.id);
            show(`You unfollowed ${leaving.name}.`);
            setLeaving(null);
          }}
        >
          <p>
            You'll stop seeing {leaving.name}'s newest pieces in your updates.
          </p>
        </ConfirmModal>
      )}
      {toast}
    </div>
  );
}
