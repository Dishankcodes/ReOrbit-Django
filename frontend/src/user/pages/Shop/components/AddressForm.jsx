import React, { useState } from "react";

const EMPTY = { label: "Other", name: "", phone: "", line: "", city: "", state: "", pincode: "" };

/* Add a new delivery address (inline, validated). */
export default function AddressForm({ onSave, onCancel, initial = null }) {
  const [f, setF] = useState(initial ? { ...EMPTY, ...initial } : EMPTY);
  const [touched, setTouched] = useState(false);
  const set = (key, value) => setF((x) => ({ ...x, [key]: value }));

  const err = {
    name: f.name.trim().length < 3,
    phone: !/^\+?[\d\s-]{10,14}$/.test(f.phone.trim()),
    line: f.line.trim().length < 6,
    city: f.city.trim().length < 2,
    state: f.state.trim().length < 2,
    pincode: !/^\d{6}$/.test(f.pincode.trim()),
  };
  const bad = Object.values(err).some(Boolean);

  const submit = (event) => {
    event.preventDefault();
    setTouched(true);
    if (bad) return;
    onSave({ ...f, name: f.name.trim(), line: f.line.trim(), city: f.city.trim(), state: f.state.trim(), pincode: f.pincode.trim(), phone: f.phone.trim() });
  };

  const field = (key, label, msg, props = {}, wide = false) => (
    <label className={`dn-field ${wide ? "sp-wide" : ""}`}>
      <span className="dn-label">{label}</span>
      <input
        className={`dn-input ${touched && err[key] ? "is-error" : ""}`}
        value={f[key]}
        onChange={(event) => set(key, event.target.value)}
        {...props}
      />
      {touched && err[key] && <span className="dn-error">{msg}</span>}
    </label>
  );

  return (
    <form className="sp-addr-form" onSubmit={submit} noValidate>
      <h4>{initial ? "Edit address" : "New delivery address"}</h4>
      <div className="sp-form-grid">
        {field("name", "Full name", "Enter the receiver's name.")}
        {field("phone", "Phone", "Enter a valid phone number.", { inputMode: "tel", placeholder: "+91 98765 43210" })}
        {field("line", "Address", "Add the flat, building and street.", { placeholder: "Flat, building, street, area" }, true)}
        {field("city", "City", "Enter the city.")}
        {field("state", "State", "Enter the state.")}
        {field("pincode", "Pincode", "Pincode must be 6 digits.", { inputMode: "numeric", maxLength: 6 })}
        <label className="dn-field">
          <span className="dn-label">Save as</span>
          <select className="dn-select" value={f.label} onChange={(event) => set("label", event.target.value)}>
            <option>Home</option>
            <option>Work</option>
            <option>Other</option>
          </select>
        </label>
      </div>
      <div className="sp-form-actions">
        <button type="button" className="dn-btn dn-btn--ghost dn-btn--sm" onClick={onCancel}>Cancel</button>
        <button type="submit" className="dn-btn dn-btn--sm">Save address</button>
      </div>
    </form>
  );
}
