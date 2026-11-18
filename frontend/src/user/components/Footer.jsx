import React from "react";
import { Link } from "react-router-dom";
import ShareSiteButton from "../../shared/components/ShareSiteButton";
import { getRules } from "../../shared/platformRules";
import "./Footer.css";

const columns = [
  {
    title: "Platform",
    links: [
      ["Marketplace", "/discover-marketplace"],
      ["How it works", "/how-it-works"],
      ["About Us", "/about"],
    ],
  },
  {
    title: "Community",
    links: [
      ["ReMakers", "/discover-remakers"],
      ["Become a ReMaker", "/remakers"],
      ["Sign in / Join", "/auth"],
    ],
  },
  {
    title: "Help & Support",
    links: [
      ["FAQ", "/faq"],
      ["Contact Us", "/contact"],
      ["Privacy Policy", "/privacy"],
    ],
  },
];

export default function Footer() {
  return (
    <footer className="site-footer">
      {/* CTA */}
      <div className="footer-cta container">
        <div className="footer-cta-content">
          <span className="footer-eyebrow">Keep it moving</span>

          <h3>Give something a second orbit.</h3>

          <p>Sell, donate, or discover something worth keeping.</p>
        </div>

        <Link className="btn-primary footer-cta-button" to="/auth">
          Get started
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
      </div>

      {/* Main Footer */}
      <div className="footer-main container">
        {/* Brand */}
        <div className="footer-brand">
          <Link className="footer-logo" to="/">
            <span className="material-symbols-outlined">eco</span>

            <span>ReOrbit</span>
          </Link>

          <p>
            A circular marketplace where verified, refurbished and rescued
            objects find a meaningful second story.
          </p>

          <div className="footer-socials">
            <a href={`mailto:${getRules().supportEmail || "support@reorbit.in"}`} aria-label="Email ReOrbit">
              <span className="material-symbols-outlined">mail</span>
            </a>

            <Link to="/contact" aria-label="Contact ReOrbit">
              <span className="material-symbols-outlined">forum</span>
            </Link>

            <ShareSiteButton />
          </div>
        </div>

        {/* Columns */}
        {columns.map((column) => (
          <div className="footer-column" key={column.title}>
            <h4>{column.title}</h4>

            {column.links.map(([label, href]) => (
              <Link to={href} key={label}>
                {label}
              </Link>
            ))}
          </div>
        ))}
      </div>

      {/* Bottom */}
      <div className="footer-bottom container">
        <p>© {new Date().getFullYear()} ReOrbit. Circular by design. All rights reserved.</p>

        <div>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </div>
      </div>
    </footer>
  );
}
