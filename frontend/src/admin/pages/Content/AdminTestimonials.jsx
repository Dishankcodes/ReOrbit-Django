import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, Eye, EyeOff, Hammer, Quote, Search, Star, Users } from "lucide-react";

import { apiRequest } from "../../../api/api";
import { useAccess } from "../../data/teamStore";
import useToast from "../../components/ui/useToast";
import EmptyState from "../../components/ui/EmptyState";
import { timeAgo } from "../../utils/format";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/reviews/AdminReviews.css";
import "../../css/content/AdminTestimonials.css";

const VIEWS = [
  { key: "New", label: "To review" },
  { key: "Shown", label: "On Home" },
  { key: "Hidden", label: "Not shown" },
  { key: "", label: "All" },
];
const PAGES = [
  { key: "user", label: "Member Home", Icon: Users },
  { key: "remaker", label: "ReMaker Home", Icon: Hammer },
];

function Stars({ n }) {
  return (
    <span className="ats-stars" aria-label={`${n} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={13} className={i <= n ? "on" : ""} fill={i <= n ? "currentColor" : "none"} />
      ))}
    </span>
  );
}

/* Admin › Testimonials: what members and ReMakers said when they rated ReOrbit (Help › Rate ReOrbit).
   The team shows up to 3 on each Home page, in the order set here. */
export default function AdminTestimonials() {
  const access = useAccess();
  const canEdit = access.can("content", "edit");
  const { toast, toastNode } = useToast();
  const [view, setView] = useState("New");
  const [q, setQ] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(() => {
    const qs = new URLSearchParams();
    if (view) qs.set("status", view);
    if (q.trim()) qs.set("q", q.trim());
    return apiRequest(`/content/admin/feedback/?${qs}`)
      .then((r) => {
        setData(r.data);
        setError("");
      })
      .catch((e) => setError(e.message || "Could not load ratings."));
  }, [view, q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const act = async (row, body) => {
    setBusy(row.id);
    try {
      const r = await apiRequest(`/content/admin/feedback/${row.id}/`, { method: "POST", body });
      toast(r.message);
      load();
    } catch (e) {
      toast(e.message || "Not done.");
    } finally {
      setBusy("");
    }
  };

  const rows = data?.results || [];
  const counts = data?.counts || {};
  const shown = data?.shown || {};
  const max = data?.max_shown || 3;

  return (
    <div className="au-page ats">
      <section className="ats-top">
        <div className="ats-score">
          <Quote size={20} />
          <div>
            <strong>{data ? (data.average || "–") : "…"}</strong>
            <span>
              average from {data?.total ?? 0} {data?.total === 1 ? "rating" : "ratings"}
            </span>
          </div>
        </div>
        {PAGES.map(({ key, label, Icon }) => (
          <div className="ats-slot" key={key}>
            <Icon size={17} />
            <div>
              <strong>
                {shown[key] ?? 0} / {max}
              </strong>
              <span>shown on {label}</span>
            </div>
            <div className="ats-dots" aria-hidden="true">
              {Array.from({ length: max }).map((_, i) => (
                <i key={i} className={i < (shown[key] || 0) ? "on" : ""} />
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="au-panel">
        <div className="ats-bar">
          <div className="arv-chips" role="tablist" aria-label="Which ratings">
            {VIEWS.map((v) => (
              <button key={v.label} type="button" className={view === v.key ? "on" : ""} onClick={() => setView(v.key)}>
                {v.label}
                {v.key && counts[v.key] != null && <em>{counts[v.key]}</em>}
              </button>
            ))}
          </div>
          <label className="au-search">
            <Search size={16} />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email or words"
              aria-label="Search ratings"
            />
          </label>
        </div>

        {error ? (
          <p className="ats-note">{error}</p>
        ) : !data ? (
          <p className="ats-note">Loading ratings…</p>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Quote}
            title={view === "New" ? "Nothing to review" : "No ratings here"}
            text="Members and ReMakers rate ReOrbit from their Help page. New ratings appear here."
          />
        ) : (
          <ul className="ats-list">
            {rows.map((t, i) => {
              const on = t.status === "Shown";
              return (
                <li key={t.id} className={`ats-card ${on ? "is-on" : ""}`}>
                  <div className="ats-who">
                    {t.image ? <img src={t.image} alt="" /> : <span className="ats-av">{t.name.charAt(0)}</span>}
                    <div>
                      <Link to={t.author.path}>{t.name}</Link>
                      <small>
                        {t.role} · {timeAgo(t.updated_at)}
                      </small>
                    </div>
                    <Stars n={t.rating} />
                  </div>
                  <blockquote>“{t.text}”</blockquote>
                  <div className="ats-foot">
                    {on ? (
                      <span className="ats-tag on">
                        <Eye size={12} /> On {t.surface === "remaker" ? "ReMaker" : "Member"} Home · #{t.position}
                      </span>
                    ) : (
                      <span className={`ats-tag ${t.status === "New" ? "new" : ""}`}>
                        {t.status === "New" ? "Waiting for review" : "Not shown"}
                      </span>
                    )}
                    {t.author.status !== "Active" && <span className="ats-tag warn">{t.author.status} account</span>}
                    {canEdit && (
                      <div className="ats-actions">
                        {on && view === "Shown" && (
                          <>
                            <button
                              type="button"
                              className="ad-btn ad-btn-ghost ad-btn-sm"
                              disabled={!!busy || i === 0 || rows[i - 1]?.surface !== t.surface}
                              onClick={() => act(t, { action: "move", direction: "up" })}
                              aria-label="Move up"
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              type="button"
                              className="ad-btn ad-btn-ghost ad-btn-sm"
                              disabled={!!busy || rows[i + 1]?.surface !== t.surface}
                              onClick={() => act(t, { action: "move", direction: "down" })}
                              aria-label="Move down"
                            >
                              <ArrowDown size={14} />
                            </button>
                          </>
                        )}
                        {PAGES.map(({ key, label }) =>
                          on && t.surface === key ? null : (
                            <button
                              key={key}
                              type="button"
                              className={`ad-btn ad-btn-sm ${key === t.side ? "ad-btn-primary" : "ad-btn-ghost"}`}
                              disabled={!!busy || (shown[key] || 0) >= max}
                              title={(shown[key] || 0) >= max ? `${label} already shows ${max}. Take one down first.` : ""}
                              onClick={() => act(t, { action: "show", surface: key })}
                            >
                              <Eye size={14} /> Show on {label}
                            </button>
                          ),
                        )}
                        {t.status !== "Hidden" && (
                          <button
                            type="button"
                            className="ad-btn ad-btn-ghost ad-btn-sm"
                            disabled={!!busy}
                            onClick={() => act(t, { action: "hide" })}
                          >
                            <EyeOff size={14} /> {on ? "Take down" : "Don't show"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {toastNode}
    </div>
  );
}
