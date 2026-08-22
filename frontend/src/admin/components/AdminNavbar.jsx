import React, { useEffect, useState } from "react";
import "./AdminNavbar.css";

export default function AdminNavbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const closeMenu = () => setOpen(false);

  return (
    <div className="admin-scope">
      <nav className={`navbar ${scrolled ? "navbar-scrolled" : ""}`}>
        <div className="navbar-inner container">
          {/* Logo */}
          <a className="navbar-brand" href="/admin" onClick={closeMenu}>
            <span className="logo-box">
              <span className="logo-text">ReOrbit</span>
            </span>
          </a>

          {/* Links */}
          <div className="admin-navbar-links">
            <a href="/admin-home"  onClick={closeMenu}>
              Home
            </a>
            <a href="/admin-about" onClick={closeMenu}>
              About
            </a>
            <a href="/admin-how-it-works" onClick={closeMenu}>
              How It Works
            </a>

          </div>

          {/* Action */}
          <div className="navbar-actions">
            <a className="admin-login-btn" href="/admin-login">
              Admin Login
            </a>
          </div>

          {/* Mobile Toggle */}
          <button
            className="navbar-menu"
            onClick={() => setOpen(!open)}
            aria-label="Toggle navigation"
            aria-expanded={open}
          >
            <span className="menu-icon">{open ? "✕" : "☰"}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}