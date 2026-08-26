import React, { useState } from "react";

export default function AdminLogin() {
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Add your actual authentication logic here
    console.log("Admin login submitted");
  };

  return (
    <div className="admin-login-page">
      <style>{`
        /* =====================================================
           REORBIT ADMIN LOGIN
           MASTER ADMIN THEME — ADMIN ABOUT SYSTEM
        ===================================================== */

        .admin-login-page {
          --login-bg: #061b16;
          --login-bg-deep: #04130f;
          --login-surface: #0a241d;
          --login-surface-2: #0d2d24;
          --login-surface-3: #12382e;

          --login-accent: #afcfc2;
          --login-accent-light: #c3ded3;
          --login-accent-dark: #7fa99a;

          --login-text: #f2f5f2;
          --login-soft: #c5cfca;
          --login-muted: #899992;

          --login-border: rgba(175, 207, 194, 0.15);
          --login-border-strong: rgba(175, 207, 194, 0.28);

          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 80px 20px 45px;
          overflow: hidden;
          isolation: isolate;
          background:
            radial-gradient(
              circle at 82% 18%,
              rgba(127, 169, 154, 0.13),
              transparent 30%
            ),
            linear-gradient(115deg, #061b16 0%, #071f19 52%, #09271f 100%);
          color: var(--login-text);
          font-family: "Plus Jakarta Sans", sans-serif;
          box-sizing: border-box;
        }

        .admin-login-page *,
        .admin-login-page *::before,
        .admin-login-page *::after {
          box-sizing: border-box;
        }

        .admin-login-page::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -2;
          opacity: 0.045;
          pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px);
          background-size: 55px 55px;
        }

        .admin-login-page::after {
          content: "";
          position: absolute;
          width: 620px;
          height: 620px;
          right: -260px;
          bottom: -330px;
          z-index: -1;
          border-radius: 50%;
          pointer-events: none;
          background: radial-gradient(
            circle,
            rgba(175,207,194,0.09),
            transparent 68%
          );
        }

        /* =====================================================
           BACK BUTTON
        ===================================================== */

        .admin-login-back {
          position: fixed;
          top: 28px;
          left: 32px;
          z-index: 20;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 14px;
          border: 1px solid var(--login-border-strong);
          border-radius: 999px;
          background: rgba(175,207,194,0.05);
          color: var(--login-soft);
          font-size: 0.66rem;
          font-weight: 750;
          letter-spacing: 0.02em;
          text-decoration: none;
          backdrop-filter: blur(10px);
          transition:
            color 0.2s ease,
            border-color 0.2s ease,
            background 0.2s ease,
            transform 0.2s ease;
        }

        .admin-login-back:hover {
          color: var(--login-accent);
          border-color: var(--login-border-strong);
          background: rgba(175,207,194,0.08);
          transform: translateX(-3px);
        }

        /* =====================================================
           LOGIN WRAPPER
        ===================================================== */

        .admin-login-wrapper {
          position: relative;
          z-index: 3;
          width: 100%;
          max-width: 470px;
          margin: 0 auto;
        }

        /* =====================================================
           BRAND
        ===================================================== */

        .admin-login-brand {
          text-align: center;
          margin-bottom: 28px;
        }

        .admin-login-logo {
          position: relative;
          width: 58px;
          height: 58px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 15px;
          border: 1px solid var(--login-border-strong);
          border-radius: 17px;
          background: rgba(175,207,194,0.08);
          color: var(--login-accent);
          font-size: 25px;
          box-shadow: 0 18px 45px rgba(0,0,0,0.2);
        }

        .admin-login-logo::after {
          content: "";
          position: absolute;
          inset: -7px;
          border: 1px solid rgba(175,207,194,0.08);
          border-radius: 22px;
        }

        .admin-login-brand h1 {
          margin: 0;
          color: var(--login-text);
          font-family: "Bricolage Grotesque", sans-serif;
          font-size: 2rem;
          font-weight: 500;
          line-height: 0.98;
          letter-spacing: -0.045em;
        }

        .admin-login-brand p {
          margin: 9px 0 0;
          color: var(--login-muted);
          font-size: 0.63rem;
          line-height: 1.6;
          letter-spacing: 0.03em;
        }

        /* =====================================================
           LOGIN CARD
        ===================================================== */

        .admin-login-card {
          position: relative;
          width: 100%;
          padding: 34px;
          overflow: hidden;
          border: 1px solid var(--login-border-strong);
          border-radius: 24px;
          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,0.045),
              rgba(255,255,255,0.012)
            ),
            var(--login-surface);
          box-shadow: 0 35px 80px rgba(0,0,0,0.28);
        }

        .admin-login-card::before {
          content: "";
          position: absolute;
          inset: 0;
          opacity: 0.3;
          pointer-events: none;
          background-image:
            linear-gradient(rgba(175,207,194,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(175,207,194,0.035) 1px, transparent 1px);
          background-size: 35px 35px;
        }

        .admin-login-card > * {
          position: relative;
          z-index: 2;
        }

        .admin-login-card-header {
          margin-bottom: 26px;
        }

        .admin-login-card-header span {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 11px;
          color: var(--login-accent);
          font-size: 0.59rem;
          font-weight: 850;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .admin-login-card-header span::before {
          content: "";
          width: 22px;
          height: 1px;
          background: currentColor;
        }

        .admin-login-card-header h2 {
          margin: 0;
          color: var(--login-text);
          font-family: "Bricolage Grotesque", sans-serif;
          font-size: 2rem;
          font-weight: 500;
          line-height: 0.98;
          letter-spacing: -0.045em;
        }

        .admin-login-card-header p {
          margin: 9px 0 0;
          color: var(--login-muted);
          font-size: 0.68rem;
          line-height: 1.65;
        }

        /* =====================================================
           FORM
        ===================================================== */

        .admin-login-form {
          display: flex;
          flex-direction: column;
          gap: 17px;
        }

        .admin-login-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .admin-login-field label {
          color: var(--login-soft);
          font-size: 0.61rem;
          font-weight: 750;
          letter-spacing: 0.02em;
        }

        .admin-login-field input {
          width: 100%;
          height: 48px;
          padding: 0 14px;
          outline: none;
          border: 1px solid var(--login-border);
          border-radius: 12px;
          background: rgba(255,255,255,0.025);
          color: var(--login-text);
          font-family: "Plus Jakarta Sans", sans-serif;
          font-size: 0.69rem;
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease,
            background 0.2s ease;
        }

        .admin-login-field input::placeholder {
          color: #65766f;
        }

        .admin-login-field input:hover {
          border-color: var(--login-border-strong);
        }

        .admin-login-field input:focus {
          background: rgba(175,207,194,0.035);
          border-color: var(--login-accent-dark);
          box-shadow: 0 0 0 3px rgba(175,207,194,0.08);
        }

        /* =====================================================
           PASSWORD
        ===================================================== */

        .admin-password-wrapper {
          position: relative;
        }

        .admin-password-wrapper input {
          padding-right: 68px;
        }

        .admin-password-toggle {
          position: absolute;
          right: 9px;
          top: 50%;
          transform: translateY(-50%);
          min-height: 30px;
          padding: 0 9px;
          border: 1px solid var(--login-border);
          border-radius: 999px;
          background: rgba(175,207,194,0.045);
          color: var(--login-muted);
          font-family: "Plus Jakarta Sans", sans-serif;
          font-size: 0.55rem;
          font-weight: 750;
          cursor: pointer;
          transition:
            color 0.2s ease,
            border-color 0.2s ease,
            background 0.2s ease;
        }

        .admin-password-toggle:hover {
          color: var(--login-accent);
          border-color: var(--login-border-strong);
          background: rgba(175,207,194,0.08);
        }

        /* =====================================================
           LOGIN BUTTON
        ===================================================== */

        .admin-login-button {
          width: 100%;
          height: 48px;
          margin-top: 5px;
          border: 1px solid var(--login-accent);
          border-radius: 999px;
          background: var(--login-accent);
          color: var(--login-bg-deep);
          font-family: "Plus Jakarta Sans", sans-serif;
          font-size: 0.68rem;
          font-weight: 800;
          cursor: pointer;
          transition:
            transform 0.2s ease,
            background 0.2s ease,
            border-color 0.2s ease;
        }

        .admin-login-button:hover {
          background: var(--login-accent-light);
          border-color: var(--login-accent-light);
          transform: translateY(-2px);
        }

        .admin-login-button:active {
          transform: translateY(0);
        }

        /* =====================================================
           SECURITY NOTE
        ===================================================== */

        .admin-login-security {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          margin-top: 18px;
          color: var(--login-muted);
          font-size: 0.53rem;
        }

        .admin-login-security span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 17px;
          height: 17px;
          border: 1px solid var(--login-border);
          border-radius: 50%;
          background: rgba(175,207,194,0.05);
          color: var(--login-accent);
          font-size: 0.55rem;
        }

        /* =====================================================
           FOOTER
        ===================================================== */

        .admin-login-footer {
          text-align: center;
          margin-top: 22px;
          color: rgba(137,153,146,0.7);
          font-size: 0.5rem;
          font-weight: 650;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        /* =====================================================
           FOCUS
        ===================================================== */

        .admin-login-page a:focus-visible,
        .admin-login-page button:focus-visible,
        .admin-login-page input:focus-visible {
          outline: 2px solid var(--login-accent);
          outline-offset: 3px;
        }

        /* =====================================================
           TABLET
        ===================================================== */

        @media (max-width: 600px) {
          .admin-login-page {
            padding: 80px 16px 30px;
          }

          .admin-login-back {
            top: 20px;
            left: 18px;
          }

          .admin-login-card {
            padding: 28px 22px;
            border-radius: 20px;
          }

          .admin-login-brand h1 {
            font-size: 1.8rem;
          }
        }

        /* =====================================================
           SMALL MOBILE
        ===================================================== */

        @media (max-width: 400px) {
          .admin-login-page {
            padding-left: 12px;
            padding-right: 12px;
          }

          .admin-login-card {
            padding: 25px 18px;
          }

          .admin-login-brand h1 {
            font-size: 1.65rem;
          }

          .admin-login-card-header h2 {
            font-size: 1.75rem;
          }
        }

        /* =====================================================
           REDUCED MOTION
        ===================================================== */

        @media (prefers-reduced-motion: reduce) {
          .admin-login-page *,
          .admin-login-page *::before,
          .admin-login-page *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      {/* BACK BUTTON */}

      <a href="/admin-home" className="admin-login-back">
        ← Back to Admin
      </a>

      {/* LOGIN CONTENT */}

      <div className="admin-login-wrapper">
        {/* BRAND */}

        <div className="admin-login-brand">
          <div className="admin-login-logo">♻</div>

          <h1>ReOrbit</h1>

          <p>Administration & Management Portal</p>
        </div>

        {/* LOGIN CARD */}

        <div className="admin-login-card">
          <div className="admin-login-card-header">
            <span>ADMIN ACCESS</span>

            <h2>Welcome back.</h2>

            <p>Sign in to manage the ReOrbit ecosystem.</p>
          </div>

          <form className="admin-login-form" onSubmit={handleSubmit}>
            {/* USERNAME */}

            <div className="admin-login-field">
              <label htmlFor="admin-username">Username</label>

              <input
                id="admin-username"
                type="text"
                placeholder="Enter your username"
                required
              />
            </div>

            {/* EMAIL */}

            <div className="admin-login-field">
              <label htmlFor="admin-email">Email address</label>

              <input
                id="admin-email"
                type="email"
                placeholder="admin@reorbit.com"
                required
              />
            </div>

            {/* PASSWORD */}

            <div className="admin-login-field">
              <label htmlFor="admin-password">Password</label>

              <div className="admin-password-wrapper">
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  required
                />

                <button
                  type="button"
                  className="admin-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* LOGIN */}

            <button type="submit" className="admin-login-button">
              Login to Admin Panel
            </button>
          </form>

          <div className="admin-login-security">
            <span>✓</span>
            Secure administrator access
          </div>
        </div>

        <div className="admin-login-footer">ReOrbit Management System</div>
      </div>
    </div>
  );
}
