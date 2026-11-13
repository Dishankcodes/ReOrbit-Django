/* =========================================================
   Shared › MaintenanceGate
   Wrap the page area of the User and ReMaker layouts.
   While an admin has Maintenance mode on (Admin › Settings › Platform), members see a
   "be right back" page instead. Admins use their own app and are not affected.
   The server also refuses new orders, donations and listings in this mode.
   ========================================================= */
import React from "react";
import { Wrench } from "lucide-react";

import { refreshRules, useRules } from "../platformRules";
import "./MaintenanceGate.css";

export default function MaintenanceGate({ children }) {
  const { maintenance, supportEmail } = useRules();

  if (!maintenance) return children;

  return (
    <section className="mgate" role="status" aria-live="polite">
      <span className="mgate-icon" aria-hidden="true">
        <Wrench size={26} />
      </span>
      <h2>We’ll be right back</h2>
      <p>
        ReOrbit is taking a short break for maintenance. Orders, donations and
        new listings are paused for now, and everything you’ve saved is safe.
        Please check again in a little while.
      </p>
      <div className="mgate-actions">
        <button
          type="button"
          className="mgate-btn"
          onClick={() => refreshRules({ force: true })}
        >
          Check again
        </button>
        {supportEmail && (
          <a className="mgate-link" href={`mailto:${supportEmail}`}>
            Contact {supportEmail}
          </a>
        )}
      </div>
    </section>
  );
}
