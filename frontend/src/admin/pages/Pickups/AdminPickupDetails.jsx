import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ChevronRight, ArrowLeft, PackageX, Truck, CalendarDays, MapPin, Phone, Mail, ExternalLink, Check,
  CalendarClock, UserRound, AlertTriangle, ArrowRight, Navigation,
} from "lucide-react";

import { usePickup, runPickupAction } from "../../data/pickupsStore";
import { getPickupActions } from "../../data/pickupActions";
import { formatDate, formatDateTime, timeAgo } from "../../utils/format";

import StatusBadge from "../../components/ui/StatusBadge";
import UserAvatar from "../../components/ui/UserAvatar";
import EmptyState from "../../components/ui/EmptyState";
import { ACTION_ICONS } from "../../components/ui/actionIcons";
import useToast from "../../components/ui/useToast";
import DonationActionModal from "../Donations/components/DonationActionModal";
import { TypeChip, DueChip } from "./components/PickupBadges";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/users/AdminUserProfile.css";
import "../../css/products/AdminProducts.css";
import "../../css/orders/AdminOrders.css";
import "../../css/donations/AdminDonations.css";
import "../../css/pickups/AdminPickups.css";

const STEPS = [
  { key: "Requested", label: "Requested" },
  { key: "Scheduled", label: "Scheduled" },
  { key: "Picked_Up", label: "Picked up" },
  { key: "Completed", label: "Completed" },
];

function Stepper({ status }) {
  const current = STEPS.findIndex((s) => s.key === status);
  return (
    <ol className="aup-steps pk-steps" aria-label={`Pickup progress: ${status}`}>
      {STEPS.map((step, i) => {
        const done = i < current || status === "Completed";
        return (
          <li key={step.key} className={done ? "done" : i === current ? "current" : ""}>
            <span>{done ? <Check size={11} strokeWidth={3} /> : i + 1}</span>
            <em>{step.label}</em>
          </li>
        );
      })}
    </ol>
  );
}

export default function AdminPickupDetails() {
  const { pickupId } = useParams();
  const navigate = useNavigate();
  const p = usePickup(pickupId);
  const { toast, toastNode } = useToast();
  const [pending, setPending] = useState(null);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [pickupId]);

  if (!p) {
    return (
      <div className="aup-page">
        <section className="aup-card">
          <EmptyState icon={PackageX} title="Pickup not found" text="This pickup does not exist or the link is wrong."
            action={<button type="button" className="ad-btn ad-btn-primary ad-btn-sm" onClick={() => navigate("/admin-pickups")}><ArrowLeft size={14} /> Back to pickups</button>} />
        </section>
      </div>
    );
  }

  const actions = getPickupActions(p);
  const heroActions = actions.slice(0, 3);
  const confirmAction = (payload) => {
    runPickupAction(p, pending.key, payload);
    toast(`Pickup ${p.id} ${pending.toast}.`);
    setPending(null);
  };
  const fullAddress = `${p.address}, ${p.city}, ${p.state} ${p.pincode}`;
  const isDonation = p.type === "Donation";

  return (
    <div className="aup-page">
      <nav className="aup-crumbs" aria-label="Breadcrumb">
        <Link to="/admin-pickups" className="aup-back"><ArrowLeft size={15} /> Pickups</Link>
        <ChevronRight size={14} />
        <span aria-current="page">{p.id}</span>
      </nav>

      {/* ---------- hero ---------- */}
      <section className="aup-hero">
        <div className="aup-hero-main">
          <img src={p.image} alt={p.title} className="aw-hero-img dn-hero-img" />
          <div className="aup-hero-info">
            <div className="aup-hero-name">
              <h2>{p.title}{p.quantity > 1 ? ` ×${p.quantity}` : ""}</h2>
              <StatusBadge status={p.status} />
              <DueChip pickup={p} />
            </div>
            <ul className="aup-hero-meta">
              <li><Truck size={14} /> {p.id}</li>
              <li><TypeChip type={p.type} /></li>
              <li><CalendarDays size={14} /> Requested {formatDate(p.requested_at)} ({timeAgo(p.requested_at)})</li>
            </ul>
          </div>
        </div>
        {heroActions.length > 0 && (
          <div className="ao-hero-side">
            <div className="aup-hero-actions">
              {heroActions.map((a) => {
                const Icon = ACTION_ICONS[a.icon];
                return <button key={a.key} type="button" className={`aup-hero-btn tone-${a.tone}`} onClick={() => setPending(a)}><Icon size={15} /> {a.short}</button>;
              })}
            </div>
          </div>
        )}
      </section>

      {/* ---------- notices ---------- */}
      {p.due?.key === "overdue" && (
        <div className="aup-notice tone-blocked" role="alert">
          <strong>This pickup is {p.due.label.toLowerCase()}.</strong>
          <span>It was due on {formatDate(p.date)} ({p.slot}). Mark it picked up if it happened, or reschedule so the customer is not left waiting.</span>
        </div>
      )}
      {p.status === "Requested" && (
        <div className="aup-notice tone-suspended" role="status">
          <strong>Waiting to be scheduled.</strong>
          <span>Pick a date, a time slot and a pickup team. {isDonation ? "This donation is also waiting for review, so scheduling accepts it." : "The customer chose “Managed by platform”."}</span>
        </div>
      )}
      {p.status === "Cancelled" && (
        <div className="aup-notice tone-deleted" role="status">
          <strong>This pickup was cancelled.</strong>
          <span>Reason: “{p.cancel_reason}”.</span>
        </div>
      )}
      {p.customer.status !== "Active" && (
        <p className="apd-warn"><AlertTriangle size={15} /> The customer’s account is {p.customer.status.toLowerCase()}. Check it before sending a pickup team.</p>
      )}

      {p.status !== "Cancelled" && (
        <section className="aup-card dn-progress">
          <header className="aup-card-head"><div><h3>Pickup progress</h3><p>From the request to the warehouse door.</p></div></header>
          <Stepper status={p.status} />
        </section>
      )}

      <div className="aup-grid-2">
        {/* ---------- left ---------- */}
        <div className="aup-stack">
          <section className="aup-card">
            <header className="aup-card-head">
              <div><h3>What is being collected</h3><p>The item for this pickup.</p></div>
              <Link to={p.ref_path} className="aup-link">View {isDonation ? "donation" : "listing"} <ArrowRight size={14} /></Link>
            </header>
            <div className="ao-item">
              <img src={p.image} alt={p.title} />
              <div>
                <TypeChip type={p.type} />
                <h3>{p.title}</h3>
                <p><span className="aup-mono">{p.ref_id}</span> · {p.category} · Qty {p.quantity}</p>
                <p>Free pickup, handled by the ReOrbit platform.</p>
              </div>
            </div>
          </section>

          <section className="aup-card">
            <header className="aup-card-head"><div><h3>{isDonation ? "Donor" : "Customer"}</h3><p>Who the pickup team will meet.</p></div></header>
            <div className="dn-donor">
              <UserAvatar name={p.customer.name} src={p.customer.image} size={52} rounded="15px" />
              <div><strong>{p.customer.name}</strong><span>{p.customer.email}</span><StatusBadge status={p.customer.status} /></div>
              <Link to={p.customer.path} className="ad-btn ad-btn-ghost ad-btn-sm"><ExternalLink size={14} /> View profile</Link>
            </div>
            <ul className="dn-contact">
              <li><Phone size={14} /> {p.customer.phone}</li>
              <li><Mail size={14} /> {p.customer.email}</li>
            </ul>
          </section>
        </div>

        {/* ---------- right ---------- */}
        <div className="aup-stack">
          <section className="aup-card">
            <header className="aup-card-head"><div><h3>Schedule</h3><p>When and who.</p></div>{p.due && <DueChip pickup={p} />}</header>
            {p.date ? (
              <dl className="ao-txn" style={{ margin: 0 }}>
                <div><dt><CalendarClock size={13} /> Date</dt><dd>{formatDate(p.date)}</dd></div>
                <div><dt>Time slot</dt><dd>{p.slot}</dd></div>
                <div><dt><UserRound size={13} /> Pickup team</dt><dd>{p.agent}</dd></div>
              </dl>
            ) : (
              <p className="ap-muted">{p.status === "Cancelled" ? "No pickup, because it was cancelled." : "Not scheduled yet."}</p>
            )}
          </section>

          <section className="aup-card">
            <header className="aup-card-head"><div><h3>Pickup address</h3><p>Where the team goes.</p></div></header>
            <div className="pk-map" aria-hidden="true"><span className="pk-pin"><MapPin size={22} /></span></div>
            <p className="pk-address"><Navigation size={14} /> {fullAddress}</p>
          </section>

          <section className="aup-card">
            <header className="aup-card-head"><div><h3>Pickup history</h3><p>Every step so far.</p></div></header>
            <ol className="apd-tl">
              {[...p.events].reverse().map((e) => (
                <li key={e.id}>
                  <i className={`apd-dot ${e.tone}`} />
                  <div><strong>{e.label}</strong><p>{e.detail}</p><time>{formatDateTime(e.at)}</time></div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      <DonationActionModal action={pending} targets={[p.id]} onConfirm={confirmAction} onClose={() => setPending(null)} />
      {toastNode}
    </div>
  );
}
