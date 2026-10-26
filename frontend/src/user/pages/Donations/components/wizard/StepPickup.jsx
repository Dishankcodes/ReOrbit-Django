import React from "react";
import { BadgeCheck, CheckCircle2, MapPin, Plus, TriangleAlert } from "lucide-react";
import { SAVED_ADDRESSES, checkPincode } from "../../../../data/donationsStore";
import DateSlotPicker from "../DateSlotPicker";

export default function StepPickup({ form, set, errors }) {
  const pin = checkPincode(form.pincode);

  return (
    <div className="dn-form">
      <div className="dn-banner">
        <BadgeCheck size={20} />
        <div>
          <strong>Pickup is always free for donations</strong>
          Our team collects from your doorstep. There are no delivery or handling charges.
        </div>
      </div>

      {/* address */}
      <div className="dn-field">
        <span className="dn-label">
          Pickup address <em>*</em>
        </span>
        <div className="dn-addrs" role="radiogroup" aria-label="Pickup address">
          {SAVED_ADDRESSES.map((address) => {
            const active = !form.useNewAddress && form.addressId === address.id;
            return (
              <button
                type="button"
                key={address.id}
                role="radio"
                aria-checked={active}
                className={`dn-addr ${active ? "is-active" : ""}`}
                onClick={() => {
                  set("useNewAddress", false);
                  set("addressId", address.id);
                }}
              >
                <span className="dn-addr-icon"><MapPin size={17} /></span>
                <div>
                  <strong>{address.label}</strong>
                  <p>{address.line}</p>
                  <small>{address.city}, {address.state} – {address.pincode}</small>
                </div>
                {active && <CheckCircle2 size={19} className="dn-addr-check" />}
              </button>
            );
          })}

          <button
            type="button"
            role="radio"
            aria-checked={form.useNewAddress}
            className={`dn-addr dn-addr--new ${form.useNewAddress ? "is-active" : ""}`}
            onClick={() => set("useNewAddress", true)}
          >
            <span className="dn-addr-icon"><Plus size={17} /></span>
            <div>
              <strong>Use a different address</strong>
              <p>Pickup from another place</p>
            </div>
            {form.useNewAddress && <CheckCircle2 size={19} className="dn-addr-check" />}
          </button>
        </div>

        {form.useNewAddress && (
          <div className="dn-newaddr">
            <label className="dn-field">
              <span className="dn-label">Address <em>*</em></span>
              <input
                className={`dn-input ${errors.line ? "is-error" : ""}`}
                value={form.line}
                placeholder="House / flat no., building, street, area"
                onChange={(event) => set("line", event.target.value)}
              />
              {errors.line && <span className="dn-error">{errors.line}</span>}
            </label>
            <label className="dn-field">
              <span className="dn-label">Pincode <em>*</em></span>
              <input
                className={`dn-input ${errors.pincode ? "is-error" : ""}`}
                value={form.pincode}
                inputMode="numeric"
                maxLength={6}
                placeholder="6-digit pincode"
                onChange={(event) => set("pincode", event.target.value.replace(/\D/g, ""))}
              />
              {pin.valid && pin.serviceable && (
                <span className="dn-ok"><CheckCircle2 size={14} /> We pick up in {pin.city}</span>
              )}
              {pin.valid && !pin.serviceable && (
                <span className="dn-error">
                  <TriangleAlert size={14} /> Sorry, we don't pick up from this pincode yet.
                </span>
              )}
              {errors.pincode && !pin.valid && <span className="dn-error">{errors.pincode}</span>}
            </label>
          </div>
        )}
      </div>

      {/* contact */}
      <div className="dn-two">
        <label className="dn-field">
          <span className="dn-label">Contact name <em>*</em></span>
          <input
            className={`dn-input ${errors.contactName ? "is-error" : ""}`}
            value={form.contactName}
            onChange={(event) => set("contactName", event.target.value)}
          />
          {errors.contactName && <span className="dn-error">{errors.contactName}</span>}
        </label>
        <label className="dn-field">
          <span className="dn-label">Phone number <em>*</em></span>
          <input
            className={`dn-input ${errors.phone ? "is-error" : ""}`}
            value={form.phone}
            inputMode="tel"
            placeholder="+91 98xxx xxxxx"
            onChange={(event) => set("phone", event.target.value)}
          />
          {errors.phone && <span className="dn-error">{errors.phone}</span>}
        </label>
      </div>

      <DateSlotPicker
        date={form.date}
        slot={form.slot}
        onDate={(value) => set("date", value)}
        onSlot={(value) => set("slot", value)}
        error={errors.schedule}
      />

      <label className="dn-field">
        <span className="dn-label">Note for the pickup team <span className="dn-hint">(optional)</span></span>
        <textarea
          className="dn-textarea"
          style={{ minHeight: 80 }}
          maxLength={200}
          value={form.note}
          placeholder="Landmark, floor, who to call at the gate…"
          onChange={(event) => set("note", event.target.value)}
        />
      </label>
    </div>
  );
}
