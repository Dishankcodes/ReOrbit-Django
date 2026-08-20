import React, { useEffect, useState } from "react";
import "./Navbar.css";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMenu = () => setOpen(false);

  return (
    <>
      <nav className={`navbar ${scrolled ? "navbar-scrolled" : ""}`}>
        <div className="navbar-inner container">
          <a className="navbar-brand" href="/" onClick={closeMenu}>
            <span className="material-symbols-outlined">eco</span>
            <span>ReOrbit</span>
          </a>

          <div className={`navbar-links ${open ? "navbar-links-open" : ""}`}>
            <a href="/marketplace" onClick={closeMenu}>Marketplace</a>
            <a href="/remakers" onClick={closeMenu}>ReMakers</a>
            <a href="/about" onClick={closeMenu}>About</a>
            <a href="/faq" onClick={closeMenu}>FAQ</a>
          </div>

          <div className="navbar-actions">
            <a className="btn-secondary" href="/remakers">Become a ReMaker</a>
            <a className="btn-primary" href="/login">Get started</a>
          </div>

          <button
            className="navbar-menu"
            onClick={() => setOpen(!open)}
            aria-label="Toggle navigation"
          >
            <span className="material-symbols-outlined">
              {open ? "close" : "menu"}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
