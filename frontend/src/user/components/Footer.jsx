import React from "react";
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
      ["Stories", "/stories"],
      ["Impact", "/impact"],
    ],
  },
  {
    title: "Help & Support",
    links: [
      ["FAQ", "/faq"],
      ["Help Center", "/support"],
      ["Contact Us", "/contact"],
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

          <p>Sell, donate,  or discover something worth keeping.</p>
        </div>

        <a className="btn-primary footer-cta-button" href="/login">
          Get started
          <span className="material-symbols-outlined">arrow_forward</span>
        </a>
      </div>

      {/* Main Footer */}
      <div className="footer-main container">
        {/* Brand */}
        <div className="footer-brand">
          <a className="footer-logo" href="/">
            <span className="material-symbols-outlined">eco</span>

            <span>ReOrbit</span>
          </a>

          <p>
            A circular marketplace where verified, refurbished and rescued
            objects find a meaningful second story.
          </p>

          <div className="footer-socials">
            <a href="#" aria-label="Instagram">
              <span className="material-symbols-outlined">photo_camera</span>
            </a>

            <a href="#" aria-label="Community">
              <span className="material-symbols-outlined">forum</span>
            </a>

            <a href="#" aria-label="Share ReOrbit">
              <span className="material-symbols-outlined">share</span>
            </a>
          </div>
        </div>

        {/* Columns */}
        {columns.map((column) => (
          <div className="footer-column" key={column.title}>
            <h4>{column.title}</h4>

            {column.links.map(([label, href]) => (
              <a href={href} key={label}>
                {label}
              </a>
            ))}
          </div>
        ))}
      </div>

      {/* Bottom */}
      <div className="footer-bottom container">
        <p>© 2026 ReOrbit. Circular by design. All rights reserved.</p>

        <div>
          <a href="/UserPrivacy">Privacy</a>
          <a href="/UserTerms">Terms</a>
        </div>
      </div>
    </footer>
  );
}
