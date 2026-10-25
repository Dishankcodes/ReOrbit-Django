import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ChevronRight,
  ArrowLeft,
  PackageX,
  Gift,
  CalendarDays,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  Check,
  Award,
  CalendarClock,
  Truck,
  HeartHandshake,
  Scale,
  AlertTriangle,
  Download,
} from "lucide-react";

import { useDonation, runDonationAction } from "../../data/donationsStore";
import { getDonationActions } from "../../data/donationActions";
import { formatDate, formatDateTime, timeAgo } from "../../utils/format";

import StatusBadge from "../../components/ui/StatusBadge";
import UserAvatar from "../../components/ui/UserAvatar";
import EmptyState from "../../components/ui/EmptyState";
import { ACTION_ICONS } from "../../components/ui/actionIcons";
import useToast from "../../components/ui/useToast";
import DonationActionModal from "./components/DonationActionModal";
import { WaitChip, ConditionTag } from "./components/DonationBadges";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/users/AdminUserProfile.css";
import "../../css/products/AdminProducts.css";
import "../../css/orders/AdminOrders.css";
import "../../css/donations/AdminDonations.css";

const STEPS = [
  { key: "Pending", label: "Submitted" },
  { key: "Scheduled", label: "Pickup scheduled" },
  { key: "Picked_Up", label: "Picked up" },
  { key: "Received", label: "Received" },
  { key: "Completed", label: "Completed" },
];

function Stepper({ status }) {
  const current = STEPS.findIndex((s) => s.key === status);
  return (
    <ol className="aup-steps" aria-label={`Donation progress: ${status}`}>
      {STEPS.map((step, i) => (
        <li
          key={step.key}
          className={
            i < current || status === "Completed"
              ? "done"
              : i === current
                ? "current"
                : ""
          }
        >
          <span>
            {i < current || status === "Completed" ? (
              <Check size={11} strokeWidth={3} />
            ) : (
              i + 1
            )}
          </span>
          <em>{step.label}</em>
        </li>
      ))}
    </ol>
  );
}

export default function AdminDonationDetails() {
  const { donationId } = useParams();
  const navigate = useNavigate();
  const d = useDonation(donationId);
  const { toast, toastNode } = useToast();
  const [pending, setPending] = useState(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [donationId]);

  if (!d) {
    return (
      <div className="aup-page">
        <section className="aup-card">
          <EmptyState
            icon={PackageX}
            title="Donation not found"
            text="This donation does not exist or the link is wrong."
            action={
              <button
                type="button"
                className="ad-btn ad-btn-primary ad-btn-sm"
                onClick={() => navigate("/admin-donations")}
              >
                <ArrowLeft size={14} /> Back to donations
              </button>
            }
          />
        </section>
      </div>
    );
  }

  const actions = getDonationActions(d);
  const heroActions = actions.slice(0, 3);
  const confirmAction = (payload) => {
    runDonationAction(d.id, pending.key, payload);
    toast(`Donation ${d.id} ${pending.toast}.`);
    setPending(null);
  };
  const address = `${d.donor.address}, ${d.donor.city}, ${d.donor.state} ${d.donor.pincode}`;

  return (
    <div className="aup-page">
      <nav className="aup-crumbs" aria-label="Breadcrumb">
        <Link to="/admin-donations" className="aup-back">
          <ArrowLeft size={15} /> Donations
        </Link>
        <ChevronRight size={14} />
        <span aria-current="page">{d.id}</span>
      </nav>

      {/* ---------- hero ---------- */}
      <section className="aup-hero">
        <div className="aup-hero-main">
          <img
            src={d.image}
            alt={d.title}
            className="aw-hero-img dn-hero-img"
          />
          <div className="aup-hero-info">
            <div className="aup-hero-name">
              <h2>
                {d.title}
                {d.quantity > 1 ? ` ×${d.quantity}` : ""}
              </h2>
              <StatusBadge status={d.status} />
              <WaitChip donation={d} />
            </div>
            <ul className="aup-hero-meta">
              <li>
                <Gift size={14} /> {d.id}
              </li>
              <li>
                <CalendarDays size={14} /> Donated {formatDate(d.donation_date)}{" "}
                ({timeAgo(d.donation_date)})
              </li>
              <li>
                <Scale size={14} /> About {d.weight_kg} kg
              </li>
            </ul>
          </div>
        </div>
        {heroActions.length > 0 && (
          <div className="ao-hero-side">
            <div className="aup-hero-actions">
              {heroActions.map((a) => {
                const Icon = ACTION_ICONS[a.icon];
                return (
                  <button
                    key={a.key}
                    type="button"
                    className={`aup-hero-btn tone-${a.tone}`}
                    onClick={() => setPending(a)}
                  >
                    <Icon size={15} /> {a.short}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* ---------- notices ---------- */}
      {d.status === "Pending" && (
        <div className="aup-notice tone-suspended" role="status">
          <strong>
            {d.overdue
              ? `This donation has been waiting ${d.waitingDays} days for a decision.`
              : "This donation is waiting for your decision."}
          </strong>
          <span>
            Check the item and the donor, then accept it to schedule a free
            pickup or reject it with a reason.
          </span>
        </div>
      )}
      {d.status === "Rejected" && (
        <div className="aup-notice tone-deleted" role="status">
          <strong>This donation was rejected.</strong>
          <span>
            Reason shown to the donor: “{d.reject_reason}”. You can move it back
            to pending if this was a mistake.
          </span>
        </div>
      )}
      {d.donor.status !== "Active" && (
        <p className="apd-warn">
          <AlertTriangle size={15} /> The donor’s account is{" "}
          {d.donor.status.toLowerCase()}. Check the account before accepting
          this donation.
        </p>
      )}

      {/* ---------- progress ---------- */}
      {d.status !== "Rejected" && (
        <section className="aup-card dn-progress">
          <header className="aup-card-head">
            <div>
              <h3>Donation progress</h3>
              <p>From the donor’s offer to the certificate.</p>
            </div>
          </header>
          <Stepper status={d.status} />
        </section>
      )}

      <div className="aup-grid-2">
        {/* ---------- left ---------- */}
        <div className="aup-stack">
          <section className="aup-card">
            <header className="aup-card-head">
              <div>
                <h3>Item details</h3>
                <p>What the donor is giving.</p>
              </div>
            </header>
            <p className="dn-desc">{d.description}</p>
            <dl className="dn-facts">
              <div>
                <dt>Category</dt>
                <dd>{d.category}</dd>
              </div>
              <div>
                <dt>Quantity</dt>
                <dd>{d.quantity}</dd>
              </div>
              <div>
                <dt>Condition</dt>
                <dd>
                  <ConditionTag condition={d.condition} />
                </dd>
              </div>
              <div>
                <dt>Approx. weight</dt>
                <dd>{d.weight_kg} kg</dd>
              </div>
              <div>
                <dt>Donation ID</dt>
                <dd className="aup-mono">{d.id}</dd>
              </div>
              <div>
                <dt>Submitted</dt>
                <dd>{formatDateTime(d.donation_date)}</dd>
              </div>
            </dl>
          </section>

          <section className="aup-card">
            <header className="aup-card-head">
              <div>
                <h3>Donor</h3>
                <p>The user who made this donation.</p>
              </div>
            </header>
            <div className="dn-donor">
              <UserAvatar
                name={d.donor.name}
                src={d.donor.image}
                size={52}
                rounded="15px"
              />
              <div>
                <strong>{d.donor.name}</strong>
                <span>{d.donor.email}</span>
                <StatusBadge status={d.donor.status} />
              </div>
              <Link to={d.donor.path} className="ad-btn ad-btn-ghost ad-btn-sm">
                <ExternalLink size={14} /> View profile
              </Link>
            </div>
            <ul className="dn-contact">
              <li>
                <Phone size={14} /> {d.donor.phone}
              </li>
              <li>
                <Mail size={14} /> {d.donor.email}
              </li>
              <li>
                <MapPin size={14} /> {address}
              </li>
            </ul>
          </section>
        </div>

        {/* ---------- right ---------- */}
        <div className="aup-stack">
          <section className="aup-card">
            <header className="aup-card-head">
              <div>
                <h3>Free pickup</h3>
                <p>ReOrbit collects donations at no cost.</p>
              </div>
            </header>
            {d.pickup_date ? (
              <dl className="ao-txn" style={{ margin: 0 }}>
                <div>
                  <dt>
                    <CalendarClock size={13} /> Date
                  </dt>
                  <dd>{formatDate(d.pickup_date)}</dd>
                </div>
                <div>
                  <dt>Time slot</dt>
                  <dd>{d.pickup_slot}</dd>
                </div>
                <div>
                  <dt>
                    <Truck size={13} /> Pickup team
                  </dt>
                  <dd>{d.partner}</dd>
                </div>
                <div>
                  <dt>Collect from</dt>
                  <dd>{address}</dd>
                </div>
              </dl>
            ) : (
              <p className="ap-muted">
                {d.status === "Rejected"
                  ? "No pickup, because the donation was rejected."
                  : "No pickup yet. It is scheduled when you accept the donation."}
              </p>
            )}
          </section>

          {d.status === "Completed" && (
            <section className="aup-card dn-cert">
              <header className="aup-card-head">
                <div>
                  <h3>Certificate</h3>
                  <p>Issued to the donor.</p>
                </div>
                <Award size={20} />
              </header>
              <dl className="ao-txn" style={{ margin: 0 }}>
                <div>
                  <dt>Certificate no.</dt>
                  <dd className="aup-mono">{d.certificate_id}</dd>
                </div>
                <div>
                  <dt>
                    <HeartHandshake size={13} /> Given to
                  </dt>
                  <dd>{d.ngo}</dd>
                </div>
              </dl>
              <button
                type="button"
                className="ad-btn ad-btn-ghost ad-btn-sm"
                style={{ marginTop: 14 }}
                onClick={() =>
                  toast("Certificate download is not connected yet (UI only).")
                }
              >
                <Download size={14} /> Download certificate
              </button>
            </section>
          )}

          <section className="aup-card">
            <header className="aup-card-head">
              <div>
                <h3>Donation history</h3>
                <p>Every step so far.</p>
              </div>
            </header>
            <ol className="apd-tl">
              {[...d.events].reverse().map((e) => (
                <li key={e.id}>
                  <i className={`apd-dot ${e.tone}`} />
                  <div>
                    <strong>{e.label}</strong>
                    <p>{e.detail}</p>
                    <time>{formatDateTime(e.at)}</time>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      <DonationActionModal
        action={pending}
        targets={[d.id]}
        onConfirm={confirmAction}
        onClose={() => setPending(null)}
      />
      {toastNode}
    </div>
  );
}
