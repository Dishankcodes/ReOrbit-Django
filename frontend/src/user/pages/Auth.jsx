import React, { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../css/Auth.css";

export default function Auth() {
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
    }, 1200);
  };

  const switchMode = () => {
    setIsRegister((prev) => !prev);
    setShowPassword(false);
    setLoading(false);
  };

  return (
    <div className="user-auth-page">
      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <Navbar />

      {/* =====================================================
          AUTH MAIN
      ===================================================== */}

      <main className="auth-page">
        {/* Background atmosphere */}
        <div className="auth-space" />
        <div className="auth-grid" />

        {/* Floating stars */}
        <span className="auth-star star-1" />
        <span className="auth-star star-2" />
        <span className="auth-star star-3" />
        <span className="auth-star star-4" />

        {/* =================================================
            AUTH STAGE
        ================================================= */}

        <section className="auth-stage">
          {/* =================================================
              ORBITAL RINGS
          ================================================= */}

          <div className="orbit orbit-one">
            <span className="orbit-dot" />
          </div>

          <div className="orbit orbit-two">
            <span className="orbit-dot" />
          </div>

          <div className="orbit orbit-three">
            <span className="orbit-dot" />
          </div>

          {/* =================================================
              CENTER ORBIT
          ================================================= */}

          <div className="orbit-core">
            <span>ReOrbit</span>
          </div>

          {/* =================================================
              AUTH CARD
          ================================================= */}

          <div
            className={`auth-card ${
              isRegister ? "register-mode" : "login-mode"
            }`}
          >
            {/* =================================================
                LOGO
            ================================================= */}

            <div className="auth-logo">
              <span className="logo-dot" />
              <span>ReOrbit</span>
            </div>

            {/* =================================================
                HEADING
            ================================================= */}

            <div className="auth-heading">
              <span className="auth-eyebrow">
                {isRegister ? "CREATE YOUR ORBIT" : "WELCOME BACK"}
              </span>

              <h1>{isRegister ? "Create account" : "Sign in"}</h1>

              <p>
                {isRegister
                  ? "Create your account and start giving things another orbit."
                  : "Continue your journey and return to your ReOrbit space."}
              </p>
            </div>

            {/* =================================================
                FORM
            ================================================= */}

            <form onSubmit={handleSubmit}>
              {/* NAME */}
              <div
                className={`auth-field register-field ${
                  isRegister ? "field-visible" : ""
                }`}
              >
                <label htmlFor="name">Full name</label>

                <input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  required={isRegister}
                />
              </div>

              {/* EMAIL */}
              <div className="auth-field">
                <label htmlFor="email">Email address</label>

                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                />
              </div>

              {/* PASSWORD */}
              <div className="auth-field">
                <label htmlFor="password">Password</label>

                <div className="password-wrapper">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
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

              {/* =================================================
                  LOGIN OPTIONS
              ================================================= */}

              {!isRegister && (
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

                  <button type="button" className="forgot-password">
                    Forgot password?
                  </button>
                </div>
              )}

              {/* =================================================
                  REGISTER TERMS
              ================================================= */}

              {isRegister && (
                <label className="auth-terms">
                  <input type="checkbox" required />

                  <span>
                    I agree to the <a href="/terms">Terms</a> and{" "}
                    <a href="/privacy">Privacy Policy</a>.
                  </span>
                </label>
              )}

              {/* =================================================
                  MAIN BUTTON
              ================================================= */}

              <button
                type="submit"
                className={`auth-submit ${loading ? "is-loading" : ""}`}
                disabled={loading}
              >
                {loading
                  ? "Please wait..."
                  : isRegister
                    ? "Create account"
                    : "Sign in"}
              </button>

              {/* =================================================
                  DIVIDER
              ================================================= */}

              <div className="auth-divider">
                <span />

                <p>OR</p>

                <span />
              </div>

              {/* =================================================
                  GOOGLE
              ================================================= */}

              <button type="button" className="google-button">
                <span className="google-icon">G</span>

                <span>Continue with Google</span>
              </button>
            </form>

            {/* =================================================
                LOGIN / REGISTER SWITCH
            ================================================= */}

            <div className="auth-switch">
              <span>
                {isRegister
                  ? "Already have an account?"
                  : "Don't have an account?"}
              </span>

              <button type="button" onClick={switchMode}>
                {isRegister ? "Sign in" : "Create account"}
              </button>
            </div>

            {/* =================================================
                BACK
            ================================================= */}

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
