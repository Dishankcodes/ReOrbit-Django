import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Ban,
  CalendarClock,
  CalendarDays,
  Check,
  KeyRound,
  ListChecks,
  MapPin,
  Phone,
  ShieldCheck,
  Truck,
  BadgeCheck,
  Info,
} from "lucide-react";

import {
  canReschedule,
  reschedulePickup,
  updatePickupNote,
  useDonation,
} from "../../data/donationsStore";
import { formatLongDate, relativeDay, toDateInput } from "../../utils/format";
import Crumbs from "../../components/ui/Crumbs";
import DateSlotPicker from "./components/DateSlotPicker";
import SafeImage from "../../components/ui/SafeImage";
import DonationNotFound from "./components/DonationNotFound";
import { StatusBadge } from "./components/DonationBadges";
import useToast from "../../components/ui/useToast";

import "../../css/shared/ui-base.css";
import "../../css/donations/UserDonationPickup.css";

const RESCHEDULE_REASONS = ["Not available at that time", "Item isn't ready yet", "Travelling", "Other"];

const CHECKLIST = [
  "Item is clean, dry and complete",
  "Fragile items are wrapped or boxed",
  "Clothes and books are bagged or tied",
  "Everything matches the photos you uploaded",
  "Someone will be home during the slot",
];

const PICKUP_STEPS = [
  { key: "Pending", label: "Requested" },
  { key: "Scheduled", label: "Booked" },
  { key: "Picked_Up", label: "Collected" },
  { key: "Received", label: "At warehouse" },
];

export default function UserDonationPickup() {
  const { donationId } = useParams();
  const donation = useDonation(donationId);
  const { toast, show } = useToast();

  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [reason, setReason] = useState(RESCHEDULE_REASONS[0]);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [checked, setChecked] = useState([]);

  useEffect(() => {
    if (donation) setNote(donation.pickup.note || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [donation?.id]);

  if (!donation) return <DonationNotFound />;

  const { pickup, status } = donation;
  const closed = status === "Rejected" || status === "Cancelled";
  const editable = canReschedule(donation);
  const beforeCollection = ["Pending", "Scheduled"].includes(status);
  const reached = Math.max(0, PICKUP_STEPS.findIndex((s) => s.key === (status === "Completed" ? "Received" : status)));
  const left = 2 - pickup.rescheduleCount;

  const startEdit = () => {
    setDate(pickup.date ? toDateInput(pickup.date) : "");
    setSlot(pickup.slot || "");
    setError("");
    setEditing(true);
  };

  const saveReschedule = () => {
    if (!date || !slot) {
      setError("Choose a new date and time slot.");
      return;
    }
    if (pickup.date && toDateInput(pickup.date) === date && pickup.slot === slot) {
      setError("That's the same as your current pickup. Pick a different date or slot.");
      return;
    }
    reschedulePickup(donation.id, { date, slot, reason });
    setEditing(false);
    show("Pickup rescheduled. We've told the pickup team.");
  };

  const toggle = (index) =>
    setChecked((current) =>
      current.includes(index) ? current.filter((i) => i !== index) : [...current, index],
    );

  return (
    <div className="dn dn-pickup">
      <Crumbs
        items={[
          { label: "Donations", to: "/user-donations" },
          { label: donation.id, to: `/user-donations/${donation.id}` },
          { label: "Pickup" },
        ]}
      />

      <header className="dn-pk-head">
        <div>
          <span className="dn-eyebrow">Pickup manager</span>
          <h1>Your free pickup</h1>
          <p className="dn-muted">Reschedule, share notes and get ready for the handover.</p>
        </div>
        <Link to={`/user-donations/${donation.id}`} className="dn-btn dn-btn--ghost">
          View donation
        </Link>
      </header>

      {/* donation strip */}
      <article className="dn-card dn-pk-strip">
        <SafeImage src={donation.images[0]} alt={donation.title} />
        <div>
          <span className="dn-dcard-id">{donation.id}</span>
          <h3>{donation.title}</h3>
          <p className="dn-muted">
            {donation.quantity} {donation.quantity === 1 ? "item" : "items"} · {donation.category}
          </p>
        </div>
        <StatusBadge status={status} />
      </article>

      {closed ? (
        <div className="dn-banner dn-banner--warn">
          <Info size={20} />
          <div>
            <strong>No pickup for this donation</strong>
            This donation is {status === "Rejected" ? "not accepted" : "cancelled"}, so no pickup is booked.
          </div>
        </div>
      ) : (
        <div className="dn-pk-layout">
          <div className="dn-pk-main">
            {/* status */}
            <section className="dn-card dn-card-pad">
              <div className="dn-card-head">
                <div>
                  <h2>Pickup status</h2>
                  <small>
                    {status === "Pending" && "We're confirming your slot, usually within 24 hours."}
                    {status === "Scheduled" && `${relativeDay(pickup.date)} · ${pickup.slot}`}
                    {status === "Picked_Up" && "Collected from your address."}
                    {["Received", "Completed"].includes(status) && "Collected and checked in at our warehouse."}
                  </small>
                </div>
                <span className="dn-chip"><BadgeCheck size={14} /> No charge</span>
              </div>

              <ol className="dn-pk-steps">
                {PICKUP_STEPS.map((step, index) => (
                  <li key={step.key} className={index < reached ? "is-done" : index === reached ? "is-current" : ""}>
                    <span>{index < reached || status === "Completed" ? <Check size={15} /> : index + 1}</span>
                    <strong>{step.label}</strong>
                  </li>
                ))}
              </ol>
            </section>

            {/* schedule */}
            <section className="dn-card dn-card-pad">
              <div className="dn-card-head">
                <div>
                  <h2>Schedule</h2>
                  <small>
                    {editable
                      ? `You can reschedule ${left} more ${left === 1 ? "time" : "times"}.`
                      : beforeCollection
                        ? "You've used all reschedules. Contact support for changes."
                        : "Pickup is done. The schedule is locked."}
                  </small>
                </div>
                {editable && !editing && (
                  <button type="button" className="dn-btn dn-btn--soft dn-btn--sm" onClick={startEdit}>
                    <CalendarClock size={15} /> Reschedule
                  </button>
                )}
              </div>

              {!editing ? (
                <div className="dn-pk-when">
                  <span className="dn-pk-when-icon"><CalendarDays size={22} /></span>
                  <div>
                    <strong>{pickup.date ? formatLongDate(pickup.date) : "Awaiting date"}</strong>
                    <span>{pickup.slot}</span>
                  </div>
                  {pickup.date && <em>{relativeDay(pickup.date)}</em>}
                </div>
              ) : (
                <div className="dn-pk-edit">
                  <DateSlotPicker date={date} slot={slot} onDate={setDate} onSlot={setSlot} error={error} />
                  <label className="dn-field">
                    <span className="dn-label">Reason</span>
                    <select className="dn-select" value={reason} onChange={(event) => setReason(event.target.value)}>
                      {RESCHEDULE_REASONS.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                  <div className="dn-pk-edit-actions">
                    <button type="button" className="dn-btn dn-btn--ghost" onClick={() => setEditing(false)}>
                      Keep current
                    </button>
                    <button type="button" className="dn-btn" onClick={saveReschedule}>
                      Confirm new pickup
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* address + notes */}
            <section className="dn-card dn-card-pad">
              <div className="dn-card-head"><h2>Address & notes</h2></div>
              <div className="dn-pk-addr">
                <span><MapPin size={18} /></span>
                <div>
                  <strong>{pickup.address.label}</strong>
                  <p>{pickup.address.line}</p>
                  <small>{pickup.address.city}, {pickup.address.state} – {pickup.address.pincode}</small>
                </div>
              </div>

              <label className="dn-field" style={{ marginTop: 16 }}>
                <span className="dn-label">Note for the pickup team</span>
                <textarea
                  className="dn-textarea"
                  style={{ minHeight: 84 }}
                  maxLength={200}
                  value={note}
                  disabled={!beforeCollection}
                  placeholder="Landmark, floor, gate number…"
                  onChange={(event) => setNote(event.target.value)}
                />
              </label>
              {beforeCollection && (
                <button
                  type="button"
                  className="dn-btn dn-btn--soft dn-btn--sm"
                  style={{ marginTop: 12 }}
                  disabled={note === (pickup.note || "")}
                  onClick={() => {
                    updatePickupNote(donation.id, note.trim());
                    show("Note saved for the pickup team.");
                  }}
                >
                  Save note
                </button>
              )}
              <p className="dn-hint" style={{ marginTop: 12 }}>
                To change the address, cancel this donation and create a new one.
              </p>
            </section>
          </div>

          <aside className="dn-pk-side">
            {/* partner */}
            <section className="dn-card dn-card-pad">
              <div className="dn-card-head"><h3>Pickup partner</h3></div>
              {pickup.partner ? (
                <div className="dn-pk-partner">
                  <span className="dn-pk-avatar">{pickup.partner.name.charAt(0)}</span>
                  <div>
                    <strong>{pickup.partner.name}</strong>
                    <small>{pickup.partner.team}</small>
                  </div>
                  {["Scheduled", "Picked_Up"].includes(status) && (
                    <a
                      href={`tel:${pickup.partner.phone.replace(/\s/g, "")}`}
                      className="dn-pk-call"
                      aria-label={`Call ${pickup.partner.name}`}
                    >
                      <Phone size={16} />
                    </a>
                  )}
                </div>
              ) : (
                <div className="dn-pk-wait">
                  <Truck size={20} />
                  <p>A pickup partner will be assigned once your donation is accepted.</p>
                </div>
              )}
            </section>

            {/* handover code */}
            {status === "Scheduled" && (
              <section className="dn-card dn-pk-code">
                <KeyRound size={22} />
                <small>Handover code</small>
                <strong>{pickup.handoverCode.split("").join(" ")}</strong>
                <p>Share this 4-digit code with the pickup partner only when they collect your item.</p>
              </section>
            )}

            {/* checklist */}
            {beforeCollection && (
              <section className="dn-card dn-card-pad">
                <div className="dn-card-head">
                  <h3><ListChecks size={18} style={{ verticalAlign: "-3px" }} /> Before we arrive</h3>
                  <span className="dn-chip">{checked.length}/{CHECKLIST.length}</span>
                </div>
                <ul className="dn-pk-check">
                  {CHECKLIST.map((item, index) => (
                    <li key={item}>
                      <label>
                        <input type="checkbox" checked={checked.includes(index)} onChange={() => toggle(index)} />
                        <span>{item}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="dn-card dn-card-pad dn-pk-safe">
              <ShieldCheck size={22} />
              <div>
                <strong>Safe & verified</strong>
                <p>Our partners carry a ReOrbit ID and never ask for payment.</p>
              </div>
            </section>

            {beforeCollection && (
              <Link to={`/user-donations/${donation.id}`} className="dn-btn dn-btn--danger dn-btn--block">
                <Ban size={16} /> Cancel donation from details
              </Link>
            )}
          </aside>
        </div>
      )}

      {toast}
    </div>
  );
}
