import React, { useEffect, useState } from "react";
import { X, AlertTriangle, CalendarClock, HeartHandshake } from "lucide-react";
import { ACTION_ICONS } from "../../../components/ui/actionIcons";
import {
  SLOTS,
  NGOS,
  REJECT_CHIPS,
  FAILED_PICKUP_CHIPS,
  CONDITIONS,
} from "../../../data/donationActions";
import { useTeamOptions } from "../../../data/pickupTeamsStore";
import { useRewardOptions } from "../../../data/donationsStore";

/* Real calendar days (local time). The server refuses pickup dates in the past. */
const isoDay = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/* Confirm modal that also asks for what the action needs:
   a pickup date + slot (accept / reschedule), a reason (reject) or an NGO (complete). */
export default function DonationActionModal({
  action,
  targets = [],
  donation = null,
  onConfirm,
  onClose,
}) {
  const [date, setDate] = useState(isoDay(2));
  const [slot, setSlot] = useState(SLOTS[0]);
  const teams = useTeamOptions();
  const [partner, setPartner] = useState("");
  const [reason, setReason] = useState("");
  const [ngo, setNgo] = useState(NGOS[0]);
  const [code, setCode] = useState("");
  const [acceptedQty, setAcceptedQty] = useState("");
  const [partialReason, setPartialReason] = useState("");
  const [receivedQty, setReceivedQty] = useState("");
  const [receivedCondition, setReceivedCondition] = useState("");
  const [receivedNote, setReceivedNote] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [points, setPoints] = useState("");
  const [voucherAmount, setVoucherAmount] = useState("");
  /* order pickups ("Managed by ReOrbit"): an optional partner courier and its tracking number */
  const [courierName, setCourierName] = useState("");
  const [trackingNo, setTrackingNo] = useState("");
  const voucherTiers = useRewardOptions();
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!action) return undefined;
    setDate(isoDay(2));
    setSlot(SLOTS[0]);
    setPartner("");
    setReason("");
    setNgo(NGOS[0]);
    setCode("");
    setAcceptedQty("");
    setPartialReason("");
    setReceivedQty("");
    setReceivedCondition("");
    setReceivedNote("");
    setWeightKg("");
    setPoints("");
    setVoucherAmount("");
    setCourierName("");
    setTrackingNo("");
    setTouched(false);
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [action, onClose]);

  /* keep the chosen team valid: default to the first ready team, drop one that was paused */
  useEffect(() => {
    if (!action) return;
    if (!teams.some((t) => t.name === partner))
      setPartner(teams[0]?.name || "");
  }, [action, teams, partner]);

  if (!action) return null;
  const chosen = teams.find((t) => t.name === partner);
  const load = chosen && date ? chosen.loadOn(date) : 0;
  const noTeams = action.fields === "schedule" && teams.length === 0;
  const Icon = ACTION_ICONS[action.icon] || AlertTriangle;
  const many = targets.length > 1;
  const reasonMissing = action.fields === "reason" && reason.trim().length < 5;
  const dateMissing = action.fields === "schedule" && !date;
  const teamMissing = action.fields === "schedule" && !chosen;
  const codeMissing = action.fields === "code" && code.trim().length !== 4;
  /* Partial acceptance only makes sense for one donation with more than one item. */
  const showPartialAccept =
    action.key === "accept" && !many && donation && donation.quantity > 1;
  const partialWanted =
    showPartialAccept &&
    acceptedQty !== "" &&
    Number(acceptedQty) < donation.quantity;
  const acceptedQtyInvalid =
    showPartialAccept &&
    acceptedQty !== "" &&
    (Number(acceptedQty) < 1 || Number(acceptedQty) > donation.quantity);
  const partialReasonMissing = partialWanted && partialReason.trim().length < 5;
  /* What the donor gets is decided by ReOrbit: at Accept, or at the warehouse when it's
     received (that one wins). Blank = worked out from what actually arrived, never below ₹100. */
  const showRewardChoice = (action.key === "accept" || action.key === "received") && !many;
  const weightInvalid =
    action.fields === "receive" && weightKg !== "" && !(Number(weightKg) > 0 && Number(weightKg) < 10000);
  const pointsInvalid =
    showRewardChoice && points !== "" && (!/^\d+$/.test(points) || Number(points) < 0);
  const voucherAmountInvalid =
    showRewardChoice && voucherAmount !== "" && !voucherTiers.includes(Number(voucherAmount));

  const promised = donation?.admin_voucher_amount != null || donation?.admin_points != null;
  const autoLabel =
    action.key === "received" && promised
      ? `As set at accept (${donation.admin_voucher_amount != null ? `₹${donation.admin_voucher_amount}` : "automatic"})`
      : donation?.suggested_voucher_amount != null
        ? `Automatic (about ₹${Math.max(100, donation.suggested_voucher_amount)})`
        : "Automatic (at least ₹100)";
  const rewardFields = showRewardChoice && (
    <div className="dn-fields dn-wide">
      <label className="ad-modal-field">
        <span>
          Orbit Points <em>(blank = {action.key === "received" && donation?.admin_points != null ? `${donation.admin_points}, as set at accept` : "automatic"})</em>
        </span>
        <input
          type="number"
          min={0}
          value={points}
          placeholder={
            action.key === "received" && donation?.admin_points != null
              ? String(donation.admin_points)
              : donation?.suggested_points != null
                ? `Suggested: ${donation.suggested_points}`
                : ""
          }
          onChange={(e) => setPoints(e.target.value)}
        />
        {touched && pointsInvalid && (
          <small className="ad-modal-error">Enter a whole number, 0 or more.</small>
        )}
      </label>
      <label className="ad-modal-field">
        <span>
          Voucher <em>(at least ₹100)</em>
        </span>
        <select value={voucherAmount} onChange={(e) => setVoucherAmount(e.target.value)}>
          <option value="">{autoLabel}</option>
          {voucherTiers.map((t) => (
            <option key={t} value={t}>
              ₹{t}
            </option>
          ))}
        </select>
        {touched && voucherAmountInvalid && (
          <small className="ad-modal-error">Choose one of the listed amounts.</small>
        )}
      </label>
      <small className="dn-wide dn-reward-hint">
        {action.key === "accept"
          ? "The donor sees this as soon as you accept. You can still change it when the item reaches the warehouse."
          : "Credited to the donor now. Set it from what you actually received."}
      </small>
    </div>
  );

  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (
      reasonMissing ||
      dateMissing ||
      teamMissing ||
      codeMissing ||
      acceptedQtyInvalid ||
      partialReasonMissing ||
      pointsInvalid ||
      voucherAmountInvalid ||
      weightInvalid
    )
      return;
    onConfirm({
      date,
      slot,
      partner,
      reason: reason.trim(),
      ngo,
      code: code.trim(),
      ...(partialWanted
        ? { accepted_quantity: acceptedQty, partial_reason: partialReason.trim() }
        : {}),
      ...(action.fields === "receive"
        ? {
            received_quantity: receivedQty,
            received_condition: receivedCondition,
            weight_kg: weightKg,
            note: receivedNote.trim(),
          }
        : {}),
      ...(showRewardChoice
        ? { points, voucher_amount: voucherAmount }
        : {}),
      ...(action.fields === "warehouse" ? { note: receivedNote.trim() } : {}),
      ...(action.fields === "courier"
        ? { courier_name: courierName.trim(), tracking_no: trackingNo.trim() }
        : {}),
    });
  };

  return (
    <div
      className="ad-modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        className="ad-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dn-modal-title"
        onSubmit={submit}
      >
        <button
          type="button"
          className="ad-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={16} />
        </button>
        <div className={`ad-modal-icon tone-${action.tone}`}>
          <Icon size={22} strokeWidth={1.7} />
        </div>
        <h3 id="dn-modal-title">
          {many
            ? action.title.replace(
                /this (donation|pickup)/,
                `${targets.length} $1s`,
              )
            : action.title}
        </h3>
        <p className="ad-modal-text">{action.body}</p>

        <div className="ad-modal-targets">
          {targets.slice(0, 3).map((t) => (
            <span key={t}>{t}</span>
          ))}
          {targets.length > 3 && <span>+{targets.length - 3} more</span>}
        </div>

        {action.fields === "schedule" && (
          <div className="dn-fields">
            <label className="ad-modal-field">
              <span>
                <CalendarClock size={13} /> Pickup date
              </span>
              <input
                type="date"
                value={date}
                min={isoDay(1)}
                onChange={(e) => setDate(e.target.value)}
              />
              {touched && dateMissing && (
                <small className="ad-modal-error">
                  Please choose a pickup date.
                </small>
              )}
            </label>
            <label className="ad-modal-field">
              <span>Time slot</span>
              <select value={slot} onChange={(e) => setSlot(e.target.value)}>
                {SLOTS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="ad-modal-field dn-wide">
              <span>
                Pickup team <em>(free for the donor)</em>
              </span>
              <select
                value={partner}
                onChange={(e) => setPartner(e.target.value)}
                disabled={noTeams}
              >
                {teams.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name} · {t.lead} · {t.area}
                  </option>
                ))}
              </select>
              {chosen && (
                <small
                  className={`dn-team-load ${load >= chosen.capacity ? "full" : ""}`}
                >
                  {load >= chosen.capacity
                    ? `${chosen.name} already has ${load} stops that day (limit ${chosen.capacity}). You can still book it, or pick another team.`
                    : `${load} of ${chosen.capacity} stops booked that day. Lead: ${chosen.lead}${chosen.phone ? ` · ${chosen.phone}` : ""}.`}
                </small>
              )}
              {noTeams && (
                <small className="ad-modal-error">
                  No pickup team is ready. Add a team or give a paused team a
                  lead in Pickup teams.
                </small>
              )}
            </label>

            {showPartialAccept && (
              <label className="ad-modal-field dn-wide">
                <span>
                  Items accepted <em>(of {donation.quantity} donated)</em>
                </span>
                <input
                  type="number"
                  min={1}
                  max={donation.quantity}
                  value={acceptedQty}
                  placeholder={String(donation.quantity)}
                  onChange={(e) => setAcceptedQty(e.target.value)}
                />
                {touched && acceptedQtyInvalid && (
                  <small className="ad-modal-error">
                    Enter a number between 1 and {donation.quantity}.
                  </small>
                )}
                {partialWanted && (
                  <textarea
                    aria-label="Why the rest was turned away"
                    rows={2}
                    value={partialReason}
                    onChange={(e) => setPartialReason(e.target.value)}
                    placeholder="e.g. 3 of the 5 chairs are broken beyond use"
                  />
                )}
                {touched && partialReasonMissing && (
                  <small className="ad-modal-error">
                    Say briefly why the rest wasn't accepted (at least 5 characters).
                  </small>
                )}
              </label>
            )}

            {rewardFields}
          </div>
        )}

        {action.fields === "courier" && (
          <>
            <label className="ad-modal-field">
              <span>
                Courier <em>(optional)</em>
              </span>
              <select value={courierName} onChange={(e) => setCourierName(e.target.value)}>
                <option value="">ReOrbit Delivery (our own team)</option>
                {["Delhivery", "Blue Dart", "DTDC", "India Post", "Ecom Express", "Xpressbees", "Shadowfax"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="ad-modal-field">
              <span>
                Tracking number <em>(optional)</em>
              </span>
              <input
                type="text"
                value={trackingNo}
                onChange={(e) => setTrackingNo(e.target.value.toUpperCase())}
                placeholder="Leave empty to use the pickup number"
              />
              <small>The buyer sees this on their order.</small>
            </label>
          </>
        )}

        {action.fields === "code" && (
          <div className="ad-modal-field">
            <span>
              Donor's handover code <em>(ask the donor to read it out)</em>
            </span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="4-digit code"
              autoFocus
            />
            {many && (
              <small className="ad-modal-error">
                Each donation has its own code — this won't match for more than one.
              </small>
            )}
            {touched && codeMissing && (
              <small className="ad-modal-error">Enter the 4-digit code.</small>
            )}
          </div>
        )}

        {action.fields === "receive" && (
          <div className="dn-fields">
            <label className="ad-modal-field">
              <span>
                Quantity received <em>(blank = as declared)</em>
              </span>
              <input
                type="number"
                min={0}
                value={receivedQty}
                onChange={(e) => setReceivedQty(e.target.value)}
              />
            </label>
            <label className="ad-modal-field">
              <span>
                Condition on arrival <em>(blank = as declared)</em>
              </span>
              <select
                value={receivedCondition}
                onChange={(e) => setReceivedCondition(e.target.value)}
              >
                <option value="">As declared</option>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="ad-modal-field">
              <span>
                Measured weight <em>(kg, blank = estimate)</em>
              </span>
              <input
                type="number"
                min={0}
                step="0.1"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder={donation?.weight_kg ? `About ${donation.weight_kg}` : "e.g. 12.5"}
              />
              {touched && weightInvalid && (
                <small className="ad-modal-error">Enter the weight in kg, e.g. 12.5.</small>
              )}
              <small>The donor's impact (waste diverted, CO₂ saved) uses this.</small>
            </label>
            {rewardFields}
            <label className="ad-modal-field dn-wide">
              <span>Note (optional)</span>
              <textarea
                rows={2}
                value={receivedNote}
                onChange={(e) => setReceivedNote(e.target.value)}
                placeholder="e.g. One item arrived broken"
              />
            </label>
          </div>
        )}

        {action.fields === "reason" && (
          <div className="ad-modal-field">
            <span>
              Reason <em>(shown to the donor)</em>
            </span>
            <div className="dn-chips">
              {(action.chips === "failed" ? FAILED_PICKUP_CHIPS : REJECT_CHIPS).map((c) => (
                <button
                  key={c}
                  type="button"
                  className={reason === c ? "on" : ""}
                  onClick={() => setReason(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <textarea
              aria-label="Reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Item is too damaged to be reused"
              autoFocus
            />
            {touched && reasonMissing && (
              <small className="ad-modal-error">
                Please add a short reason (at least 5 characters).
              </small>
            )}
          </div>
        )}

        {action.fields === "warehouse" && (
          <label className="ad-modal-field">
            <span>
              Warehouse note <em>(optional, e.g. shelf or bin)</em>
            </span>
            <input
              type="text"
              maxLength={200}
              value={receivedNote}
              onChange={(e) => setReceivedNote(e.target.value)}
              placeholder="e.g. Rack B · bin 12"
            />
          </label>
        )}

        {action.fields === "ngo" && (
          <label className="ad-modal-field">
            <span>
              <HeartHandshake size={13} /> Given to
            </span>
            <select value={ngo} onChange={(e) => setNgo(e.target.value)}>
              {NGOS.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        )}

        <div className="ad-modal-actions">
          <button
            type="button"
            className="ad-btn ad-btn-ghost"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={
              noTeams ||
              (touched &&
                (codeMissing ||
                  acceptedQtyInvalid ||
                  partialReasonMissing ||
                  pointsInvalid ||
                  voucherAmountInvalid ||
                  weightInvalid))
            }
            className={`ad-btn ad-btn-${action.tone === "positive" ? "primary" : action.tone}`}
          >
            {action.confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
