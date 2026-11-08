import React, { useState } from "react";
import CitySelect from "../../../../shared/components/CitySelect";
import "../../../../shared/components/CitySelect.css";
import { pincodeProblem } from "../../../../api/profile";

const EMPTY = { label: "Home", name: "", phone: "", line: "", city: "", state: "Gujarat", pincode: "" };

/* Add a new delivery address (inline, validated). */
export default function AddressForm({ onSave, onCancel, initial = null, saving = false, serverErrors = {} }) {
  const [f, setF] = useState(initial ? { ...EMPTY, ...initial } : EMPTY);
  const [touched, setTouched] = useState(false);
  const set = (key, value) => setF((x) => ({ ...x, [key]: value }));

  const err = {
    name: f.name.trim().length < 3,
    phone: !/^\+?[\d\s-]{10,14}$/.test(f.phone.trim()),
    line: f.line.trim().length < 6,
    city: !f.city,
    pincode: !!pincodeProblem(f.pincode.trim()),
  };
  const serverMsg = (key) => (serverErrors[key] && serverErrors[key][0]) || "";
  const bad = Object.values(err).some(Boolean);

  const submit = (event) => {
    event.preventDefault();
    setTouched(true);
    if (bad || saving) return;
    onSave({ ...f, state: "Gujarat", name: f.name.trim(), line: f.line.trim(), city: f.city.trim(), state: f.state.trim(), pincode: f.pincode.trim(), phone: f.phone.trim() });
  };

  const field = (key, label, msg, props = {}, wide = false) => (
    <label className={`dn-field ${wide ? "ushp-wide" : ""}`}>
      <span className="dn-label">{label}</span>
      <input
        className={`dn-input ${touched && err[key] ? "is-error" : ""}`}
        value={f[key]}
        onChange={(event) => set(key, event.target.value)}
        {...props}
      />
      {touched && err[key] && <span className="dn-error">{msg}</span>}
      {!(touched && err[key]) && serverMsg(key === "line" ? "line1" : key) && (
        <span className="dn-error">{serverMsg(key === "line" ? "line1" : key)}</span>
      )}
    </label>
  );

  return (
    <form className="ushp-addr-form" onSubmit={submit} noValidate>
      <h4>{initial ? "Edit address" : "New delivery address"}</h4>
      <div className="ushp-form-grid">
        {field("name", "Full name", "Enter the receiver's name.")}
        {field("phone", "Phone", "Enter a valid phone number.", { inputMode: "tel", placeholder: "+91 98765 43210" })}
        {field("line", "Address", "Add the flat, building and street.", { placeholder: "Flat, building, street, area" }, true)}
        <label className="dn-field">
          <span className="dn-label">City</span>
          <CitySelect value={f.city} onChange={(v) => set("city", v)} invalid={touched && err.city} placeholder="Choose your city" />
          {touched && err.city && <span className="dn-error">Choose a Gujarat city from the list.</span>}
        </label>
        <label className="dn-field">
          <span className="dn-label">State</span>
          <input className="dn-input" value="Gujarat" readOnly aria-readonly="true" />
        </label>
        {field("pincode", "Pincode", pincodeProblem(f.pincode.trim()) || "Enter a valid Gujarat pincode.", { inputMode: "numeric", maxLength: 6 })}
        <label className="dn-field">
          <span className="dn-label">Save as</span>
          <select className="dn-select" value={f.label} onChange={(event) => set("label", event.target.value)}>
            <option>Home</option>
            <option>Work</option>
            <option>Other</option>
          </select>
        </label>
      </div>
      <div className="ushp-form-actions">
        <button type="button" className="dn-btn dn-btn--ghost dn-btn--sm" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="dn-btn dn-btn--sm" disabled={saving}>{saving ? "Saving…" : "Save address"}</button>
      </div>
    </form>
  );
}
