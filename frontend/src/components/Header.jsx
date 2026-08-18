import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import AppLogo from "@/components/ui/AppLogo";
import Icon from "@/components/ui/AppIcon";

const navLinks = [
  {
    label: "Marketplace",
    href: "/marketplace",
  },
  {
    label: "ReMakers",
    href: "/remakers",
  },
  {
    label: "About",
    href: "/about",
  },
  {
    label: "FAQ",
    href: "/faq",
  },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 12);
    };

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const closeMenu = () => {
    setMobileOpen(false);
  };

  return (
    <>
      <header
        className={`site-header ${scrolled ? "site-header-scrolled" : ""}`}
      >
        <div className="container">
          <div className="header-inner">
            {/* Logo */}
            <div className="header-logo">
              <Link to="/" className="logo-link">
                <AppLogo size={32} />

                <span className="logo-text">ReOrbit</span>
              </Link>
            </div>

            {/* Desktop navigation */}
            <nav className="desktop-navigation" aria-label="Main navigation">
              {navLinks.map((link) => (
                <Link key={link.href} to={link.href} className="nav-link">
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right buttons */}
            <div className="header-actions">
              <Link
                to="/remakers"
                className="btn-secondary header-remaker-button"
              >
                Become a ReMaker
              </Link>

              <Link to="/login" className="btn-primary header-start-button">
                Get started
              </Link>

              <button
                type="button"
                className="mobile-menu-button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
                aria-expanded={mobileOpen}
              >
                <Icon name="Bars3Icon" size={19} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="mobile-menu-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <div className="mobile-menu-header">
            <Link to="/" className="logo-link" onClick={closeMenu}>
              <AppLogo size={32} />

              <span className="logo-text">ReOrbit</span>
            </Link>

            <button
              type="button"
              className="mobile-close-button"
              onClick={closeMenu}
              aria-label="Close menu"
            >
              <Icon name="XMarkIcon" size={19} />
            </button>
          </div>

          <nav className="mobile-navigation" aria-label="Mobile navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="mobile-nav-link"
                onClick={closeMenu}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mobile-menu-actions">
            <Link
              to="/remakers"
              className="btn-secondary mobile-action-button"
              onClick={closeMenu}
            >
              Become a ReMaker
            </Link>

            <Link
              to="/login"
              className="btn-primary mobile-action-button"
              onClick={closeMenu}
            >
              Get started — it&apos;s free
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
