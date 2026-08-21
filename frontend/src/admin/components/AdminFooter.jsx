import React from "react";
import "./AdminFooter.css";

const columns = [
  {
    title: "Roles",
    links: [
      ["User", "/admin/users"],
      ["ReMaker", "/admin/remakers"],
      ["Admin", "/admin"],
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
    title: "Support",
    links: [
      ["Support Center", "/support"],
      ["FAQ", "/faq"],
      ["Contact Us", "/contact"],
    ],
  },
];

export default function AdminFooter() {
  return (
    <footer className="admin-footer">
      <div className="admin-footer-main admin-footer-container">
        {/* BRAND */}
        <div className="admin-footer-brand">
          <a href="/admin" className="admin-footer-logo">
            <span>ReOrbit</span>
          </a>

          <p>
            Creating a sustainable marketplace where every item deserves a
            second story.
          </p>

          <div className="admin-footer-socials">
            <a href="#" aria-label="Instagram">
              <span className="material-symbols-outlined">photo_camera</span>
            </a>

            <a href="#" aria-label="Share">
              <span className="material-symbols-outlined">share</span>
            </a>
          </div>
        </div>

        {/* COLUMNS */}
        {columns.map((column) => (
          <div className="admin-footer-column" key={column.title}>
            <h4>{column.title}</h4>

            {column.links.map(([label, href]) => (
              <a href={href} key={label}>
                {label}
              </a>
            ))}
          </div>
        ))}
      </div>

      {/* BOTTOM */}
      <div className="admin-footer-bottom admin-footer-container">
        <p>© 2024 ReOrbit. Circular by design. All rights reserved.</p>

        <div>
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}
