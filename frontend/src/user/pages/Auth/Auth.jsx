import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

import {
  userRegister,
  userLogin,
  requestForgotPasswordOTP,
  verifyForgotPasswordOTP,
  resetForgotPassword,
} from "../../../api/auth";

import "../../css/Auth.css";

export default function Auth() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [resendTimer, setResendTimer] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);

  const otpRefs = useRef([]);

  // Clear success and error messages.
  const clearMessages = () => {
    setMessage("");
    setError("");
  };

  // Save authenticated user data.
  const saveAuthData = (data) => {
    const storage = rememberMe ? localStorage : sessionStorage;

    storage.setItem("reorbit_access_token", data.access);

    storage.setItem("reorbit_refresh_token", data.refresh);

    storage.setItem("reorbit_account_type", "user");

    storage.setItem("reorbit_account_id", String(data.user.user_id));

    storage.setItem("reorbit_user", JSON.stringify(data.user));

    const otherStorage = rememberMe ? sessionStorage : localStorage;

    otherStorage.removeItem("reorbit_access_token");

    otherStorage.removeItem("reorbit_refresh_token");

    otherStorage.removeItem("reorbit_account_type");

    otherStorage.removeItem("reorbit_account_id");

    otherStorage.removeItem("reorbit_user");
  };

  // Handle OTP countdown.
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

  // Start OTP resend timer.
  const startResendTimer = () => {
    setResendTimer(30);
  };

  // Reset OTP boxes.
  const clearOtp = () => {
    setOtp(["", "", "", "", "", ""]);
  };

  // Handle OTP box input.
  const handleOtpChange = (value, index) => {
    const digit = value.replace(/\D/g, "").slice(-1);

    const updatedOtp = [...otp];
    updatedOtp[index] = digit;

    setOtp(updatedOtp);
    setError("");
    setMessage("");

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  // Handle OTP keyboard navigation.
  const handleOtpKeyDown = (event, index) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Handle OTP paste.
  const handleOtpPaste = (event) => {
    event.preventDefault();

    const pastedValue = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (!pastedValue) {
      return;
    }

    const updatedOtp = ["", "", "", "", "", ""];

    pastedValue.split("").forEach((digit, index) => {
      updatedOtp[index] = digit;
    });

    setOtp(updatedOtp);
    setError("");
    setMessage("");

    const focusIndex = Math.min(pastedValue.length, 5);

    otpRefs.current[focusIndex]?.focus();
  };

  // Login user.
  const handleLogin = async (e) => {
    e.preventDefault();

    clearMessages();

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await userLogin({
        email: email.trim().toLowerCase(),
        password,
      });

      saveAuthData(response.data);

      setMessage(response.message || "Login successful.");

      setTimeout(() => {
        navigate("/user-dashboard");
      }, 500);
    } catch (err) {
      setError(err?.data?.message || err?.message || "Unable to login.");
    } finally {
      setLoading(false);
    }
  };

  // Register user.
  const handleRegister = async (e) => {
    e.preventDefault();

    clearMessages();

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!password) {
      setError("Please enter a password.");
      return;
    }

    setLoading(true);

    try {
      const response = await userRegister({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      saveAuthData(response.data);

      setMessage(response.message || "Registration successful.");

      setTimeout(() => {
        navigate("/user-dashboard");
      }, 500);
    } catch (err) {
      setError(
        err?.data?.message || err?.message || "Unable to create your account.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Request forgot-password OTP.
  const handleForgotEmail = async (e) => {
    e.preventDefault();

    clearMessages();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      const response = await requestForgotPasswordOTP(normalizedEmail);

      setEmail(normalizedEmail);
      clearOtp();
      setResetToken("");
      startResendTimer();

      setMessage(response.message || "OTP sent successfully.");

      setMode("forgot-otp");

      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 100);
    } catch (err) {
      setError(err?.data?.message || err?.message || "Unable to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  // Verify forgot-password OTP.
  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    clearMessages();

    const enteredOtp = otp.join("");

    if (enteredOtp.length !== 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }

    setLoading(true);

    try {
      const response = await verifyForgotPasswordOTP(
        email.trim().toLowerCase(),
        enteredOtp,
      );

      const token = response?.data?.reset_token;

      if (!token) {
        setError("OTP verified, but the reset session could not be created.");
        return;
      }

      setResetToken(token);

      setMessage(response.message || "OTP verified successfully.");

      setMode("forgot-password");
    } catch (err) {
      setError(err?.data?.message || err?.message || "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  // Resend forgot-password OTP.
  const handleResendOTP = async () => {
    if (resendTimer > 0 || resendLoading || loading) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Please enter your email address.");
      return;
    }

    setResendLoading(true);
    clearMessages();

    try {
      const response = await requestForgotPasswordOTP(normalizedEmail);

      clearOtp();
      setResetToken("");
      startResendTimer();

      setMessage(response.message || "A new OTP has been sent to your email.");

      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 100);
    } catch (err) {
      setError(err?.data?.message || err?.message || "Unable to resend OTP.");
    } finally {
      setResendLoading(false);
    }
  };

  // Reset user password.
  const handleResetPassword = async (e) => {
    e.preventDefault();

    clearMessages();

    if (!newPassword) {
      setError("Please enter your new password.");
      return;
    }

    if (!confirmPassword) {
      setError("Please confirm your new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!resetToken) {
      setError("Your reset session is invalid. Please request a new OTP.");
      return;
    }

    setLoading(true);

    try {
      const response = await resetForgotPassword(resetToken, newPassword);

      clearOtp();
      setResetToken("");
      setNewPassword("");
      setConfirmPassword("");

      setMessage(response.message || "Password reset successfully.");

      setTimeout(() => {
        setMode("login");
      }, 900);
    } catch (err) {
      setError(
        err?.data?.message || err?.message || "Unable to reset password.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Switch between login and register.
  const switchMode = () => {
    clearMessages();

    setMode(mode === "register" ? "login" : "register");

    setShowPassword(false);
    setLoading(false);
  };

  // Open forgot-password flow.
  const openForgotPassword = () => {
    clearMessages();

    clearOtp();
    setResetToken("");
    setNewPassword("");
    setConfirmPassword("");
    setResendTimer(0);

    setMode("forgot-email");
  };

  // Return to login.
  const backToLogin = () => {
    clearMessages();

    setMode("login");

    clearOtp();
    setResetToken("");
    setNewPassword("");
    setConfirmPassword("");
    setResendTimer(0);
  };

  // Return to forgot email.
  const changeForgotEmail = () => {
    clearMessages();

    clearOtp();
    setResetToken("");
    setResendTimer(0);

    setMode("forgot-email");
  };

  // Get authentication heading.
  const getHeading = () => {
    if (mode === "register") {
      return {
        eyebrow: "CREATE YOUR ORBIT",
        title: "Create account",
        description:
          "Create your account and start giving things another orbit.",
      };
    }

    if (
      mode === "forgot-email" ||
      mode === "forgot-otp" ||
      mode === "forgot-password"
    ) {
      return {
        eyebrow: "ACCOUNT RECOVERY",
        title: "Reset password",
        description: "Securely recover your ReOrbit account.",
      };
    }

    return {
      eyebrow: "WELCOME BACK",
      title: "Sign in",
      description: "Continue your journey and return to your ReOrbit space.",
    };
  };

  const heading = getHeading();

  return (
    <div className="user-auth-page">
      <Navbar />

      <main className="auth-page">
        <div className="auth-space" />

        <div className="auth-grid" />

        <span className="auth-star star-1" />
        <span className="auth-star star-2" />
        <span className="auth-star star-3" />
        <span className="auth-star star-4" />

        <section className="auth-stage">
          <div className="orbit orbit-one">
            <span className="orbit-dot" />
          </div>

          <div className="orbit orbit-two">
            <span className="orbit-dot" />
          </div>

          <div className="orbit orbit-three">
            <span className="orbit-dot" />
          </div>

          <div className="orbit-core">
            <span>ReOrbit</span>
          </div>

          <div
            className={`auth-card ${
              mode === "register"
                ? "register-mode"
                : mode.startsWith("forgot")
                  ? "forgot-mode"
                  : "login-mode"
            }`}
          >
            <div className="auth-logo">
              <span className="logo-dot" />
              <span>ReOrbit</span>
            </div>

            <div className="auth-heading">
              <span className="auth-eyebrow">{heading.eyebrow}</span>

              <h1>{heading.title}</h1>

              <p>{heading.description}</p>
            </div>

            {message && (
              <div className="auth-message auth-success">
                <span className="material-symbols-outlined">check_circle</span>

                <span>{message}</span>
              </div>
            )}

            {error && (
              <div className="auth-message auth-error">
                <span className="material-symbols-outlined">error</span>

                <span>{error}</span>
              </div>
            )}

            {mode === "login" && (
              <form onSubmit={handleLogin}>
                <div className="auth-field">
                  <label htmlFor="email">Email address</label>

                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearMessages();
                    }}
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="password">Password</label>

                  <div className="password-wrapper">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearMessages();
                      }}
                      autoComplete="current-password"
                      required
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div className="auth-options">
                  <label className="remember-me">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />

                    <span className="custom-checkbox" />

                    <span>Remember me</span>
                  </label>

                  <button
                    type="button"
                    className="forgot-password"
                    onClick={openForgotPassword}
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  className={`auth-submit ${loading ? "is-loading" : ""}`}
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>

                <div className="auth-divider">
                  <span />
                  <p>OR</p>
                  <span />
                </div>

                <button
                  type="button"
                  className="google-button"
                  disabled
                  title="Google Login will be added later."
                >
                  <span className="google-icon">G</span>

                  <span>Continue with Google</span>
                </button>
              </form>
            )}

            {mode === "register" && (
              <form onSubmit={handleRegister}>
                <div className="auth-field">
                  <label htmlFor="name">Full name</label>

                  <input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      clearMessages();
                    }}
                    autoComplete="name"
                    required
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="register-email">Email address</label>

                  <input
                    id="register-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearMessages();
                    }}
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="register-password">Password</label>

                  <div className="password-wrapper">
                    <input
                      id="register-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearMessages();
                      }}
                      autoComplete="new-password"
                      required
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <label className="auth-terms">
                  <input type="checkbox" required />

                  <span>
                    I agree to the <a href="/UserTerms">Terms</a> and{" "}
                    <a href="/UserPrivacy">Privacy Policy</a>.
                  </span>
                </label>

                <button
                  type="submit"
                  className={`auth-submit ${loading ? "is-loading" : ""}`}
                  disabled={loading}
                >
                  {loading ? "Creating account..." : "Create account"}
                </button>

                <div className="auth-divider">
                  <span />
                  <p>OR</p>
                  <span />
                </div>

                <button
                  type="button"
                  className="google-button"
                  disabled
                  title="Google Login will be added later."
                >
                  <span className="google-icon">G</span>

                  <span>Continue with Google</span>
                </button>
              </form>
            )}

            {mode === "forgot-email" && (
              <form
                onSubmit={handleForgotEmail}
                className="forgot-password-form"
              >
                <div className="forgot-step">
                  <span>01</span>

                  <div>
                    <strong>Enter your email</strong>

                    <p>
                      We&apos;ll send a verification code to your registered
                      email.
                    </p>
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="forgot-email">Email address</label>

                  <input
                    id="forgot-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearMessages();
                    }}
                    autoComplete="email"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="auth-submit"
                  disabled={loading}
                >
                  {loading ? "Sending OTP..." : "Send OTP"}

                  {!loading && (
                    <span className="material-symbols-outlined">
                      arrow_forward
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  className="auth-secondary-button"
                  onClick={backToLogin}
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                  Back to sign in
                </button>
              </form>
            )}

            {mode === "forgot-otp" && (
              <form onSubmit={handleVerifyOTP} className="forgot-password-form">
                <div className="forgot-step">
                  <span>02</span>

                  <div>
                    <strong>Verify your email</strong>

                    <p>
                      Enter the 6-digit code sent to <strong>{email}</strong>
                    </p>
                  </div>
                </div>

                <div className="forgot-otp-container">
                  <label>Verification code</label>

                  <div className="forgot-otp-boxes" onPaste={handleOtpPaste}>
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(element) => {
                          otpRefs.current[index] = element;
                        }}
                        id={`forgot-otp-${index}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(e.target.value, index)}
                        onKeyDown={(e) => handleOtpKeyDown(e, index)}
                        autoComplete={index === 0 ? "one-time-code" : "off"}
                        aria-label={`OTP digit ${index + 1}`}
                      />
                    ))}
                  </div>

                  <p className="forgot-otp-help">
                    Enter the 6-digit code from your email.
                  </p>
                </div>

                <button
                  type="submit"
                  className="auth-submit"
                  disabled={loading || otp.join("").length !== 6}
                >
                  {loading ? "Verifying..." : "Verify OTP"}

                  {!loading && (
                    <span className="material-symbols-outlined">verified</span>
                  )}
                </button>

                <div className="forgot-resend">
                  <span>Didn&apos;t receive the code?</span>

                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={resendTimer > 0 || resendLoading || loading}
                  >
                    {resendLoading
                      ? "Sending..."
                      : resendTimer > 0
                        ? `Resend in ${resendTimer}s`
                        : "Resend OTP"}
                  </button>
                </div>

                <button
                  type="button"
                  className="auth-secondary-button"
                  onClick={changeForgotEmail}
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                  Change email
                </button>
              </form>
            )}

            {mode === "forgot-password" && (
              <form
                onSubmit={handleResetPassword}
                className="forgot-password-form"
              >
                <div className="forgot-step">
                  <span>03</span>

                  <div>
                    <strong>Create new password</strong>

                    <p>
                      Your email has been verified. Create a new password for
                      your account.
                    </p>
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="new-password">New password</label>

                  <div className="password-wrapper">
                    <input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        clearMessages();
                      }}
                      autoComplete="new-password"
                      required
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="confirm-password">Confirm password</label>

                  <input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      clearMessages();
                    }}
                    autoComplete="new-password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="auth-submit"
                  disabled={loading}
                >
                  {loading ? "Resetting..." : "Reset password"}

                  {!loading && (
                    <span className="material-symbols-outlined">
                      lock_reset
                    </span>
                  )}
                </button>
              </form>
            )}

            {(mode === "login" || mode === "register") && (
              <div className="auth-switch">
                <span>
                  {mode === "register"
                    ? "Already have an account?"
                    : "Don't have an account?"}
                </span>

                <button type="button" onClick={switchMode}>
                  {mode === "register" ? "Sign in" : "Create account"}
                </button>
              </div>
            )}

            <a href="/" className="auth-back">
              <span className="material-symbols-outlined">arrow_back</span>
              Back to ReOrbit
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
