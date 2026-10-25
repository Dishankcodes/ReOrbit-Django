import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Award,
  Ban,
  CalendarDays,
  CircleHelp,
  Clock,
  Download,
  HandHeart,
  MapPin,
  Package,
  Phone,
  RotateCcw,
  Scale,
  Star,
  Truck,
  TriangleAlert,
  Wind,
  CalendarClock,
  Info,
  Heart,
} from "lucide-react";

import {
  CANCEL_REASONS,
  REWARD_RULES,
  canCancel,
  canReschedule,
  cancelDonation,
  estimatePoints,
  useDonation,
} from "../../data/donationsStore";
import {
  formatDate,
  formatDateTime,
  formatLongDate,
  kg,
  relativeDay,
} from "../../utils/format";
import Crumbs from "../../components/ui/Crumbs";
import ConfirmModal from "../../components/ui/ConfirmModal";
import SafeImage from "../../components/ui/SafeImage";
import DonationNotFound from "./components/DonationNotFound";
import DonationTimeline from "./components/DonationTimeline";
import ProgressTracker from "./components/ProgressTracker";
import useToast from "../../components/ui/useToast";
import { ConditionBadge, StatusBadge } from "./components/DonationBadges";
import { categoryIcon } from "./components/categoryIcons";

import "../../css/shared/ui-base.css";
import "../../css/donations/UserDonationDetails.css";

export default function UserDonationDetails() {
  const { donationId } = useParams();
  const navigate = useNavigate();
  const donation = useDonation(donationId);
  const { toast, show } = useToast();

  const [photo, setPhoto] = useState(0);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState(CANCEL_REASONS[0]);

  if (!donation) return <DonationNotFound />;

  const { pickup, status } = donation;
  const Icon = categoryIcon(donation.category);
  const co2 = Math.round(donation.weightKg * REWARD_RULES.co2PerKg * 10) / 10;
  const points = estimatePoints(donation.quantity);
  const completed = status === "Completed";
  const closed = status === "Rejected" || status === "Cancelled";
  const hasPickup = Boolean(pickup.date) && !closed;

  const confirmCancel = () => {
    cancelDonation(donation.id, reason);
    setCancelling(false);
    show("Donation cancelled.");
  };

  return (
    <div className="dn dn-details">
      <Crumbs
        items={[
          { label: "Donations", to: "/user-donations" },
          { label: "History", to: "/user-donations/history" },
          { label: donation.id },
        ]}
      />

      {/* ---------- header ---------- */}
      <header className="dn-det-head">
        <div>
          <div className="dn-det-meta">
            <span className="dn-dcard-id">{donation.id}</span>
            <StatusBadge status={status} />
          </div>
          <h1>{donation.title}</h1>
          <p className="dn-muted">
            Submitted on {formatDate(donation.createdAt)} · {donation.quantity}{" "}
            {donation.quantity === 1 ? "item" : "items"} in {donation.category}
          </p>
        </div>

        <div className="dn-det-actions">
          {completed && (
            <Link
              to={`/user-donations/${donation.id}/certificate`}
              className="dn-btn"
            >
              <Download size={16} /> Certificate
            </Link>
          )}
          {canReschedule(donation) && (
            <Link
              to={`/user-donations/${donation.id}/pickup`}
              className="dn-btn dn-btn--ghost"
            >
              <CalendarClock size={16} /> Manage pickup
            </Link>
          )}
          {closed && (
            <Link
              to={`/user-donations/new?repeat=${donation.id}`}
              className="dn-btn"
            >
              <RotateCcw size={16} /> Donate again
            </Link>
          )}
          {canCancel(donation) && (
            <button
              type="button"
              className="dn-btn dn-btn--danger"
              onClick={() => setCancelling(true)}
            >
              <Ban size={16} /> Cancel
            </button>
          )}
        </div>
      </header>

      {/* ---------- status banner ---------- */}
      {status === "Rejected" && (
        <div className="dn-banner dn-banner--bad dn-det-banner">
          <TriangleAlert size={20} />
          <div>
            <strong>This donation couldn't be accepted</strong>
            {donation.rejectReason}
          </div>
        </div>
      )}
      {status === "Cancelled" && (
        <div className="dn-banner dn-banner--warn dn-det-banner">
          <Info size={20} />
          <div>
            <strong>You cancelled this donation</strong>
            Reason: {donation.cancelReason}
          </div>
        </div>
      )}
      {status === "Pending" && (
        <div className="dn-banner dn-banner--warn dn-det-banner">
          <Clock size={20} />
          <div>
            <strong>Waiting for review</strong>
            Our team usually confirms within 24 hours. You'll be notified when
            your pickup is booked.
          </div>
        </div>
      )}
      {status === "Scheduled" && (
        <div className="dn-banner dn-det-banner">
          <Truck size={20} />
          <div>
            <strong>
              Pickup {relativeDay(pickup.date).toLowerCase()} ·{" "}
              {formatLongDate(pickup.date)}
            </strong>
            {pickup.slot}. Keep the item packed and ready at your door.
          </div>
        </div>
      )}
      {completed && (
        <div className="dn-banner dn-det-banner">
          <Award size={20} />
          <div>
            <strong>Delivered to {donation.ngo?.name}</strong>
            Thank you! Your certificate is ready and {points} Orbit Points have
            been credited.
          </div>
        </div>
      )}

      <div className="dn-det-layout">
        {/* ================= main ================= */}
        <div className="dn-det-main">
          <section className="dn-card dn-det-gallery">
            <div className="dn-det-photo">
              <SafeImage src={donation.images[photo]} alt={donation.title} />
            </div>
            {donation.images.length > 1 && (
              <div className="dn-det-thumbs">
                {donation.images.map((src, index) => (
                  <button
                    type="button"
                    key={`${src}-${index}`}
                    className={index === photo ? "is-active" : ""}
                    onClick={() => setPhoto(index)}
                    aria-label={`Show photo ${index + 1}`}
                  >
                    <SafeImage src={src} alt="" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="dn-card dn-card-pad">
            <div className="dn-card-head">
              <div>
                <h2>Donation progress</h2>
                <small>
                  {closed
                    ? "This donation was closed."
                    : "Follow your donation from your door to an NGO."}
                </small>
              </div>
            </div>
            <ProgressTracker donation={donation} />
          </section>

          <section className="dn-card dn-card-pad">
            <div className="dn-card-head">
              <h2>Item details</h2>
              <ConditionBadge condition={donation.condition} />
            </div>
            <p className="dn-det-desc">{donation.description}</p>
            <dl className="dn-det-facts">
              <div>
                <dt>
                  <Icon size={15} /> Category
                </dt>
                <dd>{donation.category}</dd>
              </div>
              <div>
                <dt>
                  <Package size={15} /> Quantity
                </dt>
                <dd>{donation.quantity}</dd>
              </div>
              <div>
                <dt>
                  <Scale size={15} /> Est. weight
                </dt>
                <dd>{kg(donation.weightKg)}</dd>
              </div>
              <div>
                <dt>
                  <CalendarDays size={15} /> Submitted
                </dt>
                <dd>{formatDateTime(donation.createdAt)}</dd>
              </div>
            </dl>
          </section>

          <section className="dn-card dn-card-pad">
            <div className="dn-card-head">
              <div>
                <h2>Activity</h2>
                <small>Every update on this donation</small>
              </div>
            </div>
            <DonationTimeline events={donation.events} />
          </section>
        </div>

        {/* ================= side ================= */}
        <aside className="dn-det-side">
          {hasPickup && (
            <section className="dn-card dn-card-pad">
              <div className="dn-card-head">
                <h3>Pickup</h3>
                <span className="dn-chip">Free</span>
              </div>
              <ul className="dn-det-list">
                <li>
                  <CalendarDays size={16} />
                  <div>
                    <strong>{formatLongDate(pickup.date)}</strong>
                    <span>{pickup.slot}</span>
                  </div>
                </li>
                <li>
                  <MapPin size={16} />
                  <div>
                    <strong>{pickup.address.label}</strong>
                    <span>
                      {pickup.address.line}, {pickup.address.city} –{" "}
                      {pickup.address.pincode}
                    </span>
                  </div>
                </li>
                <li>
                  <Truck size={16} />
                  <div>
                    <strong>
                      {pickup.partner ? pickup.partner.name : "To be assigned"}
                    </strong>
                    <span>
                      {pickup.partner
                        ? pickup.partner.team
                        : "We assign a partner once accepted"}
                    </span>
                  </div>
                </li>
              </ul>
              {pickup.partner &&
                ["Scheduled", "Picked_Up"].includes(status) && (
                  <a
                    href={`tel:${pickup.partner.phone.replace(/\s/g, "")}`}
                    className="dn-btn dn-btn--soft dn-btn--sm dn-btn--block"
                  >
                    <Phone size={14} /> Call {pickup.partner.name.split(" ")[0]}
                  </a>
                )}
              {["Pending", "Scheduled"].includes(status) && (
                <Link
                  to={`/user-donations/${donation.id}/pickup`}
                  className="dn-link"
                  style={{ marginTop: 14 }}
                >
                  Open pickup manager →
                </Link>
              )}
            </section>
          )}

          {completed && (
            <section className="dn-card dn-det-cert">
              <Award size={30} />
              <h3>Donation certificate</h3>
              <p>
                {donation.certificateId} · issued for your gift to{" "}
                {donation.ngo?.name}.
              </p>
              <Link
                to={`/user-donations/${donation.id}/certificate`}
                className="dn-btn dn-btn--sm dn-btn--block"
              >
                View & download
              </Link>
            </section>
          )}

          {completed && donation.ngo && (
            <section className="dn-card dn-card-pad">
              <div className="dn-card-head">
                <h3>Where it went</h3>
              </div>
              <div className="dn-det-ngo">
                <span>
                  <Heart size={20} />
                </span>
                <div>
                  <strong>{donation.ngo.name}</strong>
                  <small>{donation.ngo.city}</small>
                </div>
              </div>
            </section>
          )}

          <section className="dn-card dn-card-pad">
            <div className="dn-card-head">
              <h3>Impact</h3>
              {!completed && !closed && (
                <span className="dn-chip">Estimated</span>
              )}
            </div>
            <div className="dn-det-impact">
              <div>
                <Star size={17} />
                <strong>{closed ? 0 : points}</strong>
                <span>{completed ? "Points credited" : "Orbit Points"}</span>
              </div>
              <div>
                <Scale size={17} />
                <strong>{closed ? "0 kg" : kg(donation.weightKg)}</strong>
                <span>Waste diverted</span>
              </div>
              <div>
                <Wind size={17} />
                <strong>{closed ? "0 kg" : `${co2} kg`}</strong>
                <span>CO₂ saved</span>
              </div>
            </div>
            {!completed && !closed && (
              <p className="dn-hint" style={{ marginTop: 12 }}>
                Points are credited when the donation is completed and the
                certificate is issued.
              </p>
            )}
          </section>

          <section className="dn-card dn-card-pad dn-det-help">
            <CircleHelp size={22} />
            <div>
              <strong>Need help with this donation?</strong>
              <p>
                Our support team can help with pickups, rejections or
                certificates.
              </p>
              <Link to="/user-help" className="dn-link">
                Contact support →
              </Link>
            </div>
          </section>
        </aside>
      </div>

      {cancelling && (
        <ConfirmModal
          icon={Ban}
          title="Cancel this donation?"
          confirmLabel="Yes, cancel donation"
          onClose={() => setCancelling(false)}
          onConfirm={confirmCancel}
        >
          <p>
            {donation.id} · {donation.title} will be cancelled and any booked
            pickup will be released. You can always donate it again later.
          </p>
          <label className="dn-field">
            <span className="dn-label">Why are you cancelling?</span>
            <select
              className="dn-select"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            >
              {CANCEL_REASONS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </ConfirmModal>
      )}

      {toast}
    </div>
  );
}
