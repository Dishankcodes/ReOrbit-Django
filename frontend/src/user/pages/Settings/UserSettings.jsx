import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Bell,
  CalendarClock,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  UserX,
} from "lucide-react";

import { signOut } from "../../../api/auth";
import { API_BASE_URL } from "../../../api/api";
import { changeUserPassword } from "../../../api/profile";
import { apiRequest } from "../../../api/api";
import { getAccessToken } from "../../../api/session";
import useMyProfile from "../../../shared/hooks/useMyProfile";
import { deleteAccountData } from "../../data/settingsStore";
import ConfirmModal from "../../components/ui/ConfirmModal";
import useToast from "../../components/ui/useToast";

import "../../css/shared/ui-base.css";
import "../../css/settings/UserSettings.css";

/* Settings are saved on the server (your profile's notification and privacy preferences), so they
   follow you to every device and the platform really uses them. */
const SECTIONS = [
  { id: "notifications", label: "Notifications", icon: Bell, text: "What we tell you about" },
  { id: "privacy", label: "Privacy", icon: Eye, text: "Who sees what" },
  { id: "security", label: "Security", icon: ShieldCheck, text: "Password and sign-in" },
  { id: "account", label: "Account", icon: UserX, text: "Your data, log out or delete" },
];

const TOPICS = [
  ["orders", "Orders and sales", "Confirmed, shipped, delivered, refunds, payouts"],
  ["donations", "Donations", "Pickup booked, picked up, certificate ready"],
  ["rewards", "Rewards and badges", "Points earned, level ups, vouchers"],
  ["reviews", "Reviews", "New reviews on what you sold, replies to yours"],
  ["messages", "Messages", "When someone messages you about a listing"],
  ["offers", "Offers and coupons", "Occasional deals and announcements with a coupon"],
];

function Toggle({ checked, onChange, label, hint, disabled }) {
  return (
    <label className={`ust-toggle ${disabled ? "is-off" : ""}`}>
      <div>
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </div>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="ust-switch" aria-hidden="true" />
    </label>
  );
}

/* One preferences dict (notification_preferences or privacy_preferences), saved on every change. */
function usePrefs(me, field, show) {
  const server = me.profile?.[field] || {};
  const [local, setLocal] = useState(server);
  useEffect(() => setLocal(me.profile?.[field] || {}), [me.profile, field]);
  const set = async (key, value) => {
    const next = { ...local, [key]: value };
    setLocal(next);
    const r = await me.save({ [field]: next });
    if (!r.ok) {
      setLocal(local);
      show(r.message || "Not saved. Try again.");
    } else show("Saved.");
  };
  return [local, set];
}

/* ---------------- notifications ---------------- */
function NotificationSection({ me, show }) {
  const [n, set] = usePrefs(me, "notification_preferences", show);
  const on = (k) => n[k] !== false;
  const allOff = TOPICS.every(([k]) => !on(k));
  return (
    <section className="dn-card ust-card">
      <div className="dn-card-head">
        <div>
          <h2>Notifications</h2>
          <small>Choose what shows up in your notification bell.</small>
        </div>
      </div>
      <h4 className="ust-sub">Tell me about</h4>
      <div className="ust-toggles">
        {TOPICS.map(([k, label, hint]) => (
          <Toggle key={k} checked={on(k)} onChange={(v) => set(k, v)} label={label} hint={hint} />
        ))}
      </div>
      {allOff && (
        <p className="ust-warn">
          <TriangleAlert size={14} /> Everything is off. You'll still get account, support and urgent messages.
        </p>
      )}
      <h4 className="ust-sub">Email</h4>
      <p className="dn-hint ust-mailnote">
        <Mail size={14} /> We only email you about important things: sign-up and password codes, password changes,
        replies to your support messages and, if you turn it on, new sign-ins (Security). No SMS, no marketing emails.
      </p>
    </section>
  );
}

/* ---------------- privacy ---------------- */
function PrivacySection({ me, show }) {
  const [p, set] = usePrefs(me, "privacy_preferences", show);
  const pub = p.publicProfile !== false;
  return (
    <section className="dn-card ust-card">
      <div className="dn-card-head">
        <div>
          <h2>Privacy</h2>
          <small>Control what other people can see about you.</small>
        </div>
      </div>
      <div className="ust-toggles">
        <Toggle
          checked={pub}
          onChange={(v) => set("publicProfile", v)}
          label="Public seller profile"
          hint="Buyers can open your profile (bio, city, ratings) from your listings. Off: they only see your first name."
        />
        <Toggle
          checked={pub && p.showActivity !== false}
          onChange={(v) => set("showActivity", v)}
          label="Show my badges"
          hint="The badges you've earned appear on your seller profile"
          disabled={!pub}
        />
      </div>
      <p className="dn-hint" style={{ marginTop: 14 }}>
        Your email, address and phone number are never shown to other members. A buyer only gets your address when
        ReOrbit needs it for a delivery.
      </p>
    </section>
  );
}

/* ---------------- security ---------------- */
const strength = (pw) => {
  let n = 0;
  if (pw.length >= 8) n++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) n++;
  if (/\d/.test(pw)) n++;
  if (/[^A-Za-z0-9]/.test(pw)) n++;
  return n;
};

function SecuritySection({ me, show }) {
  const [n, set] = usePrefs(me, "notification_preferences", show);
  const hasPassword = me.account?.has_password !== false;
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [reveal, setReveal] = useState(false);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverErr, setServerErr] = useState({});
  const score = strength(pw.next);
  const err = {
    current: hasPassword && !pw.current,
    next: pw.next.length < 8 || !/\d/.test(pw.next) || !/[A-Za-z]/.test(pw.next),
    confirm: pw.next !== pw.confirm || !pw.confirm,
    same: pw.next && pw.next === pw.current,
  };
  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    setServerErr({});
    if (err.current || err.next || err.confirm || err.same) return;
    setBusy(true);
    try {
      await changeUserPassword({ current_password: pw.current, new_password: pw.next });
      setPw({ current: "", next: "", confirm: "" });
      setTouched(false);
      show("Password changed. We emailed you a confirmation.");
    } catch (ex) {
      setServerErr(ex.errors || {});
      show(ex.message || "Password not changed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="ust-stack">
      <form className="dn-card ust-card" onSubmit={submit} noValidate>
        <div className="dn-card-head">
          <div>
            <h2>{hasPassword ? "Change password" : "Set a password"}</h2>
            <small>
              {hasPassword
                ? "Use at least 8 characters with letters and a number. We'll email you to confirm the change."
                : "You sign in with Google. Set a password to also sign in with your email."}
            </small>
          </div>
        </div>
        <div className="ust-grid">
          {hasPassword && (
            <label className="dn-field ust-wide">
              <span className="dn-label">Current password</span>
              <input
                className={`dn-input ${touched && (err.current || serverErr.current_password) ? "is-error" : ""}`}
                type={reveal ? "text" : "password"}
                autoComplete="current-password"
                value={pw.current}
                onChange={(e) => setPw({ ...pw, current: e.target.value })}
              />
              {touched && err.current && <span className="dn-error">Enter your current password.</span>}
              {serverErr.current_password && <span className="dn-error">{serverErr.current_password[0]}</span>}
              <Link to="/auth?forgot=1" className="ust-forgot" onClick={() => signOut()}>
                Forgot your password? Reset it with an email code
              </Link>
            </label>
          )}
          <label className="dn-field">
            <span className="dn-label">New password</span>
            <input
              className={`dn-input ${touched && (err.next || err.same) ? "is-error" : ""}`}
              type={reveal ? "text" : "password"}
              autoComplete="new-password"
              value={pw.next}
              onChange={(e) => setPw({ ...pw, next: e.target.value })}
            />
            <i className={`ust-meter s${score}`}>
              <b />
              <b />
              <b />
              <b />
            </i>
            {touched && err.next && (
              <span className="dn-error">Use at least 8 characters with letters and a number.</span>
            )}
            {touched && err.same && <span className="dn-error">The new password must be different.</span>}
            {serverErr.new_password && <span className="dn-error">{serverErr.new_password[0]}</span>}
          </label>
          <label className="dn-field">
            <span className="dn-label">Confirm new password</span>
            <input
              className={`dn-input ${touched && err.confirm ? "is-error" : ""}`}
              type={reveal ? "text" : "password"}
              autoComplete="new-password"
              value={pw.confirm}
              onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
            />
            {touched && err.confirm && <span className="dn-error">The passwords don't match.</span>}
          </label>
        </div>
        <div className="ust-actions between">
          <button type="button" className="dn-link" onClick={() => setReveal((v) => !v)}>
            {reveal ? <EyeOff size={14} /> : <Eye size={14} />} {reveal ? "Hide" : "Show"} passwords
          </button>
          <button type="submit" className="dn-btn" disabled={busy}>
            {busy ? <Loader2 size={15} className="ust-spin" /> : <KeyRound size={15} />}{" "}
            {hasPassword ? "Update password" : "Set password"}
          </button>
        </div>
      </form>
      <section className="dn-card ust-card">
        <div className="dn-card-head">
          <div>
            <h2>Sign-in alerts</h2>
            <small>Know straight away if someone else gets into your account.</small>
          </div>
        </div>
        <div className="ust-toggles">
          <Toggle
            checked={n.loginAlerts === true}
            onChange={(v) => set("loginAlerts", v)}
            label="Email me when someone signs in"
            hint={`Sent to ${me.account?.email || "your email"} for every new sign-in`}
          />
        </div>
      </section>
    </div>
  );
}

/* ---------------- account ---------------- */
function AccountSection({ me, show }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(null); // logout | delete
  const [typed, setTyped] = useState("");
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [check, setCheck] = useState(null); // { blockers, grace_days, has_password }
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    apiRequest("/users/me/delete/")
      .then((r) => setCheck(r.data))
      .catch(() => setCheck({ blockers: [], grace_days: 30, has_password: true }));
  }, []);

  const logout = () => {
    signOut();
    navigate("/auth", { replace: true });
  };

  const download = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/me/export/`, {
        headers: { Authorization: `Bearer ${getAccessToken("user")}` },
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reorbit-${(me.account?.public_id || "my").toLowerCase()}-data.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      show("Your data was downloaded.");
    } catch {
      show("Couldn't download your data. Try again.");
    } finally {
      setExporting(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const r = await apiRequest("/users/me/delete/", {
        method: "POST",
        body: { confirm: typed, password, reason },
      });
      deleteAccountData();
      signOut();
      navigate("/", { replace: true, state: { notice: r.message } });
    } catch (ex) {
      if (ex.errors?.blockers) setCheck((c) => ({ ...c, blockers: ex.errors.blockers }));
      show(ex.errors?.password?.[0] || ex.message || "Your account wasn't deleted.");
    } finally {
      setBusy(false);
    }
  };
  const blockers = check?.blockers || [];
  const days = check?.grace_days || 30;

  return (
    <div className="ust-stack">
      <section className="dn-card ust-card">
        <div className="dn-card-head">
          <div>
            <h2>Your data</h2>
            <small>Download a copy of everything ReOrbit holds about you, as a file.</small>
          </div>
        </div>
        <button type="button" className="dn-btn dn-btn--soft" onClick={download} disabled={exporting}>
          {exporting ? <Loader2 size={15} className="ust-spin" /> : <Download size={15} />} Download my data
        </button>
      </section>
      <section className="dn-card ust-card">
        <div className="dn-card-head">
          <div>
            <h2>Log out</h2>
            <small>You can log back in any time.</small>
          </div>
        </div>
        <button type="button" className="dn-btn dn-btn--ghost" onClick={() => setMode("logout")}>
          <LogOut size={15} /> Log out of this device
        </button>
      </section>
      <section className="dn-card ust-card ust-danger">
        <div className="dn-card-head">
          <div>
            <h2>Delete account</h2>
            <small>Your account is hidden straight away and deleted for good after {days} days.</small>
          </div>
        </div>
        <ul className="ust-risk">
          <li>
            <CalendarClock size={14} /> Changed your mind? Sign in within {days} days and everything comes back.
          </li>
          <li>Your listings leave the marketplace and nobody can buy from you or message you.</li>
          <li>
            After {days} days your name, contact details, photos, addresses and wishlist are removed. Orders,
            payments and donations stay on record without your personal details.
          </li>
          <li>Your Orbit Points and unused vouchers are lost after {days} days.</li>
        </ul>
        {blockers.length > 0 && (
          <div className="ust-blockers" role="status">
            <strong>
              <TriangleAlert size={14} /> Finish these first:
            </strong>
            <ul>
              {blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        )}
        <button
          type="button"
          className="dn-btn dn-btn--danger"
          disabled={!check || blockers.length > 0}
          onClick={() => {
            setTyped("");
            setPassword("");
            setReason("");
            setMode("delete");
          }}
        >
          <Trash2 size={15} /> Delete my account
        </button>
      </section>
      {mode === "logout" && (
        <ConfirmModal
          icon={LogOut}
          tone="primary"
          title="Log out of ReOrbit?"
          confirmLabel="Log out"
          cancelLabel="Stay logged in"
          onClose={() => setMode(null)}
          onConfirm={logout}
        >
          <p>You'll need to log in again to see your orders and listings.</p>
        </ConfirmModal>
      )}
      {mode === "delete" && (
        <ConfirmModal
          icon={Trash2}
          title="Delete your account?"
          confirmLabel={busy ? "Deleting…" : "Delete my account"}
          cancelLabel="Keep my account"
          disabled={busy || typed.trim().toUpperCase() !== "DELETE" || (check?.has_password && !password)}
          onClose={() => setMode(null)}
          onConfirm={remove}
        >
          <p>
            Your account is hidden now and deleted for good in {days} days. Sign in before then to keep it.
          </p>
          {check?.has_password && (
            <label className="dn-field">
              <span className="dn-label">Your password</span>
              <input
                className="dn-input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          )}
          <label className="dn-field">
            <span className="dn-label">
              Why are you leaving? <em>(optional)</em>
            </span>
            <input className="dn-input" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} />
          </label>
          <label className="dn-field">
            <span className="dn-label">
              Type <b>DELETE</b> to confirm
            </span>
            <input className="dn-input" value={typed} onChange={(e) => setTyped(e.target.value)} />
          </label>
        </ConfirmModal>
      )}
    </div>
  );
}

export default function UserSettings() {
  const [params, setParams] = useSearchParams();
  const me = useMyProfile("user");
  const { toast, show } = useToast();
  const navigate = useNavigate();
  const section = SECTIONS.some((s) => s.id === params.get("section")) ? params.get("section") : "notifications";

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [section]);

  /* addresses moved to their own page; keep old links working */
  useEffect(() => {
    if (params.get("section") === "addresses") navigate("/user-addresses", { replace: true });
  }, [params, navigate]);

  const Body = { notifications: NotificationSection, privacy: PrivacySection, security: SecuritySection, account: AccountSection }[
    section
  ];

  return (
    <div className="dn st">
      <header className="ust-head">
        <p className="dn-muted">Manage your notifications, privacy and security.</p>
      </header>
      <div className="ust-layout">
        <nav className="ust-nav" aria-label="Settings sections">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                type="button"
                className={section === s.id ? "on" : ""}
                aria-current={section === s.id ? "page" : undefined}
                onClick={() => setParams({ section: s.id })}
              >
                <span>
                  <Icon size={17} />
                </span>
                <div>
                  <strong>{s.label}</strong>
                  <small>{s.text}</small>
                </div>
              </button>
            );
          })}
        </nav>
        <div className="ust-body">
          {me.loading && !me.profile ? (
            <p className="dn-muted">Loading your settings…</p>
          ) : (
            <Body me={me} show={show} />
          )}
        </div>
      </div>
      {toast}
    </div>
  );
}
