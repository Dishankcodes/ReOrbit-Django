import React, { useState } from "react";

const EMPTY = {
  label: "Other",
  name: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
};

/* Add a new delivery address (inline, validated). */
export default function AddressForm({ onSave, onCancel }) {
  const [f, setF] = useState(EMPTY);
  const [touched, setTouched] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const err = {
    name: f.name.trim().length < 3,
    phone: !/^\+?[\d\s-]{10,14}$/.test(f.phone.trim()),
    address: f.address.trim().length < 6,
    city: f.city.trim().length < 2,
    state: f.state.trim().length < 2,
    pincode: !/^\d{6}$/.test(f.pincode.trim()),
  };
  const bad = Object.values(err).some(Boolean);
  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!bad)
      onSave({
        ...f,
        name: f.name.trim(),
        address: f.address.trim(),
        city: f.city.trim(),
        state: f.state.trim(),
        pincode: f.pincode.trim(),
        phone: f.phone.trim(),
      });
  };
  const field = (k, label, props = {}) => (
    <label className={`sh-field ${props.wide ? "wide" : ""}`}>
      <span>{label}</span>
      <input
        value={f[k]}
        onChange={(e) => set(k, e.target.value)}
        {...props.input}
        aria-invalid={touched && err[k]}
      />
      {touched && err[k] && <small>{props.msg}</small>}
    </label>
  );
  return (
    <form className="sh-addr-form" onSubmit={submit} noValidate>
      <h4>New delivery address</h4>
      <div className="sh-form-grid">
        {field("name", "Full name", { msg: "Enter the receiver's name." })}
        {field("phone", "Phone", {
          msg: "Enter a valid phone number.",
          input: { inputMode: "tel", placeholder: "+91 98765 43210" },
        })}
        {field("address", "Address", {
          wide: true,
          msg: "Add the street and building.",
          input: { placeholder: "Flat, building, street" },
        })}
        {field("city", "City", { msg: "Enter the city." })}
        {field("state", "State", { msg: "Enter the state." })}
        {field("pincode", "Pincode", {
          msg: "Pincode must be 6 digits.",
          input: { inputMode: "numeric", maxLength: 6 },
        })}
        <label className="sh-field">
          <span>Save as</span>
          <select
            value={f.label}
            onChange={(e) => set("label", e.target.value)}
          >
            <option>Warehouse</option>
            <option>Office</option>
            <option>Other</option>
          </select>
        </label>
      </div>
      <div className="sh-form-actions">
        <button
          type="button"
          className="ad-btn ad-btn-ghost ad-btn-sm"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button type="submit" className="ad-btn ad-btn-primary ad-btn-sm">
          Save address
        </button>
      </div>
    </form>
  );
}
