import React, { useMemo, useState } from "react";
import {
  Search,
  SearchX,
  Sparkles,
  UserMinus,
  UserCheck,
  Users,
  Recycle,
  X,
} from "lucide-react";

import { REMAKERS } from "../../../data/marketplaceData";
import { useFollowing } from "../../data/followStore";
import ConfirmModal from "../../components/ui/ConfirmModal";
import EmptyState from "../../components/ui/EmptyState";
import useToast from "../../components/ui/useToast";
import RemakerCard from "./components/RemakerCard";

import "../../css/shared/ui-base.css";
import "../../css/remakers/UserRemakers.css";

const SORTS = {
  rated: { label: "Top rated", fn: (a, b) => b.rating - a.rating },
  followers: {
    label: "Most followers",
    fn: (a, b) => b.followers - a.followers,
  },
  products: {
    label: "Most products",
    fn: (a, b) => b.productsCount - a.productsCount,
  },
  rescued: {
    label: "Most items rescued",
    fn: (a, b) => b.itemsRescued - a.itemsRescued,
  },
  name: { label: "Name A–Z", fn: (a, b) => a.name.localeCompare(b.name) },
};

export default function UserRemakers() {
  const { isFollowing, toggle, count } = useFollowing();
  const { toast, show } = useToast();

  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [craft, setCraft] = useState("all");
  const [sort, setSort] = useState("rated");
  const [unfollowing, setUnfollowing] = useState(null);

  const crafts = useMemo(() => [...new Set(REMAKERS.map((m) => m.craft))], []);
  const followingCount = REMAKERS.filter((m) => isFollowing(m.id)).length;

  const results = useMemo(() => {
    const text = query.trim().toLowerCase();
    return REMAKERS.filter((m) =>
      tab === "following" ? isFollowing(m.id) : true,
    )
      .filter((m) => craft === "all" || m.craft === craft)
      .filter((m) =>
        text
          ? [m.name, m.username, m.craft, m.city, m.bio].some((f) =>
              f.toLowerCase().includes(text),
            )
          : true,
      )
      .sort(SORTS[sort].fn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, craft, query, sort, count]);

  const onToggle = (maker) => {
    if (isFollowing(maker.id)) {
      setUnfollowing(maker);
      return;
    }
    toggle(maker.id);
    show(`You're now following ${maker.name}.`);
  };

  const confirmUnfollow = () => {
    toggle(unfollowing.id);
    show(`You unfollowed ${unfollowing.name}.`);
    setUnfollowing(null);
  };

  const reset = () => {
    setTab("all");
    setCraft("all");
    setQuery("");
  };

  const totalRescued = REMAKERS.reduce((sum, m) => sum + m.itemsRescued, 0);

  return (
    <div className="dn rm-page">
      <section className="rm-hero">
        <div>
          <span className="dn-eyebrow">Meet the makers</span>
          <h1>Every ReMaker, one place.</h1>
          <p>
            Verified artists who turn rescued furniture, textiles and decor into
            pieces worth keeping. Follow your favourites to see their latest
            work first.
          </p>
        </div>
        <ul className="rm-hero-stats">
          <li>
            <Users size={18} />
            <b>{REMAKERS.length}</b>
            <span>ReMakers</span>
          </li>
          <li>
            <UserCheck size={18} />
            <b>{followingCount}</b>
            <span>You follow</span>
          </li>
          <li>
            <Recycle size={18} />
            <b>{totalRescued}</b>
            <span>Items rescued</span>
          </li>
        </ul>
      </section>

      <section className="dn-card rm-tools">
        <div className="rm-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "all"}
            className={tab === "all" ? "is-active" : ""}
            onClick={() => setTab("all")}
          >
            All ReMakers <em>{REMAKERS.length}</em>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "following"}
            className={tab === "following" ? "is-active" : ""}
            onClick={() => setTab("following")}
          >
            Following <em>{followingCount}</em>
          </button>
        </div>

        <div className="rm-filters">
          <label className="rm-search">
            <Search size={16} />
            <input
              value={query}
              placeholder="Search by name, craft or city"
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </label>
          <select
            className="dn-select"
            value={craft}
            aria-label="Filter by craft"
            onChange={(event) => setCraft(event.target.value)}
          >
            <option value="all">All crafts</option>
            {crafts.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select
            className="dn-select"
            value={sort}
            aria-label="Sort ReMakers"
            onChange={(event) => setSort(event.target.value)}
          >
            {Object.entries(SORTS).map(([key, item]) => (
              <option key={key} value={key}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {results.length === 0 ? (
        tab === "following" && !query && craft === "all" ? (
          <EmptyState
            icon={Sparkles}
            title="You're not following anyone yet"
            text="Follow ReMakers to keep their work close. Browse everyone and tap Follow on the ones you like."
            actionLabel="Browse all ReMakers"
            onAction={() => setTab("all")}
          />
        ) : (
          <EmptyState
            icon={SearchX}
            title="No ReMakers match"
            text="Try a different search or clear your filters."
            actionLabel="Clear filters"
            onAction={reset}
          />
        )
      ) : (
        <>
          <p className="rm-count">
            {results.length} {results.length === 1 ? "ReMaker" : "ReMakers"}
          </p>
          <div className="rm-grid">
            {results.map((maker) => (
              <RemakerCard
                key={maker.id}
                maker={maker}
                following={isFollowing(maker.id)}
                onToggle={onToggle}
              />
            ))}
          </div>
        </>
      )}

      {unfollowing && (
        <ConfirmModal
          icon={UserMinus}
          title={`Unfollow ${unfollowing.name}?`}
          confirmLabel="Unfollow"
          cancelLabel="Keep following"
          onClose={() => setUnfollowing(null)}
          onConfirm={confirmUnfollow}
        >
          <p>
            You'll stop seeing {unfollowing.name}'s latest work first. You can
            follow again any time.
          </p>
        </ConfirmModal>
      )}

      {toast}
    </div>
  );
}
