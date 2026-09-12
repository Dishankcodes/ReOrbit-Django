import React, { useState } from "react";
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

  /* USER REGISTER / LOGIN*/
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  /*FORGOT PASSWORD */
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  /*
   * CLEAR MESSAGES
   */
  const clearMessages = () => {
    setMessage("");
    setError("");
  };

  /* SAVE AUTH DATA */
  const saveAuthData = (data) => {
    const storage = rememberMe ? localStorage : sessionStorage;

    storage.setItem("reorbit_access_token", data.access);
    storage.setItem("reorbit_refresh_token", data.refresh);
    storage.setItem("reorbit_account_type", "user");
    storage.setItem("reorbit_account_id", String(data.user.user_id));

    storage.setItem("reorbit_user", JSON.stringify(data.user));

    /*
     * Remove tokens from the other storage.
     */
    const otherStorage = rememberMe ? sessionStorage : localStorage;

    otherStorage.removeItem("reorbit_access_token");
    otherStorage.removeItem("reorbit_refresh_token");
    otherStorage.removeItem("reorbit_account_type");
    otherStorage.removeItem("reorbit_account_id");
    otherStorage.removeItem("reorbit_user");
  };

  /*
   * LOGIN
   */
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
        email: email.trim(),
        password,
      });

      saveAuthData(response.data);

      setMessage(response.message || "Login successful.");

      /*
       * Temporary redirect.
       *
       * We will replace this with the actual
       * User Dashboard route when Phase 2 UI
       * is implemented.
       */
      setTimeout(() => {
        navigate("/user-dashboard");
      }, 500);
    } catch (err) {
      setError(err?.data?.message || err?.message || "Unable to login.");
    } finally {
      setLoading(false);
    }
  };

  /*
   * REGISTER
   */
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
        email: email.trim(),
        password,
      });

      /*
       * Registration API returns JWT tokens,
       * so the user is authenticated immediately.
       */
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

  /*
   * FORGOT PASSWORD - SEND OTP
   */
  const handleForgotEmail = async (e) => {
    e.preventDefault();

    clearMessages();

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      const response = await requestForgotPasswordOTP(email.trim());

      setMessage(response.message || "OTP sent successfully.");

      setMode("forgot-otp");
    } catch (err) {
      setError(err?.data?.message || err?.message || "Unable to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  /*
   * VERIFY OTP
   */
  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    clearMessages();

    if (!otp.trim()) {
      setError("Please enter the OTP.");
      return;
    }

    setLoading(true);

    try {
      const response = await verifyForgotPasswordOTP(email.trim(), otp.trim());

      setResetToken(response?.data?.reset_token || "");

      setMessage(response.message || "OTP verified successfully.");

      setMode("forgot-password");
    } catch (err) {
      setError(err?.data?.message || err?.message || "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  /*
   * RESET PASSWORD
   */
  const handleResetPassword = async (e) => {
    e.preventDefault();

    clearMessages();

    if (!newPassword) {
      setError("Please enter your new password.");
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

      setMessage(response.message || "Password reset successfully.");

      /*
       * Clear forgot password state.
       */
      setOtp("");
      setResetToken("");
      setNewPassword("");
      setConfirmPassword("");

      /*
       * Return to login.
       */
      setTimeout(() => {
        setMode("login");
      }, 700);
    } catch (err) {
      setError(
        err?.data?.message || err?.message || "Unable to reset password.",
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * SWITCH LOGIN / REGISTER
   */
  const switchMode = () => {
    clearMessages();

    setMode(mode === "register" ? "login" : "register");

    setShowPassword(false);
    setLoading(false);
  };

  /*
   * START FORGOT PASSWORD
   */
  const openForgotPassword = () => {
    clearMessages();

    setOtp("");
    setResetToken("");
    setNewPassword("");
    setConfirmPassword("");

    setMode("forgot-email");
  };

  /*
   * BACK TO LOGIN
   */
  const backToLogin = () => {
    clearMessages();

    setMode("login");

    setOtp("");
    setResetToken("");
    setNewPassword("");
    setConfirmPassword("");
  };

  /*
   * HEADING
   */
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
          {/* ORBITS */}

          <div className="orbit orbit-one">
            <span className="orbit-dot" />
          </div>

          <div className="orbit orbit-two">
            <span className="orbit-dot" />
          </div>

          <div className="orbit orbit-three">
            <span className="orbit-dot" />
          </div>

          {/* CORE */}

          <div className="orbit-core">
            <span>ReOrbit</span>
          </div>

          {/* CARD */}

          <div
            className={`auth-card ${
              mode === "register"
                ? "register-mode"
                : mode.startsWith("forgot")
                  ? "forgot-mode"
                  : "login-mode"
            }`}
          >
            {/* LOGO */}

            <div className="auth-logo">
              <span className="logo-dot" />
              <span>ReOrbit</span>
            </div>

            {/* HEADING */}

            <div className="auth-heading">
              <span className="auth-eyebrow">{heading.eyebrow}</span>

              <h1>{heading.title}</h1>

              <p>{heading.description}</p>
            </div>

            {/* SUCCESS */}

            {message && (
              <div className="auth-message auth-success">{message}</div>
            )}

            {/* ERROR */}

            {error && <div className="auth-message auth-error">{error}</div>}

            {/*
                LOGIN
            */}

            {mode === "login" && (
              <form onSubmit={handleLogin}>
                <div className="auth-field">
                  <label htmlFor="email">Email address</label>

                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                      onChange={(e) => setPassword(e.target.value)}
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

            {/*
                REGISTER
            */}

            {mode === "register" && (
              <form onSubmit={handleRegister}>
                <div className="auth-field">
                  <label htmlFor="name">Full name</label>

                  <input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
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
                    onChange={(e) => setEmail(e.target.value)}
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
                      onChange={(e) => setPassword(e.target.value)}
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

            {/*
                FORGOT EMAIL
            */}

            {mode === "forgot-email" && (
              <form onSubmit={handleForgotEmail}>
                <div className="forgot-step">
                  <span>01</span>

                  <div>
                    <strong>Enter your email</strong>

                    <p>
                      We'll send a verification OTP to your registered email.
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
                    onChange={(e) => setEmail(e.target.value)}
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
                </button>

                <button
                  type="button"
                  className="auth-secondary-button"
                  onClick={backToLogin}
                >
                  Back to sign in
                </button>
              </form>
            )}

            {/*
                FORGOT OTP
            */}

            {mode === "forgot-otp" && (
              <form onSubmit={handleVerifyOTP}>
                <div className="forgot-step">
                  <span>02</span>

                  <div>
                    <strong>Verify OTP</strong>

                    <p>
                      Enter the OTP sent to <b>{email}</b>.
                    </p>
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="otp">OTP</label>

                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="auth-submit"
                  disabled={loading}
                >
                  {loading ? "Verifying..." : "Verify OTP"}
                </button>

                <button
                  type="button"
                  className="auth-secondary-button"
                  onClick={() => setMode("forgot-email")}
                >
                  Change email
                </button>
              </form>
            )}

            {/*
                NEW PASSWORD
            */}

            {mode === "forgot-password" && (
              <form onSubmit={handleResetPassword}>
                <div className="forgot-step">
                  <span>03</span>

                  <div>
                    <strong>Create new password</strong>

                    <p>
                      Your OTP has been verified. Create a new password below.
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
                      onChange={(e) => setNewPassword(e.target.value)}
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
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                </button>
              </form>
            )}

            {/*
                LOGIN / REGISTER SWITCH
            */}

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

            {/* BACK */}

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
