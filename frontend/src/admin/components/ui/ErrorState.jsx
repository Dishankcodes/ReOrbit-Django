import React from "react";
import { TriangleAlert, RotateCw, WifiOff, Lock } from "lucide-react";
import "../../css/states/AdminStates.css";

/* For a part of a page (a chart, a table) that could not load.
     <ErrorState kind="network" onRetry={reload} />
   kind: "generic" | "network" | "denied". The page-level crash screen is
   AdminErrorBoundary, which uses the same look. */
const KINDS = {
  generic: { icon: TriangleAlert, title: "We could not load this", text: "Something went wrong on our side. Your data is safe. Please try again." },
  network: { icon: WifiOff, title: "You seem to be offline", text: "Check your internet connection, then try again." },
  denied: { icon: Lock, title: "You do not have access to this", text: "Ask the super admin if you need it." },
};

export default function ErrorState({ kind = "generic", title, text, onRetry, retryLabel = "Try again", compact = false, children }) {
  const k = KINDS[kind] || KINDS.generic;
  const Icon = k.icon;
  return (
    <div className={`st-error ${compact ? "is-compact" : ""}`} role="alert">
      <span className="st-error-icon"><Icon size={compact ? 20 : 26} strokeWidth={1.7} /></span>
      <strong>{title || k.title}</strong>
      <p>{text || k.text}</p>
      <div className="st-error-actions">
        {onRetry && kind !== "denied" && <button type="button" className="ad-btn ad-btn-primary ad-btn-sm" onClick={onRetry}><RotateCw size={14} /> {retryLabel}</button>}
        {children}
      </div>
    </div>
  );
}
