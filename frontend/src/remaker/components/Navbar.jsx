import React, { useEffect, useState } from "react";
import BrandMark from "../../shared/components/BrandMark";
import { isSignedIn } from "../../api/session";
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
  const signedIn = isSignedIn("remaker");

  /* the open menu closes on Escape, and when the window grows back to desktop width */
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === "Escape" && setOpen(false);
    const onResize = () => window.innerWidth > 850 && setOpen(false);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

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
          <BrandMark size={34} />

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

          {/* on a phone the buttons live in this menu (the bar itself has no room) */}
          <div className="remaker-navbar-mobile-actions">
            <a className="remaker-back-user" href="/" onClick={closeMenu}>
              <span className="material-symbols-outlined">person</span>
              <span>Back to user</span>
            </a>

            <a
              className="remaker-get-started"
              href={signedIn ? "/remaker-dashboard" : "/remakers-auth"}
              onClick={closeMenu}
            >
              {signedIn ? "Open dashboard" : "Get started"}
            </a>
          </div>
        </div>

        {/* =========================
            ACTIONS
        ========================= */}

        <div className="remaker-navbar-actions">
          <a className="remaker-back-user" href="/">
            <span className="material-symbols-outlined">person</span>
            <span>Back to user</span>
          </a>

          <a
            className="remaker-get-started"
            href={signedIn ? "/remaker-dashboard" : "/remakers-auth"}
          >
            {signedIn ? "Open dashboard" : "Get started"}
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
      {open && (
        <button
          type="button"
          className="remaker-navbar-scrim"
          aria-label="Close menu"
          onClick={closeMenu}
        />
      )}
    </nav>
  );
}
