import React from "react";
import {
  ArrowRight,
  Leaf,
  ShieldCheck,
  ShieldAlert,
  Recycle,
  Package,
  Hammer,
  Award,
} from "lucide-react";
import StatusBadge from "../../../components/ui/StatusBadge";
import {
  formatDate,
  formatDateTime,
  formatINR,
  timeAgo,
} from "../../../utils/format";
import ProviderBadge from "../../Users/components/ProviderBadge";

function Detail({ label, children }) {
  return (
    <div className="aup-detail">
      <dt>{label}</dt>
      <dd>{children || "—"}</dd>
    </div>
  );
}

export default function RemakerOverviewTab({ remaker, goToTab }) {
  const { profile } = remaker;
  const recent = remaker.orders.slice(0, 3);
  const against = remaker.reports.filter((r) =>
    r.direction.startsWith("Against"),
  );
  const done = remaker.refurbishments.filter(
    (r) => r.refurbishment_status === "Completed",
  ).length;

  return (
    <div className="aup-grid-2">
      <div className="aup-stack">
        <section className="aup-card">
          <header className="aup-card-head">
            <div>
              <h3>About</h3>
              <p>How this ReMaker describes their work.</p>
            </div>
          </header>
          <p className="rm-bio">{profile.bio}</p>
          <dl className="aup-details" style={{ marginTop: 14 }}>
            <Detail label="Experience">{profile.experience}</Detail>
            <Detail label="Certifications">
              {profile.certification.length
                ? profile.certification.join(", ")
                : "None added"}
            </Detail>
          </dl>
          <div style={{ marginTop: 14 }}>
            <div className="aup-detail" style={{ border: 0, paddingBottom: 8 }}>
              <dt>Skills</dt>
            </div>
            <div className="rm-chips">
              {profile.skills.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
          </div>
        </section>

        <section className="aup-card">
          <header className="aup-card-head">
            <div>
              <h3>Account details</h3>
              <p>Information from the ReMaker’s account and profile.</p>
            </div>
          </header>
          <dl className="aup-details">
            <Detail label="Full name">{remaker.full_name}</Detail>
            <Detail label="Art name">{remaker.username}</Detail>
            <Detail label="Email">{remaker.email}</Detail>
            <Detail label="Phone">{profile.phone}</Detail>
            <Detail label="Sign-up method">
              <ProviderBadge provider={remaker.auth_provider} />
            </Detail>
            <Detail label="Google account">
              {remaker.google_id
                ? `Linked (${remaker.google_id})`
                : "Not linked"}
            </Detail>
            <Detail label="Studio address">{profile.address}</Detail>
            <Detail label="City">{profile.city}</Detail>
            <Detail label="State">{profile.state}</Detail>
            <Detail label="Pincode">{profile.pincode}</Detail>
            <Detail label="Joined">{formatDate(remaker.created_at)}</Detail>
            <Detail label="Last active">{`${timeAgo(remaker.last_active)} · ${formatDateTime(remaker.last_active)}`}</Detail>
          </dl>
        </section>

        <section className="aup-card">
          <header className="aup-card-head">
            <div>
              <h3>Recent orders</h3>
              <p>Latest sales and purchases.</p>
            </div>
            {remaker.orders.length > 0 && (
              <button
                type="button"
                className="aup-link"
                onClick={() => goToTab("orders")}
              >
                View all <ArrowRight size={14} />
              </button>
            )}
          </header>
          {recent.length === 0 ? (
            <p className="aup-muted-note">No orders yet.</p>
          ) : (
            <ul className="aup-list">
              {recent.map((o) => (
                <li key={o.order_id} className="aup-list-row">
                  <img src={o.image} alt="" className="aup-thumb" />
                  <div className="aup-list-main">
                    <strong>{o.title}</strong>
                    <span>
                      {o.order_id} ·{" "}
                      {o.role === "Seller" ? "Sold to" : "Bought from"}{" "}
                      {o.counterparty}
                    </span>
                  </div>
                  <div className="aup-list-end">
                    <strong>{formatINR(o.amount)}</strong>
                    <StatusBadge status={o.order_status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="aup-stack">
        <section className="aup-card aup-impact">
          <div className="aup-impact-top">
            <span className="aup-impact-icon">
              <Leaf size={20} strokeWidth={1.7} />
            </span>
            <div>
              <small>Environmental impact</small>
              <strong>
                {profile.environmental_impact} <em>kg CO₂ saved</em>
              </strong>
            </div>
          </div>
          <ul className="aup-impact-rows">
            <li>
              <Hammer size={15} /> Refurbishments completed <b>{done}</b>
            </li>
            <li>
              <Package size={15} /> Upcycled products listed{" "}
              <b>{profile.total_uploads}</b>
            </li>
            <li>
              <Recycle size={15} /> Portfolio pieces{" "}
              <b>{remaker.portfolio.length}</b>
            </li>
          </ul>
        </section>

        <section className="aup-card">
          <header className="aup-card-head">
            <div>
              <h3>Moderation</h3>
              <p>Account actions taken by admins.</p>
            </div>
          </header>
          {remaker.statusHistory.length === 0 ? (
            <div className="aup-clean">
              <ShieldCheck size={18} />
              <div>
                <strong>Clean record</strong>
                <span>No suspensions, blocks or deletions.</span>
              </div>
            </div>
          ) : (
            <ol className="aup-timeline">
              {remaker.statusHistory.map((e) => (
                <li key={e.id}>
                  <i className={`tl-dot tl-${e.action.toLowerCase()}`} />
                  <div>
                    <div className="aup-tl-head">
                      <StatusBadge status={e.action} />
                      <time>{formatDate(e.at)}</time>
                    </div>
                    <p>{e.reason}</p>
                    <small>By {e.by}</small>
                  </div>
                </li>
              ))}
            </ol>
          )}
          {against.length > 0 && (
            <button
              type="button"
              className="aup-alert"
              onClick={() => goToTab("reports")}
            >
              <ShieldAlert size={16} />
              {against.length} report{against.length > 1 ? "s" : ""} filed
              against this ReMaker
              <ArrowRight size={14} />
            </button>
          )}
        </section>

        <section className="aup-card">
          <header className="aup-card-head">
            <div>
              <h3>Earnings & spending</h3>
              <p>Completed and confirmed orders only.</p>
            </div>
          </header>
          <div className="aup-money">
            <div>
              <small>Earned</small>
              <strong>{formatINR(remaker.totals.earned)}</strong>
            </div>
            <div>
              <small>Spent on materials</small>
              <strong>{formatINR(remaker.totals.spent)}</strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
