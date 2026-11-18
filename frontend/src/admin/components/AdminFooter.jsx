import React from "react";
import ShareSiteButton from "../../shared/components/ShareSiteButton";
import "./AdminFooter.css";

const columns = [
  {
    title: "Roles",
    links: [
      ["User", "/"],
      ["ReMaker", "/remakers-home"],
      ["Admin", "/admin-home"],
    ],
  },
  {
    title: "Community",
    links: [
      ["ReMakers", "/remakers"],
      ["About Us", "/admin-about"],
      ["Admin sign in", "/admin-login"],
    ],
  },
  {
    title: "Support",
    links: [
      ["Privacy Policy", "/privacy"],
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
          <a href="/admin-home" className="admin-footer-logo">
            <span>ReOrbit</span>
          </a>

          <p>
            Creating a sustainable marketplace where every item deserves a
            second story.
          </p>

          <div className="admin-footer-socials">
            <ShareSiteButton />
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
        <p>© {new Date().getFullYear()} ReOrbit. Circular by design. All rights reserved.</p>

        <div>
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}
