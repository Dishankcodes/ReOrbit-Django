import React, { useState } from "react";
import AdminForgotPassword from "./AdminForgotPassword";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  PackageCheck,
  ShieldCheck,
  Users,
  Warehouse,
} from "lucide-react";
import { adminLogin } from "../../../api/auth";
import { changeAdminPassword } from "../../../api/profile";
import { saveSession, updateAccount } from "../../../api/session";
import useLockCountdown from "../../../shared/useLockCountdown";
import "../../css/AdminLogin.css";

const POINTS = [
  {
    icon: Users,
    title: "Users and ReMakers",
    text: "Every account, in one place.",
  },
  {
    icon: PackageCheck,
    title: "Listings and orders",
    text: "Follow each item from upload to doorstep.",
  },
  {
    icon: Warehouse,
    title: "Pickups and warehouse",
    text: "Keep the circular loop moving.",
  },
];

export default function AdminLogin() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [forgot, setForgot] = useState(() => new URLSearchParams(window.location.search).get("forgot") === "1");
  const lock = useLockCountdown();
  /* signed in with a temporary password from the super admin: choose your own before going on */
  const [mustChange, setMustChange] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const response = await adminLogin({ email: email.trim(), password });
      const data = response?.data || response;

      saveSession({
        access: data.access,
        refresh: data.refresh,
        type: "admin",
        account: data.admin,
      });

      if (data.admin?.must_change_password) {
        setMustChange(data.admin);
        setLoading(false);
        return;
      }
      setSuccess("Signed in. Opening your dashboard…");
      setTimeout(() => navigate("/admin-dashboard"), 400);
    } catch (err) {
      if (lock.fromError(err)) {
        setError(err.data?.message || "Too many wrong attempts. Please wait a few minutes.");
        setLoading(false);
        return;
      }
      setError(
        err?.data?.message ||
          err?.data?.detail ||
          err?.message ||
          "Unable to sign in.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="al-page">
      {/* BRAND PANEL */}
      <aside className="al-aside">
        <svg
          className="al-orbits"
          viewBox="0 0 620 620"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="310"
            cy="310"
            r="120"
            stroke="currentColor"
            strokeOpacity="0.16"
          />
          <circle
            cx="310"
            cy="310"
            r="195"
            stroke="currentColor"
            strokeOpacity="0.12"
          />
          <circle
            cx="310"
            cy="310"
            r="270"
            stroke="currentColor"
            strokeOpacity="0.09"
          />
          <circle
            cx="310"
            cy="310"
            r="300"
            stroke="currentColor"
            strokeOpacity="0.06"
          />
          <circle
            cx="430"
            cy="310"
            r="6"
            fill="currentColor"
            fillOpacity="0.55"
          />
          <circle
            cx="146"
            cy="175"
            r="5"
            fill="currentColor"
            fillOpacity="0.4"
          />
          <circle
            cx="395"
            cy="545"
            r="7"
            fill="currentColor"
            fillOpacity="0.3"
          />
        </svg>

        <div className="al-brand">
          <div className="al-brand-icon">
            <ShieldCheck size={22} />
          </div>
          <div>
            <strong>ReOrbit</strong>
            <span>Administration</span>
          </div>
        </div>

        <div className="al-pitch">
          <h2>
            Run the circular marketplace, <em>end to end.</em>
          </h2>
          <p>
            Manage members, listings, orders and pickups for ReOrbit from one
            calm, organised workspace.
          </p>

          <ul className="al-points">
            {POINTS.map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <span className="al-pt-icon">
                  <Icon size={18} />
                </span>
                <span>
                  <b>{title}</b>
                  <small>{text}</small>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="al-aside-foot">ReOrbit Management System · Gujarat</div>
      </aside>

      {/* SIGN-IN */}
      <main className="al-main">
        <a href="/admin-home" className="al-back">
          <ArrowLeft size={15} /> Back to Admin
        </a>

        <div className="al-card">
          <span className="al-eyebrow">
            <ShieldCheck size={13} /> Admin access
          </span>
          <h1>Welcome back.</h1>
          <p className="al-sub">Sign in to manage the ReOrbit platform.</p>

          {mustChange ? (
            <ChooseOwnPassword
              admin={mustChange}
              temporary={password}
              onDone={() => {
                updateAccount("admin", { ...mustChange, must_change_password: false });
                setMustChange(null);
                setSuccess("Password saved. Opening your dashboard…");
                setTimeout(() => navigate("/admin-dashboard"), 400);
              }}
            />
          ) : forgot ? (
            <AdminForgotPassword
              initialEmail={email}
              onBack={() => setForgot(false)}
              onDone={(msg, mail) => {
                setForgot(false);
                setEmail(mail);
                setPassword("");
                setError("");
                setSuccess(msg);
              }}
            />
          ) : (
          <form className="al-form" onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="al-alert" role="alert">
                <AlertCircle size={17} />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="al-alert is-ok" role="status">
                <CheckCircle2 size={17} />
                <span>{success}</span>
              </div>
            )}

            <div className="al-field">
              <label htmlFor="admin-email">Email address</label>
              <div className="al-input">
                <Mail size={17} />
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@reorbit.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoFocus
                />
              </div>
            </div>

            <div className="al-field">
              <label htmlFor="admin-password">Password</label>
              <div className="al-input">
                <Lock size={17} />
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="al-eye"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              <button type="button" className="al-link al-forgot" onClick={() => setForgot(true)}>
                Forgot password?
              </button>
            </div>

            <button type="submit" className="al-submit" disabled={loading || lock.active}>
              {lock.active ? (
                <>
                  <Lock size={17} /> Try again in {lock.label}
                </>
              ) : loading ? (
                <>
                  <Loader2 size={18} className="al-spin" /> Signing in…
                </>
              ) : (
                <>
                  Sign in to Admin Panel <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
          )}

          <div className="al-secure">
            <ShieldCheck size={15} /> Secure administrator access
          </div>
        </div>
      </main>
    </div>
  );
}

/* First sign-in with a temporary password: the server allows nothing else until the admin has
   chosen their own (it answers PASSWORD_CHANGE_REQUIRED everywhere else). */
function ChooseOwnPassword({ admin, temporary, onDone }) {
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (next.length < 8 || !/\d/.test(next) || !/[A-Za-z]/.test(next)) {
      setError("Use at least 8 characters with letters and a number.");
      return;
    }
    if (next === temporary) {
      setError("Choose a password different from the temporary one.");
      return;
    }
    if (next !== again) {
      setError("The two passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await changeAdminPassword({ current_password: temporary, new_password: next });
      onDone();
    } catch (err) {
      setError(err?.errors?.new_password?.[0] || err?.data?.message || err?.message || "Password not saved.");
      setBusy(false);
    }
  };

  return (
    <form className="al-form" onSubmit={submit} noValidate>
      <div className="al-alert is-ok" role="status">
        <ShieldCheck size={17} />
        <span>
          Hi {(admin.full_name || "there").split(" ")[0]}, you signed in with a temporary password. Choose your
          own to continue.
        </span>
      </div>
      {error && (
        <div className="al-alert" role="alert">
          <AlertCircle size={17} />
          <span>{error}</span>
        </div>
      )}
      <div className="al-field">
        <label htmlFor="admin-new-password">New password</label>
        <div className="al-input">
          <Lock size={17} />
          <input
            id="admin-new-password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            placeholder="8+ characters, letters and a number"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            disabled={busy}
            autoFocus
          />
          <button
            type="button"
            className="al-eye"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </div>
      <div className="al-field">
        <label htmlFor="admin-new-password-again">Confirm new password</label>
        <div className="al-input">
          <Lock size={17} />
          <input
            id="admin-new-password-again"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Type it again"
            value={again}
            onChange={(e) => setAgain(e.target.value)}
            disabled={busy}
          />
        </div>
      </div>
      <button type="submit" className="al-submit" disabled={busy}>
        {busy ? (
          <>
            <Loader2 size={18} className="al-spin" /> Saving…
          </>
        ) : (
          <>
            Save and continue <ArrowRight size={17} />
          </>
        )}
      </button>
    </form>
  );
}
