import React, { useEffect, useState } from "react";
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

  const closeMenu = () => setOpen(false);
  const signedIn = isSignedIn("user");

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
    <nav className={`navbar ${scrolled ? "navbar-scrolled" : ""}`}>
      <div className="navbar-inner container">
        {/* Logo */}
        <a className="navbar-brand" href="/" onClick={closeMenu}>
          <span className="material-symbols-outlined">eco</span>

          <span>ReOrbit</span>
        </a>

        {/* Navigation */}
        <div className={`navbar-links ${open ? "navbar-links-open" : ""}`}>
          <a href="/discover-marketplace" onClick={closeMenu}>
            Marketplace
          </a>

          <a href="/discover-remakers" onClick={closeMenu}>
            ReMakers
          </a>

          <a href="/how-it-works" onClick={closeMenu}>
            How it works?
          </a>
          <a href="/about" onClick={closeMenu}>
            About
          </a>

          <a href="/faq" onClick={closeMenu}>
            FAQ
          </a>

          {/* on a phone the buttons live in this menu (the bar itself has no room) */}
          <div className="navbar-mobile-actions">
            <a className="btn-secondary" href="/remakers-home" onClick={closeMenu}>
              Become a ReMaker
            </a>

            <a
              className="btn-primary"
              href={signedIn ? "/user-dashboard" : "/auth"}
              onClick={closeMenu}
            >
              {signedIn ? "Open dashboard" : "Get started"}
            </a>
          </div>
        </div>

        {/* Actions */}
        <div className="navbar-actions">
          <a className="btn-secondary" href="/remakers-home">
            Become a ReMaker
          </a>

          <a className="btn-primary" href={signedIn ? "/user-dashboard" : "/auth"}>
            {signedIn ? "Open dashboard" : "Get started"}
          </a>
        </div>

        {/* Mobile */}
        <button
          className="navbar-menu"
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
          className="navbar-scrim"
          aria-label="Close menu"
          onClick={closeMenu}
        />
      )}
    </nav>
  );
}
