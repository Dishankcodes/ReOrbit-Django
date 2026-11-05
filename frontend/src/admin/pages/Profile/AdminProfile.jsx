import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock, KeyRound, Lock, Save, ShieldCheck, Mail } from "lucide-react";

import {
  changeAdminPassword,
  fetchAdminProfile,
  saveAdminProfile,
} from "../../../api/profile";
import { getAccount, updateAccount } from "../../../api/session";
import useToast from "../../components/ui/useToast";
import ErrorState from "../../components/ui/ErrorState";
import { SkeletonRows } from "../../../shared/components/Skeleton";

import "../../css/settings/AdminSettings.css";
import "../../css/AdminProfile.css";

const initials = (name = "") => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "A";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "–";

const fmtDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Just now";

const roleLabel = (level) => (level === "Super_Admin" ? "Super Admin" : level || "Admin");

function Field({ label, hint, error, children }) {
  return (
    <label className={`st-field ${error ? "bad" : ""}`}>
      <span className="st-label">{label}</span>
      <span className="st-input">{children}</span>
      {error ? <small className="st-err">{error}</small> : hint ? <small>{hint}</small> : null}
    </label>
  );
}

export default function AdminProfile() {
  const { toast, toastNode } = useToast();

  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [saving, setSaving] = useState(false);

  const [pw, setPw] = useState({ current: "", next: "", again: "" });
  const [pwErrors, setPwErrors] = useState({});
  const [pwBusy, setPwBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await fetchAdminProfile();
      setAdmin(data);
      setName(data.full_name);
      updateAccount("admin", { ...(getAccount("admin") || {}), ...data });
    } catch (e) {
      setLoadError(e.message || "Could not load your profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const modules = useMemo(() => Object.entries(admin?.modules || {}), [admin]);
  const editable = modules.filter(([, level]) => level === "edit").length;
  const dirty = admin && name.trim() !== admin.full_name;

  const saveName = async () => {
    const clean = name.trim();
    if (clean.length < 2) {
      setNameError("Enter your full name.");
      return;
    }
    setSaving(true);
    setNameError("");
    try {
      const data = await saveAdminProfile({ full_name: clean });
      setAdmin(data);
      setName(data.full_name);
      updateAccount("admin", { ...(getAccount("admin") || {}), ...data });
      toast("Profile saved.");
    } catch (e) {
      setNameError(e.errors?.full_name?.[0] || e.message);
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    const errors = {};
    if (!pw.current) errors.current = "Enter your current password.";
    if (!pw.next) errors.next = "Enter a new password.";
    else if (pw.next === pw.current) errors.next = "Choose a different password.";
    if (pw.again !== pw.next) errors.again = "Passwords do not match.";
    setPwErrors(errors);
    if (Object.keys(errors).length) return;

    setPwBusy(true);
    try {
      await changeAdminPassword({ current_password: pw.current, new_password: pw.next });
      setPw({ current: "", next: "", again: "" });
      toast("Password updated.");
    } catch (e) {
      setPwErrors({
        current: e.errors?.current_password?.[0],
        next: e.errors?.new_password?.[0] || (!e.errors ? e.message : undefined),
      });
    } finally {
      setPwBusy(false);
    }
  };

  if (loading && !admin) {
    return (
      <div className="ap-page">
        <SkeletonRows count={5} />
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="ap-page">
        <ErrorState text={loadError} onRetry={load} />
      </div>
    );
  }

  return (
    <div className="ap-page">
      <section className="ap-hero">
        <span className="ap-avatar">{initials(admin.full_name)}</span>
        <div>
          <h2>{admin.full_name}</h2>
          <p>{admin.email}</p>
          <div className="ap-badges">
            <span className="ap-badge">
              <ShieldCheck size={13} /> {roleLabel(admin.permission_level)}
            </span>
            <span className="ap-badge">{admin.public_id}</span>
            <span className="ap-badge">{admin.status}</span>
          </div>
        </div>
      </section>

      <div className="ap-stats">
        <div className="ap-stat">
          <span><CalendarDays size={18} /></span>
          <div>
            <b>{fmtDate(admin.activated_at || admin.created_at)}</b>
            <small>Admin since</small>
          </div>
        </div>
        <div className="ap-stat">
          <span><Clock size={18} /></span>
          <div>
            <b>{fmtDateTime(admin.last_login_at)}</b>
            <small>Last sign-in</small>
          </div>
        </div>
        <div className="ap-stat">
          <span><KeyRound size={18} /></span>
          <div>
            <b>{admin.permission_level === "Super_Admin" ? "All areas" : `${editable} can edit`}</b>
            <small>Access</small>
          </div>
        </div>
      </div>

      <section className="st-card">
        <header>
          <div>
            <h3>Personal details</h3>
            <p>Your name appears in the admin header and the activity log.</p>
          </div>
        </header>

        <div className="st-grid">
          <Field label="Full name" error={nameError}>
            <input
              value={name}
              maxLength={150}
              onChange={(e) => {
                setName(e.target.value);
                setNameError("");
              }}
              aria-invalid={!!nameError}
            />
          </Field>

          <Field label="Email" hint="Your email cannot be changed here.">
            <input value={admin.email} readOnly disabled />
          </Field>

          <Field label="Role">
            <input value={roleLabel(admin.permission_level)} readOnly disabled />
          </Field>

          <Field label="Admin ID">
            <input value={admin.public_id} readOnly disabled />
          </Field>
        </div>

        <div className="ap-actions">
          <button
            type="button"
            className="ad-btn ad-btn-ghost ad-btn-sm"
            disabled={!dirty || saving}
            onClick={() => {
              setName(admin.full_name);
              setNameError("");
            }}
          >
            Discard
          </button>
          <button
            type="button"
            className="ad-btn ad-btn-primary ad-btn-sm"
            disabled={!dirty || saving}
            onClick={saveName}
          >
            <Save size={14} />
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </section>

      <section className="st-card">
        <header>
          <div>
            <h3>Your access</h3>
            <p>Set by a Super Admin. Ask them if you need access to another area.</p>
          </div>
        </header>

        {admin.permission_level === "Super_Admin" ? (
          <p className="ap-note" style={{ margin: 0 }}>
            Super Admins can view and edit every area.
          </p>
        ) : (
          <div className="ap-modules">
            {modules.map(([module, level]) => (
              <div key={module} className="ap-module">
                <span>{module.replace(/_/g, " ")}</span>
                <span className={`ap-level ${level}`}>{level}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="st-card">
        <header>
          <div>
            <h3>Change password</h3>
            <p>Use a password you do not use anywhere else.</p>
          </div>
        </header>

        <div className="st-grid">
          <Field label="Current password" error={pwErrors.current}>
            <input
              type="password"
              autoComplete="current-password"
              value={pw.current}
              onChange={(e) => setPw({ ...pw, current: e.target.value })}
            />
          </Field>
          <span />
          <Field label="New password" error={pwErrors.next}>
            <input
              type="password"
              autoComplete="new-password"
              value={pw.next}
              onChange={(e) => setPw({ ...pw, next: e.target.value })}
            />
          </Field>
          <Field label="Confirm new password" error={pwErrors.again}>
            <input
              type="password"
              autoComplete="new-password"
              value={pw.again}
              onChange={(e) => setPw({ ...pw, again: e.target.value })}
            />
          </Field>
        </div>

        <div className="ap-actions">
          <button
            type="button"
            className="ad-btn ad-btn-primary ad-btn-sm"
            disabled={pwBusy}
            onClick={savePassword}
          >
            <Lock size={14} />
            {pwBusy ? "Updating…" : "Update password"}
          </button>
        </div>
      </section>

      {toastNode}
    </div>
  );
}
