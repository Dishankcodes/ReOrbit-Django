import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../css/ReMakerAuth.css";

export default function ReMakerAuth() {
  const [step, setStep] = useState("login");
  const [emailExists, setEmailExists] = useState(null);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [resendTimer, setResendTimer] = useState(0);

  /* =====================================================
     OTP TIMER
  ===================================================== */

  useEffect(() => {
    if (resendTimer <= 0) return;

    const timer = setInterval(() => {
      setResendTimer((current) => current - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [resendTimer]);

  /* =====================================================
     OTP INPUT
  ===================================================== */

  const handleOtpChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;

    const updated = [...otp];
    updated[index] = value;

    setOtp(updated);

    if (value && index < 5) {
      document.getElementById(`remaker-otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (event, index) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`remaker-otp-${index - 1}`)?.focus();
    }
  };

  /* =====================================================
     RESET
  ===================================================== */

  const resetAuth = () => {
    setStep("login");
    setEmailExists(null);
    setEmail("");
    setName("");
    setUsername("");
    setOtp(["", "", "", "", "", ""]);
    setMessage("");
    setLoading(false);
  };

  /* =====================================================
     EMAIL CHECK
     
     Replace this with your Django API later.
  ===================================================== */

  const checkEmail = async (event) => {
    event.preventDefault();

    if (!email.trim()) return;

    setLoading(true);
    setMessage("");

    /*
      BACKEND LATER:

      const response = await fetch(
        "/api/remaker/auth/check-email/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();

      if (data.exists) {
        ...
      }
    */

    setTimeout(() => {
      /*
        DEMO ONLY.

        Remove this once Django is connected.
        Currently emails containing "existing"
        behave like existing accounts.
      */

      const exists = email.toLowerCase().includes("existing");

      setEmailExists(exists);

      if (exists) {
        requestOtp();
      } else {
        setStep("register");
      }

      setLoading(false);
    }, 700);
  };

  /* =====================================================
     REQUEST OTP
  ===================================================== */

  const requestOtp = () => {
    setLoading(true);
    setMessage("");

    /*
      BACKEND LATER:

      POST /api/remaker/auth/request-otp/
      {
        email
      }
    */

    setTimeout(() => {
      setOtp(["", "", "", "", "", ""]);
      setStep("otp");
      setResendTimer(30);
      setMessage("A verification code has been sent to your email.");
      setLoading(false);
    }, 800);
  };

  /* =====================================================
     REGISTER
  ===================================================== */

  const handleRegister = (event) => {
    event.preventDefault();

    if (!name.trim() || !username.trim()) return;

    requestOtp();
  };

  /* =====================================================
     VERIFY OTP
  ===================================================== */

  const verifyOtp = (event) => {
    event.preventDefault();

    const enteredOtp = otp.join("");

    if (enteredOtp.length !== 6) {
      setMessage("Please enter the complete 6-digit OTP.");
      return;
    }

    setLoading(true);
    setMessage("");

    /*
      BACKEND LATER:

      POST /api/remaker/auth/verify-otp/
      {
        email,
        otp
      }
    */

    setTimeout(() => {
      if (emailExists) {
        /*
          Existing ReMaker
          OTP → Dashboard
        */

        window.location.href = "/remakers/dashboard";
      } else {
        /*
          New ReMaker
          OTP → Confirm registration
        */

        setStep("confirm");
        setLoading(false);
      }
    }, 900);
  };

  /* =====================================================
     COMPLETE REGISTRATION
  ===================================================== */

  const completeRegistration = () => {
    setLoading(true);

    /*
      BACKEND LATER:

      POST /api/remaker/auth/register/
      {
        name,
        username,
        email
      }
    */

    setTimeout(() => {
      window.location.href = "/remakers/dashboard";
    }, 900);
  };

  /* =====================================================
     RESEND OTP
  ===================================================== */

  const resendOtp = () => {
    if (resendTimer > 0 || resendLoading) return;

    setResendLoading(true);
    setMessage("");

    setTimeout(() => {
      setOtp(["", "", "", "", "", ""]);
      setResendTimer(30);
      setMessage("A new verification code has been sent.");
      setResendLoading(false);
    }, 700);
  };

  /* =====================================================
     GOOGLE
  ===================================================== */

  const handleGoogleLogin = () => {
    /*
      BACKEND LATER:

      Redirect to Django Google OAuth:

      window.location.href =
        "/api/remaker/auth/google/";
    */

    setLoading(true);

    setTimeout(() => {
      window.location.href = "/remakers/dashboard";
    }, 900);
  };

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="remaker-page rm-page remaker-auth-page">  
      <Navbar />

      {/* =================================================
          BACKGROUND
      ================================================= */}

      <main className="remaker-auth-main">
        <div className="remaker-auth-grid" />

        <span className="remaker-auth-star star-one" />
        <span className="remaker-auth-star star-two" />
        <span className="remaker-auth-star star-three" />
        <span className="remaker-auth-star star-four" />

        {/* =================================================
            ORBITAL BACKGROUND
        ================================================= */}

        <div className="remaker-orbit-stage">
          <div className="remaker-orbit orbit-one">
            <span />
          </div>

          <div className="remaker-orbit orbit-two">
            <span />
          </div>

          <div className="remaker-orbit orbit-three">
            <span />
          </div>

          <div className="remaker-orbit-core">
            <span>ReOrbit</span>
          </div>

          {/* =================================================
              AUTH CARD
          ================================================= */}

          <section className={`remaker-auth-card remaker-step-${step}`}>
            {/* LOGO */}

            <div className="remaker-auth-logo">
              <span className="remaker-logo-mark">
                <span className="material-symbols-outlined">eco</span>
              </span>

              <span>ReOrbit</span>
            </div>

            {/* =================================================
                LOGIN
            ================================================= */}

            {step === "login" && (
              <div className="remaker-auth-content">
                <div className="remaker-auth-heading">
                  <span className="remaker-auth-eyebrow">REMAKER ACCESS</span>

                  <h1>Welcome back.</h1>

                  <p>Sign in to continue your making journey.</p>
                </div>

                <form className="remaker-auth-form" onSubmit={checkEmail}>
                  <div className="remaker-field">
                    <label htmlFor="remaker-email">Email address</label>

                    <input
                      id="remaker-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="remaker-submit"
                    disabled={loading}
                  >
                    {loading ? "Checking..." : "Continue with email"}

                    {!loading && (
                      <span className="material-symbols-outlined">
                        arrow_forward
                      </span>
                    )}
                  </button>
                </form>

                <div className="remaker-divider">
                  <span />
                  <p>OR</p>
                  <span />
                </div>

                <button
                  className="remaker-google"
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  <span className="google-letter">G</span>
                  Continue with Google
                </button>

                <div className="remaker-auth-note">
                  <span className="material-symbols-outlined">lock</span>
                  No password required. We&apos;ll send you a secure
                  verification code.
                </div>

                {message && <p className="remaker-auth-message">{message}</p>}
              </div>
            )}

            {/* =================================================
                REGISTER
            ================================================= */}

            {step === "register" && (
              <div className="remaker-auth-content">
                <div className="remaker-auth-heading">
                  <span className="remaker-auth-eyebrow">NEW REMAKER</span>

                  <h1>Create your orbit.</h1>

                  <p>
                    We couldn&apos;t find an account with this email. Let&apos;s
                    create your ReMaker profile.
                  </p>
                </div>

                <form className="remaker-auth-form" onSubmit={handleRegister}>
                  <div className="remaker-field">
                    <label htmlFor="remaker-name">Full name</label>

                    <input
                      id="remaker-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      required
                    />
                  </div>

                  <div className="remaker-field">
                    <label htmlFor="remaker-username">Username</label>

                    <input
                      id="remaker-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="@yourmakername"
                      required
                    />
                  </div>

                  <div className="remaker-field">
                    <label>Email address</label>

                    <input type="email" value={email} readOnly />
                  </div>

                  <button
                    type="submit"
                    className="remaker-submit"
                    disabled={loading}
                  >
                    {loading ? "Sending..." : "Continue"}

                    {!loading && (
                      <span className="material-symbols-outlined">
                        arrow_forward
                      </span>
                    )}
                  </button>
                </form>

                <button className="remaker-back-link" onClick={resetAuth}>
                  <span className="material-symbols-outlined">arrow_back</span>
                  Use another email
                </button>
              </div>
            )}

            {/* =================================================
                OTP
            ================================================= */}

            {step === "otp" && (
              <div className="remaker-auth-content">
                <div className="remaker-auth-heading">
                  <span className="remaker-auth-eyebrow">
                    VERIFY YOUR EMAIL
                  </span>

                  <h1>Enter your code.</h1>

                  <p>
                    We sent a 6-digit verification code to
                    <strong>{email}</strong>
                  </p>
                </div>

                <form className="remaker-auth-form" onSubmit={verifyOtp}>
                  <div className="remaker-otp">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        id={`remaker-otp-${index}`}
                        type="text"
                        inputMode="numeric"
                        maxLength="1"
                        value={digit}
                        onChange={(e) => handleOtpChange(e.target.value, index)}
                        onKeyDown={(e) => handleOtpKeyDown(e, index)}
                        autoComplete="one-time-code"
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="remaker-submit"
                    disabled={loading}
                  >
                    {loading ? "Verifying..." : "Verify OTP"}

                    {!loading && (
                      <span className="material-symbols-outlined">
                        verified
                      </span>
                    )}
                  </button>
                </form>

                <div className="remaker-resend">
                  <span>Didn&apos;t receive the code?</span>

                  <button
                    type="button"
                    disabled={resendTimer > 0 || resendLoading}
                    onClick={resendOtp}
                  >
                    {resendLoading
                      ? "Sending..."
                      : resendTimer > 0
                        ? `Resend in ${resendTimer}s`
                        : "Resend OTP"}
                  </button>
                </div>

                {message && <p className="remaker-auth-message">{message}</p>}

                <button className="remaker-back-link" onClick={resetAuth}>
                  <span className="material-symbols-outlined">arrow_back</span>
                  Use another email
                </button>
              </div>
            )}

            {/* =================================================
                CONFIRM REGISTRATION
            ================================================= */}

            {step === "confirm" && (
              <div className="remaker-auth-content">
                <div className="remaker-confirm-icon">
                  <span className="material-symbols-outlined">verified</span>
                </div>

                <div className="remaker-auth-heading">
                  <span className="remaker-auth-eyebrow">
                    REGISTRATION VERIFIED
                  </span>

                  <h1>Confirm your orbit.</h1>

                  <p>
                    Your email has been verified. Check your details before
                    creating your ReMaker account.
                  </p>
                </div>

                <div className="remaker-confirm-card">
                  <div>
                    <span>Name</span>
                    <strong>{name}</strong>
                  </div>

                  <div>
                    <span>Username</span>
                    <strong>@{username}</strong>
                  </div>

                  <div>
                    <span>Email</span>
                    <strong>{email}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="remaker-submit"
                  onClick={completeRegistration}
                  disabled={loading}
                >
                  {loading ? "Creating account..." : "Complete registration"}

                  {!loading && (
                    <span className="material-symbols-outlined">
                      arrow_forward
                    </span>
                  )}
                </button>

                <button
                  className="remaker-back-link"
                  onClick={() => setStep("register")}
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                  Edit details
                </button>
              </div>
            )}

            {/* =================================================
                FOOTER SWITCH
            ================================================= */}

            <div className="remaker-auth-footer">
              {step === "login" ? (
                <>
                  <span>New to ReOrbit?</span>

                  <button
                    type="button"
                    onClick={() => {
                      setStep("register");
                      setEmailExists(false);
                    }}
                  >
                    Create account
                  </button>
                </>
              ) : (
                <>
                  <span>Already have an account?</span>

                  <button type="button" onClick={resetAuth}>
                    Sign in
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
