import React, { useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, Loader2, Lock, Mail } from "lucide-react";
import { apiRequest } from "../../../api/api";

/* Admin sign-in › Forgot password: email → 6-digit code → new password (twice). Nothing changes until
   the code is right, and a confirmation email follows the reset. */
export default function AdminForgotPassword({ initialEmail = "", onDone, onBack }) {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const send = async (e) => {
    e?.preventDefault();
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter your admin email address.");
    setBusy(true);
    try {
      const r = await apiRequest("/admins/auth/forgot-password/request-otp/", {
        method: "POST",
        body: { email },
        auth: false,
      });
      setInfo(r.message);
      setStep("reset");
    } catch (ex) {
      setError(ex.message || "Couldn't send the code.");
    } finally {
      setBusy(false);
    }
  };
  const reset = async (e) => {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(otp.trim())) return setError("Enter the 6-digit code from the email.");
    if (pw.length < 8 || !/\d/.test(pw) || !/[A-Za-z]/.test(pw))
      return setError("Use at least 8 characters with letters and a number.");
    if (pw !== pw2) return setError("The two passwords don't match.");
    setBusy(true);
    try {
      const r = await apiRequest("/admins/auth/forgot-password/reset/", {
        method: "POST",
        body: { email, otp: otp.trim(), new_password: pw, confirm_password: pw2 },
        auth: false,
      });
      onDone(r.message || "Password reset. Sign in with your new password.", email);
    } catch (ex) {
      setError(ex.errors?.otp?.[0] || ex.errors?.new_password?.[0] || ex.message || "Couldn't reset the password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="al-form" onSubmit={step === "email" ? send : reset} noValidate>
      <button type="button" className="al-back" onClick={onBack}>
        <ArrowLeft size={15} /> Back to sign in
      </button>
      <h3 className="al-forgot-title">
        <KeyRound size={18} /> Reset your password
      </h3>
      {error && (
        <div className="al-alert" role="alert">
          <AlertCircle size={17} />
          <span>{error}</span>
        </div>
      )}
      {info && step === "reset" && (
        <div className="al-alert is-ok" role="status">
          <CheckCircle2 size={17} />
          <span>{info}</span>
        </div>
      )}
      <div className="al-field">
        <label htmlFor="af-email">Admin email</label>
        <div className="al-input">
          <Mail size={17} />
          <input
            id="af-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy || step === "reset"}
            autoFocus={step === "email"}
          />
        </div>
      </div>
      {step === "reset" && (
        <>
          <div className="al-field">
            <label htmlFor="af-otp">6-digit code</label>
            <div className="al-input">
              <KeyRound size={17} />
              <input
                id="af-otp"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                autoFocus
              />
            </div>
          </div>
          <div className="al-field">
            <label htmlFor="af-pw">New password</label>
            <div className="al-input">
              <Lock size={17} />
              <input id="af-pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>
          </div>
          <div className="al-field">
            <label htmlFor="af-pw2">Confirm new password</label>
            <div className="al-input">
              <Lock size={17} />
              <input id="af-pw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            </div>
          </div>
          <button type="button" className="al-link" onClick={send} disabled={busy}>
            Send the code again
          </button>
        </>
      )}
      <button type="submit" className="al-submit" disabled={busy}>
        {busy ? <Loader2 size={18} className="al-spin" /> : null}
        {step === "email" ? "Email me a code" : "Reset password"}
      </button>
    </form>
  );
}
