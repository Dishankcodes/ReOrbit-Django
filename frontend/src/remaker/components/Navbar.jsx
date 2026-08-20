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

  const closeMenu = () => setOpen(false);

  return (
    <nav className={`navbar ${scrolled ? "navbar-scrolled" : ""}`}>
      <div className="navbar-inner container">
        {/* Logo */}
        <a className="navbar-brand" href="/" onClick={closeMenu}>
          <span className="material-symbols-outlined">eco</span>

          <span>ReOrbit</span>
        </a>

        {/* ReMaker Navigation */}
        <div className={`navbar-links ${open ? "navbar-links-open" : ""}`}>
          <a href="/remakers" onClick={closeMenu}>
            ReMakers
          </a>

          <a href="/remakers/studio" onClick={closeMenu}>
            Studio
          </a>

          <a href="/marketplace" onClick={closeMenu}>
            Materials
          </a>

          <a href="/about" onClick={closeMenu}>
            About
          </a>

          <a href="/faq" onClick={closeMenu}>
            FAQ
          </a>
        </div>

        {/* Actions */}
        <div className="navbar-actions">
          <a className="btn-secondary" href="/login">
            Sign in
          </a>

          <a className="btn-primary" href="/remakers/join">
            Become a ReMaker
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
    </nav>
  );
}
