import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  Copy,
  CheckCircle2,
  Lock,
  Send,
  Save,
  KeyRound,
} from "lucide-react";
import {
  MODULES,
  GROUPS,
  LEVELS,
  ROLE_PRESETS,
  presetOf,
  summarize,
  createMember,
  updateMember,
  emailTaken,
} from "../../data/teamStore";

const samePerms = (a, b) =>
  MODULES.every((m) => (a[m.key] || "none") === (b[m.key] || "none"));
const blank = () => ({
  name: "",
  email: "",
  phone: "",
  role: "support",
  permissions: { ...presetOf("support").permissions },
  note: "",
});

export default function MemberModal({ member, startRole, onClose, onDone }) {
  const editing = !!member;
  const [v, setV] = useState(() =>
    member
      ? {
          name: member.name,
          email: member.email,
          phone: member.phone,
          role: member.role,
          permissions: { ...member.permissions },
          note: member.note || "",
        }
      : startRole
        ? {
            ...blank(),
            role: startRole,
            permissions: { ...presetOf(startRole).permissions },
          }
        : blank(),
  );
  const [touched, setTouched] = useState(false);
  const [done, setDone] = useState(null); // { member, password }
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const errors = useMemo(() => {
    const e = {};
    if (v.name.trim().length < 2) e.name = "Enter the person’s full name.";
    if (!/^\S+@\S+\.\S+$/.test(v.email.trim()))
      e.email = "Enter a valid email address.";
    else if (emailTaken(v.email, member?.id))
      e.email = "Someone on the team already uses this email.";
    if (v.phone.replace(/\D/g, "").length < 10)
      e.phone = "Enter a valid phone number.";
    if (summarize(v.permissions).total === 0)
      e.permissions = "Give access to at least one module.";
    return e;
  }, [v, member]);
  const sum = summarize(v.permissions);

  const setPerm = (key, level) => {
    const permissions = { ...v.permissions, [key]: level };
    const match = ROLE_PRESETS.find(
      (r) => r.key !== "custom" && samePerms(r.permissions, permissions),
    );
    setV({ ...v, permissions, role: match ? match.key : "custom" });
  };
  const setAll = (level) => {
    const permissions = { ...v.permissions };
    MODULES.filter((m) => !m.locked).forEach((m) => {
      permissions[m.key] = level;
    });
    const match = ROLE_PRESETS.find(
      (r) => r.key !== "custom" && samePerms(r.permissions, permissions),
    );
    setV({ ...v, permissions, role: match ? match.key : "custom" });
  };
  const pickRole = (key) =>
    setV({ ...v, role: key, permissions: { ...presetOf(key).permissions } });

  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(errors).length) return;
    if (editing) {
      updateMember(member.id, v);
      onDone(`Access updated for ${v.name.trim()}.`);
      onClose();
      return;
    }
    setDone(createMember(v));
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `Email: ${done.member.email}\nTemporary password: ${done.password}`,
      );
    } catch {
      /* ignore */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (done) {
    return (
      <div
        className="ad-modal-backdrop"
        onMouseDown={(e) =>
          e.target === e.currentTarget &&
          (onDone(`Invite created for ${done.member.name}.`), onClose())
        }
      >
        <div
          className="ad-modal tm-modal tm-done"
          role="dialog"
          aria-modal="true"
          aria-label="Invite created"
        >
          <div className="ad-modal-icon tone-positive">
            <CheckCircle2 size={22} />
          </div>
          <h3>{done.member.name} has been invited</h3>
          <p className="ad-modal-text">
            They’ll be a <b>{done.member.roleLabel}</b> with access to{" "}
            {summarize(done.member.permissions).total} modules. Share these
            sign-in details with them. In this demo no email is actually sent.
          </p>
          <dl className="tm-cred">
            <div>
              <dt>Email</dt>
              <dd>{done.member.email}</dd>
            </div>
            <div>
              <dt>
                <KeyRound size={13} /> Temporary password
              </dt>
              <dd className="mono">{done.password}</dd>
            </div>
          </dl>
          <p className="tm-hint">
            They’ll be asked to choose a new password the first time they sign
            in.
          </p>
          <div className="ad-modal-actions">
            <button
              type="button"
              className="ad-btn ad-btn-ghost"
              onClick={copy}
            >
              <Copy size={15} />
              {copied ? "Copied" : "Copy details"}
            </button>
            <button
              type="button"
              className="ad-btn ad-btn-primary"
              onClick={() => {
                onDone(`Invite created for ${done.member.name}.`);
                onClose();
              }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="ad-modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        className="ad-modal tm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tm-title"
        onSubmit={submit}
        noValidate
      >
        <button
          type="button"
          className="ad-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={16} />
        </button>
        <h3 id="tm-title">
          {editing ? `Edit access: ${member.name}` : "Add a sub-admin"}
        </h3>
        <p className="ad-modal-text">
          {editing
            ? "Change their details or what they can see and change."
            : "Choose a role to start from, then adjust exactly what they can see and change."}
        </p>

        <div className="tm-grid">
          <label className={`tm-field ${touched && errors.name ? "bad" : ""}`}>
            <span>Full name</span>
            <input
              value={v.name}
              onChange={(e) => setV({ ...v, name: e.target.value })}
              placeholder="e.g. Priya Sharma"
              autoFocus
              aria-invalid={touched && !!errors.name}
            />
            {touched && errors.name && <small>{errors.name}</small>}
          </label>
          <label className={`tm-field ${touched && errors.email ? "bad" : ""}`}>
            <span>Work email</span>
            <input
              type="email"
              value={v.email}
              onChange={(e) => setV({ ...v, email: e.target.value })}
              placeholder="name@reorbit.in"
              aria-invalid={touched && !!errors.email}
            />
            {touched && errors.email && <small>{errors.email}</small>}
          </label>
          <label className={`tm-field ${touched && errors.phone ? "bad" : ""}`}>
            <span>Phone</span>
            <input
              value={v.phone}
              onChange={(e) => setV({ ...v, phone: e.target.value })}
              placeholder="+91 98xxx xxxxx"
              aria-invalid={touched && !!errors.phone}
            />
            {touched && errors.phone && <small>{errors.phone}</small>}
          </label>
          <label className="tm-field">
            <span>
              Note <em>(optional)</em>
            </span>
            <input
              value={v.note}
              onChange={(e) => setV({ ...v, note: e.target.value })}
              placeholder="e.g. Morning shift at the warehouse"
            />
          </label>
        </div>

        <div className="tm-sec-head">
          <strong>Role</strong>
          <span>Pick a starting point</span>
        </div>
        <div className="tm-roles" role="radiogroup" aria-label="Role">
          {ROLE_PRESETS.map((r) => (
            <button
              key={r.key}
              type="button"
              role="radio"
              aria-checked={v.role === r.key}
              className={v.role === r.key ? "on" : ""}
              onClick={() => pickRole(r.key)}
            >
              <b>{r.label}</b>
              <small>{r.blurb}</small>
            </button>
          ))}
        </div>

        <div className="tm-sec-head">
          <div>
            <strong>What they can access</strong>
            <span>
              {sum.total} of {sum.all} modules · {sum.edit} can edit
            </span>
          </div>
          <div className="tm-quick">
            <button type="button" onClick={() => setAll("none")}>
              Clear
            </button>
            <button type="button" onClick={() => setAll("view")}>
              All view
            </button>
            <button type="button" onClick={() => setAll("edit")}>
              All edit
            </button>
          </div>
        </div>
        {touched && errors.permissions && (
          <p className="ad-modal-error">{errors.permissions}</p>
        )}
        <div className="tm-matrix">
          {GROUPS.map((g) => (
            <div key={g} className="tm-mgroup">
              <h4>{g}</h4>
              {MODULES.filter((m) => m.group === g).map((m) => (
                <div key={m.key} className="tm-mrow">
                  <div>
                    <strong>{m.label}</strong>
                    <small>{m.hint}</small>
                  </div>
                  {m.locked ? (
                    <span className="tm-locked">
                      <Lock size={12} /> Always on
                    </span>
                  ) : (
                    <div
                      className="tm-seg"
                      role="radiogroup"
                      aria-label={`${m.label} access`}
                    >
                      {LEVELS.map((l) => (
                        <button
                          key={l.key}
                          type="button"
                          role="radio"
                          aria-checked={v.permissions[m.key] === l.key}
                          className={`${l.key} ${v.permissions[m.key] === l.key ? "on" : ""}`}
                          onClick={() => setPerm(m.key, l.key)}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        <p className="tm-hint">
          “View” lets them look but not change anything. “Edit” also lets them
          accept, reject, update and delete. Team & Roles can only ever be used
          by the super admin.
        </p>

        <div className="ad-modal-actions">
          <button
            type="button"
            className="ad-btn ad-btn-ghost"
            onClick={onClose}
          >
            Cancel
          </button>
          <button type="submit" className="ad-btn ad-btn-primary">
            {editing ? (
              <>
                <Save size={15} />
                Save changes
              </>
            ) : (
              <>
                <Send size={15} />
                Send invite
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
