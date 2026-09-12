import React, { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import "../../css/ReMakerAuth.css";

import {
  checkReMakerEmail,
  requestReMakerRegistrationOTP,
  requestReMakerLoginOTP,
  registerReMaker,
  verifyReMakerLoginOTP,
} from "../../../api/auth";

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

  // Handle OTP resend timer.
  useEffect(() => {
    if (resendTimer <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setResendTimer((current) => {
        if (current <= 1) {
          clearInterval(timer);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [resendTimer]);

  // Handle OTP input.
  const handleOtpChange = (value, index) => {
    if (!/^\d?$/.test(value)) {
      return;
    }

    const updated = [...otp];
    updated[index] = value;

    setOtp(updated);
    setMessage("");

    if (value && index < 5) {
      document.getElementById(`remaker-otp-${index + 1}`)?.focus();
    }
  };

  // Handle OTP backspace navigation.
  const handleOtpKeyDown = (event, index) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`remaker-otp-${index - 1}`)?.focus();
    }
  };

  // Reset authentication flow.
  const resetAuth = () => {
    setStep("login");
    setEmailExists(null);
    setEmail("");
    setName("");
    setUsername("");
    setOtp(["", "", "", "", "", ""]);
    setMessage("");
    setLoading(false);
    setResendLoading(false);
    setResendTimer(0);
  };

  // Check whether the ReMaker email exists.
  const checkEmail = async (event) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setMessage("Please enter your email address.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await checkReMakerEmail(normalizedEmail);

      const exists = Boolean(response?.data?.exists);

      setEmail(normalizedEmail);
      setEmailExists(exists);

      if (exists) {
        await requestReMakerLoginOTP(normalizedEmail);

        setOtp(["", "", "", "", "", ""]);
        setStep("otp");
        setResendTimer(30);
        setMessage("A verification code has been sent to your email.");
      } else {
        setStep("register");
        setMessage("");
      }
    } catch (error) {
      setMessage(
        error?.message || "Unable to check your email. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Send the registration OTP.
  const handleRegister = async (event) => {
    event.preventDefault();

    const normalizedName = name.trim();
    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedName) {
      setMessage("Please enter your full name.");
      return;
    }

    if (!normalizedUsername) {
      setMessage("Please enter your username.");
      return;
    }

    if (!normalizedEmail) {
      setMessage("Please enter your email address.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await requestReMakerRegistrationOTP(
        normalizedEmail,
        normalizedName,
        normalizedUsername,
      );

      setName(normalizedName);
      setUsername(normalizedUsername);
      setEmail(normalizedEmail);
      setEmailExists(false);
      setOtp(["", "", "", "", "", ""]);
      setStep("otp");
      setResendTimer(30);

      setMessage(
        response?.message || "A verification code has been sent to your email.",
      );
    } catch (error) {
      setMessage(error?.message || "Unable to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Verify login or registration OTP.
  const verifyOtp = async (event) => {
    event.preventDefault();

    const enteredOtp = otp.join("");

    if (enteredOtp.length !== 6) {
      setMessage("Please enter the complete 6-digit OTP.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      if (emailExists) {
        const response = await verifyReMakerLoginOTP(
          email.trim().toLowerCase(),
          enteredOtp,
        );

        const accessToken = response?.data?.access;

        const refreshToken = response?.data?.refresh;

        const remaker = response?.data?.remaker;

        if (!accessToken || !refreshToken) {
          throw new Error("Login response is missing authentication tokens.");
        }

        localStorage.setItem("reorbit_access_token", accessToken);

        localStorage.setItem("reorbit_refresh_token", refreshToken);

        if (remaker) {
          localStorage.setItem("reorbit_remaker", JSON.stringify(remaker));
        }

        window.location.href = "/remakers-home";
        return;
      }

      const response = await registerReMaker({
        email: email.trim().toLowerCase(),
        otp: enteredOtp,
        full_name: name.trim(),
        username: username.trim(),
      });

      const accessToken = response?.data?.access;

      const refreshToken = response?.data?.refresh;

      const remaker = response?.data?.remaker;

      if (!accessToken || !refreshToken) {
        throw new Error(
          "Registration response is missing authentication tokens.",
        );
      }

      localStorage.setItem("reorbit_access_token", accessToken);

      localStorage.setItem("reorbit_refresh_token", refreshToken);

      if (remaker) {
        localStorage.setItem("reorbit_remaker", JSON.stringify(remaker));
      }

      setStep("confirm");
      setMessage(
        response?.message ||
          "Your ReMaker account has been created successfully.",
      );
    } catch (error) {
      setMessage(error?.message || "Invalid or expired OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Complete registration and enter ReOrbit.
  const completeRegistration = () => {
    setLoading(true);
    setMessage("");

    window.location.href = "/remakers-home";
  };

  // Resend the current OTP.
  const resendOtp = async () => {
    if (resendTimer > 0 || resendLoading || loading) {
      return;
    }

    setResendLoading(true);
    setMessage("");

    try {
      if (emailExists) {
        const response = await requestReMakerLoginOTP(
          email.trim().toLowerCase(),
        );

        setMessage(
          response?.message || "A new verification code has been sent.",
        );
      } else {
        const response = await requestReMakerRegistrationOTP(
          email.trim().toLowerCase(),
          name.trim(),
          username.trim(),
        );

        setMessage(
          response?.message || "A new verification code has been sent.",
        );
      }

      setOtp(["", "", "", "", "", ""]);
      setResendTimer(30);

      document.getElementById("remaker-otp-0")?.focus();
    } catch (error) {
      setMessage(error?.message || "Unable to resend OTP. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  // Google authentication will be added later.
  const handleGoogleLogin = () => {
    setMessage("Google login will be available soon.");
  };

  return (
    <div className="remaker-page rm-page remaker-auth-page">
      <Navbar />

      <main className="remaker-auth-main">
        <div className="remaker-auth-grid" />

        <span className="remaker-auth-star star-one" />
        <span className="remaker-auth-star star-two" />
        <span className="remaker-auth-star star-three" />
        <span className="remaker-auth-star star-four" />

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

          <section className={`remaker-auth-card remaker-step-${step}`}>
            <div className="remaker-auth-logo">
              <span className="remaker-logo-mark">
                <span className="material-symbols-outlined">eco</span>
              </span>

              <span>ReOrbit</span>
            </div>

            {step === "login" && (
              <div className="remaker-auth-content">
                <div className="remaker-auth-heading">
                  <span className="remaker-auth-eyebrow">REMAKER ACCESS</span>

                  <h1>Welcome back.</h1>

                  <p>Sign in to continue your making journey.</p>
                </div>

                <form className="remaker-auth-form" onSubmit={checkEmail}>
                  <div className="remaker-field">
                    <label htmlFor="remaker-register-email">
                      Email address
                    </label>

                    <input
                      id="remaker-register-email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setMessage("");
                      }}
                      placeholder="you@example.com"
                      autoComplete="email"
                      readOnly={Boolean(email)}
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
                      autoComplete="name"
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
                      autoComplete="username"
                      required
                    />
                  </div>

                  <div className="remaker-field">
                    <label htmlFor="remaker-register-email">
                      Email address
                    </label>

                    <input
                      id="remaker-register-email"
                      type="email"
                      value={email}
                      readOnly
                    />
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

                <button
                  type="button"
                  className="remaker-back-link"
                  onClick={resetAuth}
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                  Use another email
                </button>

                {message && <p className="remaker-auth-message">{message}</p>}
              </div>
            )}

            {step === "otp" && (
              <div className="remaker-auth-content">
                <div className="remaker-auth-heading">
                  <span className="remaker-auth-eyebrow">
                    VERIFY YOUR EMAIL
                  </span>

                  <h1>Enter your code.</h1>

                  <p>
                    We sent a 6-digit verification code to{" "}
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
                        autoComplete={index === 0 ? "one-time-code" : "off"}
                        aria-label={`OTP digit ${index + 1}`}
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
                    disabled={resendTimer > 0 || resendLoading || loading}
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

                <button
                  type="button"
                  className="remaker-back-link"
                  onClick={resetAuth}
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                  Use another email
                </button>
              </div>
            )}

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
                    Your email has been verified and your ReMaker account has
                    been created successfully.
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
                  {loading ? "Opening ReOrbit..." : "Continue to ReOrbit"}

                  {!loading && (
                    <span className="material-symbols-outlined">
                      arrow_forward
                    </span>
                  )}
                </button>

                {message && <p className="remaker-auth-message">{message}</p>}
              </div>
            )}

            <div className="remaker-auth-footer">
              {step === "login" ? (
                <>
                  <span>New to ReOrbit?</span>

                  <button
                    type="button"
                    onClick={() => {
                      setStep("register");
                      setEmailExists(false);
                      setMessage("");
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
