import React, { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../css/ReMakerAuth.css";

export default function ReMakerAuth() {
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
    <div className="remaker-page rm-page remaker-auth-page">
      <Navbar />

      <main className="rma-page">
        {/* Background */}
        <div className="rma-space" />
        <div className="rma-grid" />

        {/* Stars */}
        <span className="rma-star rma-star-1" />
        <span className="rma-star rma-star-2" />
        <span className="rma-star rma-star-3" />
        <span className="rma-star rma-star-4" />

        <section className="rma-stage">
          {/* Orbital rings */}
          <div className="rma-orbit rma-orbit-one">
            <span className="rma-orbit-dot" />
          </div>

          <div className="rma-orbit rma-orbit-two">
            <span className="rma-orbit-dot" />
          </div>

          <div className="rma-orbit rma-orbit-three">
            <span className="rma-orbit-dot" />
          </div>

          {/* Core */}
          <div className="rma-orbit-core">
            <span>ReMaker</span>
          </div>

          {/* Authentication Card */}
          <div
            className={`rma-card ${
              isRegister ? "rma-register-mode" : "rma-login-mode"
            }`}
          >
            {/* Logo */}
            <div className="rma-logo">
              <span className="rma-logo-dot" />
              <span>ReOrbit</span>
            </div>

            {/* Heading */}
            <div className="rma-heading">
              <span className="rma-eyebrow">
                {isRegister
                  ? "JOIN THE MAKING COMMUNITY"
                  : "WELCOME BACK, REMAKER"}
              </span>

              <h1>{isRegister ? "Become a ReMaker" : "ReMaker sign in"}</h1>

              <p>
                {isRegister
                  ? "Create your ReMaker space and start turning rescued materials into meaningful work."
                  : "Return to your studio, discover materials and keep your creations moving."}
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Full name */}
              <div
                className={`rma-field rma-register-field ${
                  isRegister ? "rma-field-visible" : ""
                }`}
              >
                <label htmlFor="remaker-name">Full name</label>

                <input
                  id="remaker-name"
                  type="text"
                  placeholder="Your name"
                  required={isRegister}
                />
              </div>

              {/* Studio name */}
              <div
                className={`rma-field rma-register-field ${
                  isRegister ? "rma-field-visible" : ""
                }`}
              >
                <label htmlFor="studio-name">Studio / maker name</label>

                <input
                  id="studio-name"
                  type="text"
                  placeholder="Your studio name"
                  required={isRegister}
                />
              </div>

              {/* Email */}
              <div className="rma-field">
                <label htmlFor="remaker-email">Email address</label>

                <input
                  id="remaker-email"
                  type="email"
                  placeholder="you@example.com"
                  required
                />
              </div>

              {/* Password */}
              <div className="rma-field">
                <label htmlFor="remaker-password">Password</label>

                <div className="rma-password-wrapper">
                  <input
                    id="remaker-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                  />

                  <button
                    type="button"
                    className="rma-password-toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Login options */}
              {!isRegister && (
                <div className="rma-options">
                  <label className="rma-remember">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />

                    <span className="rma-checkbox" />

                    <span>Remember me</span>
                  </label>

                  <button type="button" className="rma-forgot">
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Register terms */}
              {isRegister && (
                <label className="rma-terms">
                  <input type="checkbox" required />

                  <span>
                    I agree to the <a href="/terms">Terms</a> and{" "}
                    <a href="/privacy">Privacy Policy</a>.
                  </span>
                </label>
              )}

              {/* Submit */}
              <button
                type="submit"
                className={`rma-submit ${loading ? "rma-loading" : ""}`}
                disabled={loading}
              >
                {loading
                  ? "Please wait..."
                  : isRegister
                    ? "Create ReMaker account"
                    : "Sign in"}
              </button>

              {/* Divider */}
              <div className="rma-divider">
                <span />
                <p>OR</p>
                <span />
              </div>

              {/* Google */}
              <button type="button" className="rma-google">
                <span className="rma-google-icon">G</span>

                <span>Continue with Google</span>
              </button>
            </form>

            {/* Switch */}
            <div className="rma-switch">
              <span>
                {isRegister
                  ? "Already a ReMaker?"
                  : "Want to become a ReMaker?"}
              </span>

              <button type="button" onClick={switchMode}>
                {isRegister ? "Sign in" : "Create account"}
              </button>
            </div>

            {/* Back */}
            <a href="/remakers" className="rma-back">
              <span className="material-symbols-outlined">arrow_back</span>
              Back to ReMakers
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
