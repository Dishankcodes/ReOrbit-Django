import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";

import {
  followBack,
  followerStats,
  growthSeries,
  isEngaged,
  removeFollower,
  restoreFollowing,
  unfollow,
  useFollowers,
  useFollowersStatus,
  useFollowing,
} from "../../data/followersStore";

import FollowerCard from "./components/FollowerCard";
import FollowerDrawer from "./components/FollowerDrawer";
import FollowersStats from "./components/FollowersStats";
import FollowersToolbar from "./components/FollowersToolbar";
import FollowingCard from "./components/FollowingCard";

import "./FollowersPage.css";

const PAGE_SIZE = 12;

export default function ReMakerFollowers() {
  const followers = useFollowers();
  const following = useFollowing();
  const status = useFollowersStatus();

  const [tab, setTab] = useState("followers");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [view, setView] = useState("grid");
  const [shown, setShown] = useState(PAGE_SIZE);
  const [open, setOpen] = useState(null);
  const [toast, setToast] = useState(null); /* { text, undo } */
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const flash = (text, undo = null) => {
    clearTimeout(timer.current);
    setToast({ text, undo });
    timer.current = setTimeout(() => setToast(null), 6500);
  };

  const stats = useMemo(() => followerStats(followers), [followers]);
  const series = useMemo(() => growthSeries(followers, 12), [followers]);
  const followingIds = useMemo(
    () => new Set(following.map((item) => item.id)),
    [following],
  );

  const counts = useMemo(() => {
    const monthAgo = Date.now() - 30 * 86400000;

    return {
      all: followers.length,
      new: followers.filter(
        (person) => new Date(person.followedAt).getTime() >= monthAgo,
      ).length,
      customers: followers.filter((person) => person.customerId).length,
      engaged: followers.filter(isEngaged).length,
      makers: followers.filter((person) => person.type === "ReMaker").length,
    };
  }, [followers]);

  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();
    const monthAgo = Date.now() - 30 * 86400000;

    const filtered = followers.filter((person) => {
      if (filter === "new" && new Date(person.followedAt).getTime() < monthAgo)
        return false;
      if (filter === "customers" && !person.customerId) return false;
      if (filter === "engaged" && !isEngaged(person)) return false;
      if (filter === "makers" && person.type !== "ReMaker") return false;
      if (!text) return true;

      return [person.name, person.city, person.state]
        .join(" ")
        .toLowerCase()
        .includes(text);
    });

    const sorters = {
      recent: (a, b) => b.followedAt.localeCompare(a.followedAt),
      oldest: (a, b) => a.followedAt.localeCompare(b.followedAt),
      name: (a, b) => a.name.localeCompare(b.name),
      engaged: (a, b) => b.saves + b.orders * 5 - (a.saves + a.orders * 5),
    };

    return [...filtered].sort(sorters[sort]);
  }, [followers, filter, query, sort]);

  const change = (setter) => (value) => {
    setter(value);
    setShown(PAGE_SIZE);
  };

  const resetFilters = () => {
    setFilter("all");
    setQuery("");
    setShown(PAGE_SIZE);
  };

  /* A removed follower can only come back by following again themselves,
     so there is no Undo here. */
  const handleRemove = async (person) => {
    setOpen(null);

    try {
      const removed = await removeFollower(person.id);
      if (removed) flash(`Removed ${removed.name}.`);
    } catch (error) {
      flash(error.message || "We couldn't remove that follower.");
    }
  };

  const handleFollowBack = async (person) => {
    try {
      await followBack(person);
      flash(`You now follow ${person.name}.`);
    } catch (error) {
      flash(error.message || `We couldn't follow ${person.name}.`);
    }
  };

  const handleUnfollow = async (item) => {
    try {
      const removed = await unfollow(item.id);
      if (removed)
        flash(`Unfollowed ${removed.name}.`, () =>
          restoreFollowing(removed).catch((error) =>
            flash(error.message || "We couldn't follow them again."),
          ),
        );
    } catch (error) {
      flash(error.message || `We couldn't unfollow ${item.name}.`);
    }
  };

  if (!status.loaded) {
    return (
      <section className="fol">
        <div className="fol-empty" role="status">
          {status.error ? (
            <>
              <h3>We couldn&apos;t load your followers</h3>
              <p>{status.error}</p>
              <button
                type="button"
                className="fol-btn primary"
                onClick={status.retry}
              >
                Try again
              </button>
            </>
          ) : (
            <p>Loading your followers...</p>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="fol">
      {/* ================= HEADER ================= */}
      <header className="fol-top">
        <div>
          <h2>Your followers</h2>
          <p>
            The people who follow your work see your new products and portfolio
            first. See who they are, where they are from, and who is already a
            customer.
          </p>
        </div>

        <Link to="/remaker-portfolio/new" className="fol-btn primary">
          Share new work
        </Link>
      </header>

      {/* ================= STATS ================= */}
      <FollowersStats stats={stats} series={series} />

      {/* ================= TABS ================= */}
      <div
        className="fol-tabs"
        role="tablist"
        aria-label="Followers or following"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "followers"}
          className={tab === "followers" ? "active" : ""}
          onClick={() => setTab("followers")}
        >
          Followers <span>{followers.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "following"}
          className={tab === "following" ? "active" : ""}
          onClick={() => setTab("following")}
        >
          Following <span>{following.length}</span>
        </button>
      </div>

      {/* ================= FOLLOWERS ================= */}
      {tab === "followers" && (
        <>
          <FollowersToolbar
            filter={filter}
            onFilter={change(setFilter)}
            counts={counts}
            query={query}
            onQuery={change(setQuery)}
            sort={sort}
            onSort={setSort}
            view={view}
            onView={setView}
          />

          {visible.length === 0 ? (
            <div className="fol-empty">
              <div
                className="fol-empty-art"
                aria-hidden="true"
                style={{ display: "grid", placeItems: "center", height: 90 }}
              >
                <Users size={44} strokeWidth={1.4} />
              </div>
              <h3>
                {followers.length === 0
                  ? "No followers yet"
                  : "No followers match"}
              </h3>
              <p>
                {followers.length === 0
                  ? "Share a portfolio piece or list a product and people will start following you."
                  : "Try a different filter, or clear your search."}
              </p>
              {followers.length > 0 && (
                <button
                  type="button"
                  className="fol-btn ghost"
                  onClick={resetFilters}
                >
                  Show everyone
                </button>
              )}
            </div>
          ) : (
            <>
              <div className={`fol-grid ${view}`}>
                {visible.slice(0, shown).map((person) => (
                  <FollowerCard
                    key={person.id}
                    person={person}
                    view={view}
                    following={followingIds.has(person.id)}
                    onOpen={setOpen}
                    onFollowBack={handleFollowBack}
                  />
                ))}
              </div>

              <div className="fol-more">
                <span>
                  Showing {Math.min(shown, visible.length)} of {visible.length}
                </span>
                {shown < visible.length && (
                  <button
                    type="button"
                    className="fol-btn ghost"
                    onClick={() => setShown((value) => value + PAGE_SIZE)}
                  >
                    Show more followers
                  </button>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ================= FOLLOWING ================= */}
      {tab === "following" && (
        <>
          {following.length === 0 ? (
            <div className="fol-empty">
              <div
                className="fol-empty-art"
                aria-hidden="true"
                style={{ display: "grid", placeItems: "center", height: 90 }}
              >
                <Users size={44} strokeWidth={1.4} />
              </div>
              <h3>You are not following anyone</h3>
              <p>
                Follow other ReMakers to see their new work and learn from their
                craft.
              </p>
              <Link
                to="/remaker-marketplace?source=remaker"
                className="fol-btn primary"
              >
                Find ReMakers
              </Link>
            </div>
          ) : (
            <div className="fol-following">
              {following.map((item) => (
                <FollowingCard
                  key={item.id}
                  item={item}
                  onUnfollow={handleUnfollow}
                />
              ))}
            </div>
          )}
        </>
      )}

      {open && (
        <FollowerDrawer
          person={open}
          following={followingIds.has(open.id)}
          onClose={() => setOpen(null)}
          onRemove={handleRemove}
          onFollowBack={(person) => {
            handleFollowBack(person);
          }}
        />
      )}

      {toast && (
        <div className="fol-toast" role="status" aria-live="polite">
          <span>{toast.text}</span>
          {toast.undo && (
            <button
              type="button"
              onClick={() => {
                toast.undo();
                setToast(null);
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}
    </section>
  );
}
