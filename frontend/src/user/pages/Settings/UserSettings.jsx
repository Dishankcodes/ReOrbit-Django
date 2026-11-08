import React, { useEffect, useMemo, useState } from "react";
import { signOut } from "../../../api/auth";

import { useNavigate, useSearchParams } from "react-router-dom";

import {
  Bell,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Laptop,
  LogOut,
  MapPin,
  Pencil,
  Plus,
  ShieldCheck,
  Smartphone,
  Trash2,
  TriangleAlert,
  UserX,
  Lock,
  Download,
} from "lucide-react";

import {
  SESSIONS,
  deleteAccountData,
  setPref,
  useSettings,
} from "../../data/settingsStore";

import {
  createAddress,
  deleteAddress,
  editAddress,
  makeDefaultAddress,
  useServerAddresses,
} from "../../data/checkoutStore";

import ConfirmModal from "../../components/ui/ConfirmModal";

import useToast from "../../components/ui/useToast";

import AddressForm from "../Shop/components/AddressForm";
import { PageLoader } from "../../../shared/components/Spinner";

import "../../css/shared/ui-base.css";

import "../../css/settings/UserSettings.css";

const SECTIONS = [
  {
    id: "addresses",

    label: "Addresses",

    icon: MapPin,

    text: "Delivery and pickup places",
  },

  {
    id: "notifications",

    label: "Notifications",

    icon: Bell,

    text: "What we tell you about",
  },

  { id: "privacy", label: "Privacy", icon: Eye, text: "Who sees what" },

  {
    id: "security",

    label: "Security",

    icon: ShieldCheck,

    text: "Password and sessions",
  },

  { id: "account", label: "Account", icon: UserX, text: "Log out or delete" },
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

/* ---------------- addresses ---------------- */

function AddressSection({ show }) {
  const { addresses, defaultId, loading, error, reload } = useServerAddresses();

  const [mode, setMode] = useState(null); // null | "new" | address id
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  /* one place for every address change: spinner, server messages, toast */
  const run = async (task, done) => {
    setSaving(true);
    setFieldErrors({});
    try {
      await task();
      setMode(null);
      if (done) show(done);
    } catch (e) {
      setFieldErrors(e.errors || {});
      if (!e.errors) show(e.message || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const [removing, setRemoving] = useState(null);

  return (
    <section className="dn-card ust-card">
      <div className="dn-card-head">
        <div>
          <h2>Addresses</h2>

          <small>
            Used for delivery, and as the default for donation pickups.
          </small>
        </div>

        {mode === null && (
          <button
            type="button"
            className="dn-btn dn-btn--sm"
            onClick={() => setMode("new")}
          >
            <Plus size={14} /> Add address
          </button>
        )}
      </div>

      {loading && addresses.length === 0 && <PageLoader label="Loading your addresses…" minHeight={120} />}
      {error && addresses.length === 0 && (
        <p className="dn-error" role="alert">
          {error} <button type="button" className="dn-link" onClick={reload}>Try again</button>
        </p>
      )}
      <div className="ust-addrs">
        {addresses.map((a) =>
          mode === a.id ? (
            <AddressForm
              key={a.id}
              initial={a}
              saving={saving}
              serverErrors={fieldErrors}
              onCancel={() => setMode(null)}
              onSave={(v) => run(() => editAddress(a.id, v), "Address updated.")}
            />
          ) : (
            <article key={a.id} className="ust-addr">
              <span>
                <MapPin size={18} />
              </span>

              <div>
                <div className="ust-addr-top">
                  <strong>{a.name}</strong>

                  <em>{a.label}</em>

                  {defaultId === a.id && <em className="def">Default</em>}
                </div>

                <p>
                  {a.line}, {a.city}, {a.state} {a.pincode}
                </p>

                <small>{a.phone}</small>
              </div>

              <div className="ust-addr-actions">
                <button
                  type="button"
                  className="dn-btn dn-btn--ghost dn-btn--sm"
                  onClick={() => setMode(a.id)}
                >
                  <Pencil size={13} /> Edit
                </button>

                {defaultId !== a.id && (
                  <button
                    type="button"
                    className="dn-btn dn-btn--soft dn-btn--sm"
                    disabled={saving}
                    onClick={() => run(() => makeDefaultAddress(a.id), "Default address changed.")}
                  >
                    Make default
                  </button>
                )}

                {addresses.length > 1 && (
                  <button
                    type="button"
                    className="dn-btn dn-btn--danger dn-btn--sm"
                    onClick={() => setRemoving(a)}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </article>
          ),
        )}
      </div>

      {mode === "new" && (
        <AddressForm
          saving={saving}
          serverErrors={fieldErrors}
          onCancel={() => setMode(null)}
          onSave={(v) => run(() => createAddress(v), "Address added.")}
        />
      )}

      {removing && (
        <ConfirmModal
          icon={Trash2}
          title="Remove this address?"
          confirmLabel="Remove"
          cancelLabel="Keep it"
          onClose={() => setRemoving(null)}
          onConfirm={() => {
            const target = removing;
            setRemoving(null);
            run(() => deleteAddress(target.id), "Address removed.");
          }}
        >
          <p>
            {removing.label}: {removing.line}, {removing.city}.
          </p>
        </ConfirmModal>
      )}
    </section>
  );
}

/* ---------------- notifications / privacy ---------------- */

function NotificationSection({ settings }) {
  const n = settings.prefs.notifications;

  const set = (k) => (v) => setPref("notifications", k, v);

  const noChannel = !n.channelEmail && !n.channelPush && !n.channelSms;

  return (
    <section className="dn-card ust-card">
      <div className="dn-card-head">
        <div>
          <h2>Notifications</h2>

          <small>Choose what you hear about, and where.</small>
        </div>
      </div>

      <h4 className="ust-sub">What to notify me about</h4>

      <div className="ust-toggles">
        <Toggle
          checked={n.orderUpdates}
          onChange={set("orderUpdates")}
          label="Order updates"
          hint="Confirmed, shipped, delivered, refunds"
        />

        <Toggle
          checked={n.donationUpdates}
          onChange={set("donationUpdates")}
          label="Donation updates"
          hint="Pickup booked, picked up, certificate ready"
        />

        <Toggle
          checked={n.rewards}
          onChange={set("rewards")}
          label="Rewards and badges"
          hint="Points earned, level ups, new badges"
        />

        <Toggle
          checked={n.offers}
          onChange={set("offers")}
          label="Offers and coupons"
          hint="Occasional deals on second-life pieces"
        />

        <Toggle
          checked={n.newsletter}
          onChange={set("newsletter")}
          label="Monthly newsletter"
          hint="Stories from ReMakers and our community"
        />
      </div>

      <h4 className="ust-sub">How to reach me</h4>

      <div className="ust-toggles">
        <Toggle
          checked={n.channelEmail}
          onChange={set("channelEmail")}
          label="Email"
        />

        <Toggle
          checked={n.channelPush}
          onChange={set("channelPush")}
          label="Push notifications"
        />

        <Toggle
          checked={n.channelSms}
          onChange={set("channelSms")}
          label="SMS"
          hint="Only for delivery and pickup alerts"
        />
      </div>

      {noChannel && (
        <p className="ust-warn">
          <TriangleAlert size={14} /> All channels are off, so you won't receive
          any notifications.
        </p>
      )}
    </section>
  );
}

function PrivacySection({ settings }) {
  const p = settings.prefs.privacy;

  const set = (k) => (v) => setPref("privacy", k, v);

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
          checked={p.publicProfile}
          onChange={set("publicProfile")}
          label="Public seller profile"
          hint="Buyers can open your profile from your listings"
        />

        <Toggle
          checked={p.showActivity}
          onChange={set("showActivity")}
          label="Show my badges and level"
          hint="Visible on your profile"
          disabled={!p.publicProfile}
        />

        <Toggle
          checked={p.showFollowing}
          onChange={set("showFollowing")}
          label="Show who I follow"
          hint="Other users can see the ReMakers you follow"
          disabled={!p.publicProfile}
        />
      </div>

      <p className="dn-hint" style={{ marginTop: 14 }}>
        Your address and phone number are never shown to other users.
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

function SecuritySection({ settings, show }) {
  const s = settings.prefs.security;

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });

  const [reveal, setReveal] = useState(false);

  const [touched, setTouched] = useState(false);

  const [sessions, setSessions] = useState(SESSIONS);

  const score = strength(pw.next);

  const err = {
    current: pw.current.length < 6,

    next: score < 3,

    confirm: pw.next !== pw.confirm || !pw.confirm,

    same: pw.next && pw.next === pw.current,
  };

  const submit = (e) => {
    e.preventDefault();

    setTouched(true);

    if (err.current || err.next || err.confirm || err.same) return;

    setPw({ current: "", next: "", confirm: "" });

    setTouched(false);

    show("Password changed. Other devices were signed out.");

    setSessions((list) => list.filter((x) => x.current));
  };

  return (
    <div className="ust-stack">
      <form className="dn-card ust-card" onSubmit={submit} noValidate>
        <div className="dn-card-head">
          <div>
            <h2>Change password</h2>

            <small>
              Use at least 8 characters with letters, a number and a symbol.
            </small>
          </div>
        </div>

        <div className="ust-grid">
          <label className="dn-field ust-wide">
            <span className="dn-label">Current password</span>

            <input
              className={`dn-input ${touched && err.current ? "is-error" : ""}`}
              type={reveal ? "text" : "password"}
              autoComplete="current-password"
              value={pw.current}
              onChange={(e) => setPw({ ...pw, current: e.target.value })}
            />

            {touched && err.current && (
              <span className="dn-error">Enter your current password.</span>
            )}
          </label>

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
              <span className="dn-error">
                Make it stronger: 8+ characters, mixed case, a number and a
                symbol.
              </span>
            )}

            {touched && err.same && (
              <span className="dn-error">
                The new password must be different.
              </span>
            )}
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

            {touched && err.confirm && (
              <span className="dn-error">The passwords don't match.</span>
            )}
          </label>
        </div>

        <div className="ust-actions between">
          <button
            type="button"
            className="dn-link"
            onClick={() => setReveal((v) => !v)}
          >
            {reveal ? <EyeOff size={14} /> : <Eye size={14} />}{" "}
            {reveal ? "Hide" : "Show"} passwords
          </button>

          <button type="submit" className="dn-btn">
            <KeyRound size={15} /> Update password
          </button>
        </div>
      </form>

      <section className="dn-card ust-card">
        <div className="dn-card-head">
          <div>
            <h2>Extra protection</h2>
          </div>
        </div>

        <div className="ust-toggles">
          <Toggle
            checked={s.twoFactor}
            onChange={(v) => {
              setPref("security", "twoFactor", v);

              show(
                v
                  ? "Two-step verification is on."
                  : "Two-step verification is off.",
              );
            }}
            label="Two-step verification"
            hint="Ask for a one-time code when you log in on a new device"
          />

          <Toggle
            checked={s.loginAlerts}
            onChange={(v) => setPref("security", "loginAlerts", v)}
            label="Login alerts"
            hint="Email me when someone logs in to my account"
          />
        </div>
      </section>

      <section className="dn-card ust-card">
        <div className="dn-card-head">
          <div>
            <h2>Where you're logged in</h2>

            <small>Log out of any device you don't recognise.</small>
          </div>
        </div>

        <div className="ust-sessions">
          {sessions.map((x) => (
            <article key={x.id}>
              <span>
                {/iPhone|Android/.test(x.device) ? (
                  <Smartphone size={18} />
                ) : (
                  <Laptop size={18} />
                )}
              </span>

              <div>
                <strong>{x.device}</strong>

                <small>
                  {x.place} · {x.when}
                </small>
              </div>

              {x.current ? (
                <em className="ust-current">This device</em>
              ) : (
                <button
                  type="button"
                  className="dn-btn dn-btn--ghost dn-btn--sm"
                  onClick={() => {
                    setSessions((l) => l.filter((y) => y.id !== x.id));

                    show("Device logged out.");
                  }}
                >
                  Log out
                </button>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ---------------- account ---------------- */

function AccountSection({ show }) {
  const navigate = useNavigate();

  const [mode, setMode] = useState(null); // logout | delete

  const [typed, setTyped] = useState("");

  const logout = () => {
    signOut();

    navigate("/auth", { replace: true });
  };

  const remove = () => {
    deleteAccountData();

    signOut();

    navigate("/", { replace: true });
  };

  return (
    <div className="ust-stack">
      <section className="dn-card ust-card">
        <div className="dn-card-head">
          <div>
            <h2>Your data</h2>

            <small>Download a copy of what we hold about you.</small>
          </div>
        </div>

        <button
          type="button"
          className="dn-btn dn-btn--soft"
          onClick={() => show("We'll email your data export within 24 hours.")}
        >
          <Download size={15} /> Request data export
        </button>
      </section>

      <section className="dn-card ust-card">
        <div className="dn-card-head">
          <div>
            <h2>Log out</h2>

            <small>You can log back in any time.</small>
          </div>
        </div>

        <button
          type="button"
          className="dn-btn dn-btn--ghost"
          onClick={() => setMode("logout")}
        >
          <LogOut size={15} /> Log out of this device
        </button>
      </section>

      <section className="dn-card ust-card ust-danger">
        <div className="dn-card-head">
          <div>
            <h2>Delete account</h2>

            <small>
              Permanently removes your profile, listings, wishlist and Orbit
              Points.
            </small>
          </div>
        </div>

        <ul className="ust-risk">
          <li>Open orders and sales must be completed first.</li>

          <li>Your Orbit Points and vouchers can't be restored.</li>

          <li>This can't be undone.</li>
        </ul>

        <button
          type="button"
          className="dn-btn dn-btn--danger"
          onClick={() => {
            setTyped("");

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
          confirmLabel="Delete forever"
          cancelLabel="Keep my account"
          disabled={typed.trim().toUpperCase() !== "DELETE"}
          onClose={() => setMode(null)}
          onConfirm={remove}
        >
          <p>This permanently deletes your account and everything in it.</p>

          <label className="dn-field">
            <span className="dn-label">
              Type <b>DELETE</b> to confirm
            </span>

            <input
              className="dn-input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
            />
          </label>
        </ConfirmModal>
      )}
    </div>
  );
}

export default function UserSettings() {
  const [params, setParams] = useSearchParams();

  const settings = useSettings();

  const { toast, show } = useToast();

  const section = SECTIONS.some((s) => s.id === params.get("section"))
    ? params.get("section")
    : "addresses";

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [section]);

  const body = useMemo(() => {
    switch (section) {
      case "addresses":
        return <AddressSection show={show} />;

      case "notifications":
        return <NotificationSection settings={settings} />;

      case "privacy":
        return <PrivacySection settings={settings} />;

      case "security":
        return <SecuritySection settings={settings} show={show} />;

      case "account":
        return <AccountSection show={show} />;

      default:
        return <AddressSection show={show} />;

    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, settings]);

  return (
    <div className="dn st">
      <header className="ust-head">
        <span className="dn-eyebrow">Account</span>

        <h1>Settings</h1>

        <p className="dn-muted">
          Manage your profile, addresses, notifications, privacy and security.
        </p>
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

        <div className="ust-body">{body}</div>
      </div>

      {toast}
    </div>
  );
}
