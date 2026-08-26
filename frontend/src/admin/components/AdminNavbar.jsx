import React, { useEffect, useState } from "react";
import "./AdminNavbar.css";

export default function AdminNavbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 18);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const closeMenu = () => {
    setOpen(false);
  };

  return (
    <div className="admin-scope">
      <nav
        className={`admin-navbar ${scrolled ? "admin-navbar-scrolled" : ""}`}
      >
        <div className="admin-navbar-container">
          {/* =====================================================
              BRAND
          ===================================================== */}

          <a
            href="/admin-home"
            className="admin-navbar-brand"
            onClick={closeMenu}
          >
            <div className="admin-logo-mark">
              <span className="admin-logo-orbit orbit-a" />
              <span className="admin-logo-orbit orbit-b" />
              <span className="admin-logo-core" />
            </div>

            <div className="admin-brand-text">
              <span className="admin-brand-name">ReOrbit</span>

              <span className="admin-brand-label">ADMIN</span>
            </div>
          </a>

          {/* =====================================================
              DESKTOP NAVIGATION
          ===================================================== */}

          <div className="admin-navbar-links">
            <a href="/admin-home" onClick={closeMenu}>
              <span>Home</span>
            </a>

            <a href="/admin-about" onClick={closeMenu}>
              <span>About</span>
            </a>

            <a href="/admin-how-it-works" onClick={closeMenu}>
              <span>How It Works</span>
            </a>
          </div>

          {/* =====================================================
              RIGHT ACTION
          ===================================================== */}

          <div className="admin-navbar-actions">
            <div className="admin-system-status">
              <span className="admin-status-dot" />

              <span>System</span>
            </div>

            <a
              href="/admin-login"
              className="admin-navbar-login"
              onClick={closeMenu}
            >
              <span>Admin Login</span>

              <span className="material-symbols-outlined">arrow_forward</span>
            </a>
          </div>

          {/* =====================================================
              MOBILE MENU BUTTON
          ===================================================== */}

          <button
            type="button"
            className="admin-navbar-menu"
            onClick={() => setOpen((prev) => !prev)}
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
          >
            <span className="material-symbols-outlined">
              {open ? "close" : "menu"}
            </span>
          </button>
        </div>

        {/* =====================================================
            MOBILE MENU
        ===================================================== */}

        <div
          className={`admin-mobile-menu ${
            open ? "admin-mobile-menu-open" : ""
          }`}
        >
          <div className="admin-mobile-menu-inner">
            <div className="admin-mobile-menu-heading">
              <div>
                <span>REORBIT</span>
                <strong>ADMINISTRATION</strong>
              </div>

              <div className="admin-mobile-status">
                <span className="admin-status-dot" />
                ONLINE
              </div>
            </div>

            <div className="admin-mobile-links">
              <a href="/admin-home" onClick={closeMenu}>
                <span className="material-symbols-outlined">dashboard</span>

                <span>
                  <strong>Home</strong>
                  <small>Admin overview</small>
                </span>

                <span className="material-symbols-outlined arrow">
                  arrow_forward
                </span>
              </a>

              <a href="/admin-about" onClick={closeMenu}>
                <span className="material-symbols-outlined">info</span>

                <span>
                  <strong>About</strong>
                  <small>About the administration</small>
                </span>

                <span className="material-symbols-outlined arrow">
                  arrow_forward
                </span>
              </a>

              <a href="/admin-how-it-works" onClick={closeMenu}>
                <span className="material-symbols-outlined">account_tree</span>

                <span>
                  <strong>How It Works</strong>
                  <small>Understand the system</small>
                </span>

                <span className="material-symbols-outlined arrow">
                  arrow_forward
                </span>
              </a>
            </div>

            <a
              href="/admin-login"
              className="admin-mobile-login"
              onClick={closeMenu}
            >
              <span className="material-symbols-outlined">
                admin_panel_settings
              </span>

              <span>Admin Login</span>

              <span className="material-symbols-outlined">arrow_forward</span>
            </a>
          </div>
        </div>
      </nav>
    </div>
  );
}
