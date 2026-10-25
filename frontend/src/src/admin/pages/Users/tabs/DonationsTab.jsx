import React from "react";
import { Gift, Check, Award, CalendarClock } from "lucide-react";
import EmptyState from "../../../components/ui/EmptyState";
import StatusBadge from "../../../components/ui/StatusBadge";
import { formatDate } from "../../../utils/format";

const STEPS = [
  { key: "Pending", label: "Pending" },
  { key: "Scheduled", label: "Scheduled" },
  { key: "Picked_Up", label: "Picked up" },
  { key: "Received", label: "Received" },
  { key: "Completed", label: "Completed" },
];

function Stepper({ status }) {
  if (status === "Rejected") return null;
  const current = STEPS.findIndex((step) => step.key === status);
  return (
    <ol className="aup-steps" aria-label={`Donation progress: ${status}`}>
      {STEPS.map((step, index) => (
        <li key={step.key} className={index < current ? "done" : index === current ? "current" : ""}>
          <span>{index < current ? <Check size={11} strokeWidth={3} /> : index + 1}</span>
          <em>{step.label}</em>
        </li>
      ))}
    </ol>
  );
}

export default function DonationsTab({ user, toast }) {
  if (user.donations.length === 0) {
    return (
      <section className="aup-card">
        <EmptyState icon={Gift} title="No donations yet" text="When this user donates an item, the pickup progress will appear here." />
      </section>
    );
  }

  return (
    <div className="aup-stack">
      {user.donations.map((donation) => (
        <article key={donation.donation_id} className="aup-card aup-donation">
          <div className="aup-donation-top">
            <img src={donation.image} alt="" className="aup-thumb lg" />
            <div className="aup-donation-main">
              <div className="aup-donation-title">
                <h3>{donation.title}</h3>
                <StatusBadge status={donation.donation_status} />
              </div>
              <p>
                <span className="aup-mono">{donation.donation_id}</span> · {donation.category} · Qty {donation.quantity} · Donated on {formatDate(donation.donation_date)}
              </p>
              {donation.pickup_date ? (
                <p className="aup-donation-pickup">
                  <CalendarClock size={14} /> Free pickup {formatDate(donation.pickup_date)}, {donation.pickup_slot}
                </p>
              ) : (
                <p className="aup-donation-pickup muted"><CalendarClock size={14} /> Pickup not scheduled yet</p>
              )}
            </div>
            {donation.certificate && (
              <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => toast("Certificate preview is not connected yet (UI only).")}>
                <Award size={14} /> Certificate
              </button>
            )}
          </div>
          {donation.donation_status === "Rejected" && (
            <p className="apd-warn" style={{ marginTop: 14 }}>Rejected by admin: {donation.reject_reason}</p>
          )}
          <Stepper status={donation.donation_status} />
        </article>
      ))}
    </div>
  );
}
