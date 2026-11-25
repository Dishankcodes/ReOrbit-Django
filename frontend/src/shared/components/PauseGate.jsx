/* =========================================================
   Shared › PauseGate
   While a Super Admin has paused a side (Admin › System), everyone on that side sees this
   screen instead of the app, and the app stops calling the server (shared/pause.js).
   Sides: members + the public shop (/...), ReMakers (/remaker...), admins (/admin..., except
   Super Admins). Admin sign-in pages stay open so a Super Admin can always get in.
   ========================================================= */
import React from "react";
import { useLocation } from "react-router-dom";
import { PauseCircle, RefreshCw } from "lucide-react";

import { portalOf } from "../../api/session";
import { checkPause, pausedHere, pauseMessage, usePause } from "../pause";
import "./PauseGate.css";

const OPEN_PAGES = /^\/admin-(login|forgot|reset|set-password|change-password)/;

export default function PauseGate({ children }) {
  const { pathname } = useLocation();
  const { checking } = usePause();
  if (OPEN_PAGES.test(pathname) || !pausedHere(pathname)) return children;
  const side = portalOf(pathname);

  return (
    <main className={`pgate pgate--${side}`} role="status" aria-live="polite">
      <section className="pgate-card">
        <span className="pgate-icon" aria-hidden="true">
          <PauseCircle size={30} />
        </span>
        <p className="pgate-brand">ReOrbit</p>
        <h1>{side === "admin" ? "The admin panel is paused" : "We’re taking a short pause"}</h1>
        <p className="pgate-text">{pauseMessage(side)}</p>
        <p className="pgate-note">
          {side === "admin"
            ? "A Super Admin can start it again from Admin › System."
            : "Your account, orders and saved items are safe. Nothing changes while we’re paused."}
        </p>
        <button type="button" className="pgate-btn" onClick={checkPause} disabled={checking}>
          <RefreshCw size={16} className={checking ? "pgate-spin" : ""} />
          {checking ? "Checking…" : "Check again"}
        </button>
      </section>
    </main>
  );
}
