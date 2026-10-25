import React from "react";
import { Link, useLocation } from "react-router-dom";

import "../../css/ReMakerUi.css";
import "./NotFoundPage.css";

/* Shown for any /remaker... address that does not exist */
export default function ReMakerNotFound() {
  const { pathname } = useLocation();

  const links = [
    {
      to: "/remaker-dashboard",
      label: "Dashboard",
      note: "Your studio at a glance",
    },
    {
      to: "/remaker-products",
      label: "Products",
      note: "Manage what you sell",
    },
    { to: "/remaker-sales", label: "Sales", note: "Orders from customers" },
    {
      to: "/remaker-marketplace",
      label: "Marketplace",
      note: "Find items to rework",
    },
  ];

  return (
    <main className="rk nf">
      <div className="nf-art" aria-hidden="true">
        <img src="/images/portfolio/before-tara-chair.jpg" alt="" />
        <img src="/images/portfolio/tara-chair.jpg" alt="" />
      </div>

      <p className="nf-code">404</p>
      <h1>We could not find that page</h1>
      <p className="nf-text">
        There is nothing at <code>{pathname}</code>. It may have moved, or the
        link may have a typo.
      </p>

      <div className="nf-actions">
        <Link to="/remaker-dashboard" className="rk-btn primary">
          Go to dashboard
        </Link>
        <Link to="/remaker-help" className="rk-btn ghost">
          Help and support
        </Link>
      </div>

      <nav className="nf-links" aria-label="Popular pages">
        {links.map((item) => (
          <Link to={item.to} key={item.to}>
            <strong>{item.label}</strong>
            <span>{item.note}</span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
