import React from "react";
import { ArrowRight, Leaf, ShieldCheck, ShieldAlert, Recycle, Gift, ShoppingBag } from "lucide-react";
import StatusBadge from "../../../components/ui/StatusBadge";
import { formatDate, formatDateTime, formatINR, timeAgo } from "../../../utils/format";
import ProviderBadge from "../components/ProviderBadge";

function Detail({ label, children }) {
  return (
    <div className="aup-detail">
      <dt>{label}</dt>
      <dd>{children || "—"}</dd>
    </div>
  );
}

export default function OverviewTab({ user, goToTab }) {
  const { profile } = user;
  const recentOrders = user.orders.slice(0, 3);
  const openReports = user.reports.filter((r) => r.direction === "Against this user");

  return (
    <div className="aup-grid-2">
      <div className="aup-stack">
        <section className="aup-card">
          <header className="aup-card-head">
            <div>
              <h3>Account details</h3>
              <p>Information from the user’s account and profile.</p>
            </div>
          </header>
          <dl className="aup-details">
            <Detail label="Full name">{user.full_name}</Detail>
            <Detail label="Email">{user.email}</Detail>
            <Detail label="Phone">{profile.phone}</Detail>
            <Detail label="Sign-up method">
              <ProviderBadge provider={user.auth_provider} />
            </Detail>
            <Detail label="Address">{profile.address}</Detail>
            <Detail label="City">{profile.city}</Detail>
            <Detail label="State">{profile.state}</Detail>
            <Detail label="Pincode">{profile.pincode}</Detail>
            <Detail label="Joined">{formatDate(user.created_at)}</Detail>
            <Detail label="Last updated">{formatDate(user.updated_at)}</Detail>
            <Detail label="Last active">{`${timeAgo(user.last_active)} · ${formatDateTime(user.last_active)}`}</Detail>
            <Detail label="Google account">{user.google_id ? `Linked (${user.google_id})` : "Not linked"}</Detail>
          </dl>
        </section>

        <section className="aup-card">
          <header className="aup-card-head">
            <div>
              <h3>Recent orders</h3>
              <p>Latest purchases and sales.</p>
            </div>
            {user.orders.length > 0 && (
              <button type="button" className="aup-link" onClick={() => goToTab("orders")}>
                View all <ArrowRight size={14} />
              </button>
            )}
          </header>

          {recentOrders.length === 0 ? (
            <p className="aup-muted-note">No orders yet.</p>
          ) : (
            <ul className="aup-list">
              {recentOrders.map((order) => (
                <li key={order.order_id} className="aup-list-row">
                  <img src={order.image} alt="" className="aup-thumb" />
                  <div className="aup-list-main">
                    <strong>{order.title}</strong>
                    <span>
                      {order.order_id} · {order.role === "Buyer" ? "Bought from" : "Sold to"} {order.counterparty}
                    </span>
                  </div>
                  <div className="aup-list-end">
                    <strong>{formatINR(order.amount)}</strong>
                    <StatusBadge status={order.order_status} />
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
            <span className="aup-impact-icon"><Leaf size={20} strokeWidth={1.7} /></span>
            <div>
              <small>Environmental impact</small>
              <strong>{profile.environmental_impact} <em>kg CO₂ saved</em></strong>
            </div>
          </div>
          <ul className="aup-impact-rows">
            <li><Recycle size={15} /> Items rescued <b>{profile.total_uploads}</b></li>
            <li><Gift size={15} /> Items donated <b>{user.donations.length}</b></li>
            <li><ShoppingBag size={15} /> Circular purchases <b>{profile.total_purchases}</b></li>
          </ul>
        </section>

        <section className="aup-card">
          <header className="aup-card-head">
            <div>
              <h3>Moderation</h3>
              <p>Account actions taken by admins.</p>
            </div>
          </header>

          {user.statusHistory.length === 0 ? (
            <div className="aup-clean">
              <ShieldCheck size={18} />
              <div>
                <strong>Clean record</strong>
                <span>No suspensions, blocks or deletions.</span>
              </div>
            </div>
          ) : (
            <ol className="aup-timeline">
              {user.statusHistory.map((entry) => (
                <li key={entry.id}>
                  <i className={`tl-dot tl-${entry.action.toLowerCase()}`} />
                  <div>
                    <div className="aup-tl-head">
                      <StatusBadge status={entry.action} />
                      <time>{formatDate(entry.at)}</time>
                    </div>
                    <p>{entry.reason}</p>
                    <small>By {entry.by}</small>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {openReports.length > 0 && (
            <button type="button" className="aup-alert" onClick={() => goToTab("reports")}>
              <ShieldAlert size={16} />
              {openReports.length} report{openReports.length > 1 ? "s" : ""} filed against this user
              <ArrowRight size={14} />
            </button>
          )}
        </section>

        <section className="aup-card">
          <header className="aup-card-head">
            <div>
              <h3>Spending & earnings</h3>
              <p>Completed and confirmed orders only.</p>
            </div>
          </header>
          <div className="aup-money">
            <div><small>Spent</small><strong>{formatINR(user.totals.spent)}</strong></div>
            <div><small>Earned</small><strong>{formatINR(user.totals.earned)}</strong></div>
          </div>
        </section>
      </div>
    </div>
  );
}
