import React from "react";
import "./AdminFooter.css";

const columns = [
  {
    title: "ROLES",
    links: [
      ["User", "/admin/users"],
      ["ReMaker", "/admin/remakers"],
      ["Admin", "/admin/dashboard"],
    ],
  },
  {
    title: "COMMUNITY",
    links: [
      ["ReMakers", "/admin/community/remakers"],
      ["About Us", "/admin/about"],
      ["Stories", "/admin/stories"],
    ],
  },
  {
    title: "SUPPORT",
    links: [
      ["Support Center", "/admin/support"],
      ["FAQ", "/admin/faq"],
      ["Contact Us", "/admin/contact"],
    ],
  },
];

export default function AdminFooter() {
  return (
    <footer className="admin-scope site-footer">
      <div className="footer-main container">
        <div className="footer-brand">
          <a className="footer-logo" href="/admin">
            <span className="logo-text">ReOrbit</span>
          </a>

          <p className="footer-desc">
            Creating a sustainable marketplace where every item deserves a second
            story.
          </p>

          <div className="footer-socials">
            <a href="#" className="social-icon-btn" aria-label="Camera">
              📷
            </a>
            <a href="#" className="social-icon-btn" aria-label="Share">
              🔗
            </a>
          </div>
        </div>

        <div className="footer-columns-group">
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
      </div>

      <div className="footer-bottom container">
        <p>© 2026 ReOrbit. Circular by design. All rights reserved.</p>

        <div className="legal-links">
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}