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
           ADMIN LOGIN
           STRICTLY ISOLATED ADMIN THEME
        ===================================================== */

        .admin-login-page {
          min-height: 100vh;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 40px 20px;

          background: #08271f;

          color: #ffffff;

          font-family: "Plus Jakarta Sans", sans-serif;

          box-sizing: border-box;
        }

        .admin-login-page *,
        .admin-login-page *::before,
        .admin-login-page *::after {
          box-sizing: border-box;
        }

        /* =====================================================
           BACK BUTTON
        ===================================================== */

        .admin-login-back {
          position: fixed;

          top: 28px;
          left: 32px;

          display: inline-flex;
          align-items: center;
          gap: 7px;

          color: #bedad0;

          font-size: 13px;
          font-weight: 500;

          text-decoration: none;

          transition:
            color 0.2s ease,
            transform 0.2s ease;
        }

        .admin-login-back:hover {
          color: #ffffff;
          transform: translateX(-3px);
        }

        /* =====================================================
           LOGIN WRAPPER
        ===================================================== */

        .admin-login-wrapper {
          width: 100%;
          max-width: 440px;

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
          display: inline-flex;
          align-items: center;
          justify-content: center;

          width: 54px;
          height: 54px;

          margin-bottom: 15px;

          border: 1px solid rgba(193, 200, 196, 0.35);

          border-radius: 15px;

          background: rgba(173, 206, 193, 0.12);

          color: #adcec1;

          font-size: 23px;
        }

        .admin-login-brand h1 {
          margin: 0;

          font-family: "Bricolage Grotesque", sans-serif;

          color: #ffffff;

          font-size: 30px;

          font-weight: 500;

          letter-spacing: -0.035em;
        }

        .admin-login-brand p {
          margin: 8px 0 0;

          color: #c1c8c4;

          font-size: 12px;

          line-height: 1.6;
        }

        /* =====================================================
           LOGIN CARD
        ===================================================== */

        .admin-login-card {
          width: 100%;

          padding: 34px;

          background: #ffffff;

          border: 1px solid #c1c8c4;

          border-radius: 22px;

          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.18);
        }

        .admin-login-card-header {
          margin-bottom: 25px;
        }

        .admin-login-card-header span {
          display: block;

          margin-bottom: 7px;

          color: #538f80;

          font-size: 10px;

          font-weight: 700;

          letter-spacing: 1.2px;

          text-transform: uppercase;
        }

        .admin-login-card-header h2 {
          margin: 0;

          color: #08271f;

          font-family: "Bricolage Grotesque", sans-serif;

          font-size: 25px;

          font-weight: 500;

          letter-spacing: -0.03em;
        }

        .admin-login-card-header p {
          margin: 7px 0 0;

          color: #606361;

          font-size: 11px;

          line-height: 1.5;
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
          color: #08271f;

          font-size: 11px;

          font-weight: 600;
        }

        .admin-login-field input {
          width: 100%;

          height: 46px;

          padding: 0 14px;

          border: 1px solid #c1c8c4;

          border-radius: 10px;

          outline: none;

          background: #faf9f7;

          color: #08271f;

          font-family: "Plus Jakarta Sans", sans-serif;

          font-size: 12px;

          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease,
            background 0.2s ease;
        }

        .admin-login-field input::placeholder {
          color: #9ca3a0;
        }

        .admin-login-field input:focus {
          background: #ffffff;

          border-color: #538f80;

          box-shadow: 0 0 0 3px rgba(83, 143, 128, 0.12);
        }

        /* =====================================================
           PASSWORD
        ===================================================== */

        .admin-password-wrapper {
          position: relative;
        }

        .admin-password-wrapper input {
          padding-right: 70px;
        }

        .admin-password-toggle {
          position: absolute;

          right: 10px;
          top: 50%;

          transform: translateY(-50%);

          border: none;

          background: transparent;

          color: #606361;

          font-family: "Plus Jakarta Sans", sans-serif;

          font-size: 10px;

          font-weight: 600;

          cursor: pointer;
        }

        .admin-password-toggle:hover {
          color: #08271f;
        }

        /* =====================================================
           LOGIN BUTTON
        ===================================================== */

        .admin-login-button {
          width: 100%;

          height: 48px;

          margin-top: 5px;

          border: 1px solid #adcec1;

          border-radius: 999px;

          background: #adcec1;

          color: #08271f;

          font-family: "Plus Jakarta Sans", sans-serif;

          font-size: 12px;

          font-weight: 700;

          cursor: pointer;

          transition:
            transform 0.2s ease,
            background 0.2s ease;
        }

        .admin-login-button:hover {
          background: #bedad0;

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

          gap: 6px;

          margin-top: 18px;

          color: #606361;

          font-size: 9px;
        }

        .admin-login-security span {
          color: #538f80;

          font-size: 13px;
        }

        /* =====================================================
           FOOTER TEXT
        ===================================================== */

        .admin-login-footer {
          text-align: center;

          margin-top: 22px;

          color: rgba(193, 200, 196, 0.7);

          font-size: 9px;
        }

        /* =====================================================
           TABLET
        ===================================================== */

        @media (max-width: 600px) {

          .admin-login-page {
            padding: 70px 18px 30px;
          }

          .admin-login-back {
            top: 22px;
            left: 20px;
          }

          .admin-login-card {
            padding: 27px 22px;
            border-radius: 18px;
          }

          .admin-login-brand h1 {
            font-size: 27px;
          }

        }

        /* =====================================================
           SMALL MOBILE
        ===================================================== */

        @media (max-width: 400px) {

          .admin-login-card {
            padding: 24px 18px;
          }

          .admin-login-brand h1 {
            font-size: 25px;
          }

          .admin-login-card-header h2 {
            font-size: 22px;
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
