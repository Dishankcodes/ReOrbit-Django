import React from "react";
import "./Footer.css";

const columns = [
  {
    title: "Platform",
    links: [
      ["Marketplace", "/marketplace"],
      ["Impact", "/impact"],
      ["Sustainability", "/sustainability"],
    ],
  },
  {
    title: "Community",
    links: [
      ["ReMakers", "/remakers"],
      ["About Us", "/about"],
      ["Stories", "/stories"],
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
      <div className="footer-cta container">
        <div>
          <h3>Give something a second orbit.</h3>
          <p>Nothing left behind. Pickup in 25 pincodes.</p>
        </div>
        <a className="btn-primary" href="/login">
          Get started <span className="material-symbols-outlined">arrow_forward</span>
        </a>
      </div>

      <div className="footer-main container">
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
            <a href="#" aria-label="Share">
              <span className="material-symbols-outlined">share</span>
            </a>
          </div>
        </div>

        {columns.map((column) => (
          <div className="footer-column" key={column.title}>
            <h4>{column.title}</h4>
            {column.links.map(([label, href]) => (
              <a href={href} key={label}>{label}</a>
            ))}
          </div>
        ))}
      </div>

      <div className="footer-bottom container">
        <p>© 2024 ReOrbit. Circular by design. All rights reserved.</p>
        <div>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </div>
      </div>
    </footer>
  );
}
