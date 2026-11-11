import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck,
  CheckCircle2,
  MapPin,
  Plus,
  TriangleAlert,
} from "lucide-react";
import { checkPincode } from "../../../../data/donationsStore";
import { createAddress } from "../../../../data/checkoutStore";
import AddressForm from "../../../Shop/components/AddressForm";
import DateSlotPicker from "../DateSlotPicker";

export default function StepPickup({ form, set, errors, addresses, addressId, loading, error }) {
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  /* a new address goes into the address book and is picked straight away */
  const saveNew = async (values) => {
    setSaving(true);
    setFieldErrors({});
    try {
      const id = await createAddress(values);
      set("addressId", id);
      setAdding(false);
    } catch (e) {
      setFieldErrors(e.errors || {});
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dn-form">
      <div className="dn-banner">
        <BadgeCheck size={20} />
        <div>
          <strong>Pickup is always free for donations</strong>
          Our team collects from your doorstep. There are no delivery or
          handling charges.
        </div>
      </div>

      {/* address */}
      <div className="dn-field">
        <span className="dn-label">
          Pickup address <em>*</em>
        </span>

        {loading && addresses.length === 0 && (
          <p className="dn-hint">Loading your saved addresses…</p>
        )}
        {error && addresses.length === 0 && (
          <p className="dn-error" role="alert">{error}</p>
        )}
        {!loading && !error && addresses.length === 0 && !adding && (
          <p className="dn-hint">You have no saved address yet. Add one to continue.</p>
        )}

        <div className="dn-addrs" role="radiogroup" aria-label="Pickup address">
          {addresses.map((address) => {
            const active = addressId === address.id;
            const covered = checkPincode(address.pincode).serviceable;
            return (
              <button
                type="button"
                key={address.id}
                role="radio"
                aria-checked={active}
                className={`dn-addr ${active ? "is-active" : ""}`}
                onClick={() => set("addressId", address.id)}
              >
                <span className="dn-addr-icon">
                  <MapPin size={17} />
                </span>
                <div>
                  <strong>
                    {address.label}
                    {address.isDefault ? " · Default" : ""}
                  </strong>
                  <p>{address.line}</p>
                  <small>
                    {address.city}, {address.state} – {address.pincode}
                  </small>
                  {!covered && (
                    <small className="dn-error">
                      <TriangleAlert size={12} /> We don't pick up here yet.
                    </small>
                  )}
                </div>
                {active && <CheckCircle2 size={19} className="dn-addr-check" />}
              </button>
            );
          })}

          {!adding && (
            <button
              type="button"
              className="dn-addr dn-addr--new"
              onClick={() => setAdding(true)}
            >
              <span className="dn-addr-icon">
                <Plus size={17} />
              </span>
              <div>
                <strong>Add a new address</strong>
                <p>It is saved to your addresses for next time</p>
              </div>
            </button>
          )}
        </div>

        {adding && (
          <AddressForm
            saving={saving}
            serverErrors={fieldErrors}
            onCancel={() => setAdding(false)}
            onSave={saveNew}
          />
        )}

        <span className="dn-hint">
          <Link to="/user-addresses">Manage your addresses</Link>
        </span>
      </div>

      {/* contact */}
      <div className="dn-two">
        <label className="dn-field">
          <span className="dn-label">
            Contact name <em>*</em>
          </span>
          <input
            className={`dn-input ${errors.contactName ? "is-error" : ""}`}
            value={form.contactName}
            onChange={(event) => set("contactName", event.target.value)}
          />
          {errors.contactName && (
            <span className="dn-error">{errors.contactName}</span>
          )}
        </label>
        <label className="dn-field">
          <span className="dn-label">
            Phone number <em>*</em>
          </span>
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
        <span className="dn-label">
          Note for the pickup team <span className="dn-hint">(optional)</span>
        </span>
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
