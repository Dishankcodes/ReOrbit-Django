import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import {
  followBack,
  followerStats,
  growthSeries,
  removeFollower,
  restoreFollower,
  restoreFollowing,
  unfollow,
  useFollowers,
  useFollowing,
} from "../../data/followersStore";
import { useCustomers } from "../../data/salesStore";

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
  const customers = useCustomers();

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
      engaged: followers.filter(
        (person) => person.views >= 34 || person.saves >= 5,
      ).length,
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
      if (filter === "engaged" && !(person.views >= 34 || person.saves >= 5))
        return false;
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
      engaged: (a, b) => b.views + b.saves * 5 - (a.views + a.saves * 5),
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

  const handleRemove = (person) => {
    const removed = removeFollower(person.id);
    setOpen(null);
    if (removed)
      flash(`Removed ${removed.name}.`, () => restoreFollower(removed));
  };

  const handleFollowBack = (person) => {
    followBack(person);
    flash(`You now follow ${person.name}.`);
  };

  const handleUnfollow = (item) => {
    const removed = unfollow(item.id);
    if (removed)
      flash(`Unfollowed ${removed.name}.`, () => restoreFollowing(removed));
  };

  const customerFor = (person) =>
    person.customerId
      ? customers.find((entry) => entry.customer.id === person.customerId)
      : null;

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
              <div className="fol-empty-art" aria-hidden="true">
                <img src="/images/users/meera-iyer.jpg" alt="" />
                <img src="/images/users/kabir-verma.jpg" alt="" />
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
              <div className="fol-empty-art" aria-hidden="true">
                <img src="/images/remakers/tara-bose.jpg" alt="" />
                <img src="/images/remakers/arjun-mehta.jpg" alt="" />
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
          customer={customerFor(open)}
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
