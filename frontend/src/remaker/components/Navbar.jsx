import React, { useEffect, useState } from "react";
import "./Navbar.css";

export default function Navbar() {
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

  const closeMenu = () => {
    setOpen(false);
  };

  return (
    <nav
      className={`remaker-navbar ${scrolled ? "remaker-navbar-scrolled" : ""}`}
    >
      <div className="remaker-navbar-inner remaker-container">
        {/* =========================
            LOGO
        ========================= */}

        <a
          className="remaker-navbar-brand"
          href="/remakers-home"
          onClick={closeMenu}
        >
          <span className="material-symbols-outlined">eco</span>

          <span>ReOrbit</span>
        </a>

        {/* =========================
            NAVIGATION
        ========================= */}

        <div
          className={`remaker-navbar-links ${
            open ? "remaker-navbar-links-open" : ""
          }`}
        >
          <a href="/remakers-home" onClick={closeMenu}>
            Home
          </a>

          <a href="/remakers-before-marketplace" onClick={closeMenu}>
            Marketplace
          </a>

          <a href="/remakers-about" onClick={closeMenu}>
            About
          </a>

          <a href="/remakers-how-it-works" onClick={closeMenu}>
            How it works
          </a>

          <a href="/remakers-faq" onClick={closeMenu}>
            FAQ
          </a>
        </div>

        {/* =========================
            ACTIONS
        ========================= */}

        <div className="remaker-navbar-actions">
          <a className="remaker-back-user" href="/">
            <span className="material-symbols-outlined">person</span>
            <span>Back to user</span>
          </a>

          <a className="remaker-get-started" href="/remakers-auth">
            Get started
          </a>
        </div>

        {/* =========================
            MOBILE
        ========================= */}

        <button
          className="remaker-navbar-menu"
          onClick={() => setOpen(!open)}
          aria-label="Toggle navigation"
          aria-expanded={open}
        >
          <span className="material-symbols-outlined">
            {open ? "close" : "menu"}
          </span>
        </button>
      </div>
    </nav>
  );
}
