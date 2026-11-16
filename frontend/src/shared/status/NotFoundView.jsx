import React from "react";
import { ArrowLeft, Compass } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import useStatusHead from "./useStatusHead";
import "./status.css";

/* The 404 body used by the public site, the member app and the ReMaker app.
   (Admin keeps its own in admin/pages/States.)
     theme   "public" | "user" | "remaker"   colours
     home    { to, label }                   the main way out
     help    { to, label }                   optional second button
     links   [{ to, label, note }]           quick links
     full    true on the public site (no sidebar: fills the screen under the navbar) */
export default function NotFoundView({ theme, home, help, links = [], full = false }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useStatusHead("Page not found");

  const back = () =>
    window.history.length > 1 ? navigate(-1) : navigate(home.to);

  return (
    <section
      className={`stx stx-${theme} ${full ? "stx-full" : ""}`}
      role="status"
      aria-labelledby="stx-title"
    >
      <div className="stx-art" aria-hidden="true">
        <span>4</span>
        <span className="stx-planet">
          <Compass size={44} strokeWidth={1.4} />
        </span>
        <span>4</span>
      </div>

      <h1 id="stx-title">We could not find that page</h1>
      <p className="stx-text">
        There is nothing at <code>{pathname}</code>. It may have moved, or the
        link may have a typo.
      </p>

      <div className="stx-actions">
        <button type="button" className="stx-btn ghost" onClick={back}>
          <ArrowLeft size={15} /> Go back
        </button>
        <Link to={home.to} className="stx-btn primary">
          {home.label}
        </Link>
        {help && (
          <Link to={help.to} className="stx-btn ghost">
            {help.label}
          </Link>
        )}
      </div>

      {links.length > 0 && (
        <nav className="stx-links" aria-label="Popular pages">
          {links.map((item) => (
            <Link to={item.to} key={item.to}>
              <strong>{item.label}</strong>
              {item.note && <span>{item.note}</span>}
            </Link>
          ))}
        </nav>
      )}
    </section>
  );
}
