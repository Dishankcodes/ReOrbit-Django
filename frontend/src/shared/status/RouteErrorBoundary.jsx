import React from "react";
import { Link } from "react-router-dom";
import { ChevronDown, RotateCw, TriangleAlert } from "lucide-react";

import useStatusHead from "./useStatusHead";
import "./status.css";

/* After a new release, a browser that still has the old app open asks for page files that no
   longer exist. That is not a bug in the page: reloading fetches the new version. */
const STALE_BUILD =
  /dynamically imported module|Loading chunk|Importing a module script failed|error loading dynamically/i;
const RELOAD_KEY = "reorbit:stale-reload";

function reloadOnce() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < 15000) return false; // already tried: show the message instead of looping
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

function CrashView({ theme, home, error, stale, onRetry, full }) {
  useStatusHead(stale ? "Update available" : "Something went wrong");
  const [open, setOpen] = React.useState(false);
  return (
    <section className={`stx stx-${theme} ${full ? "stx-full" : ""}`} role="alert">
      <span className="stx-icon" aria-hidden="true">
        <TriangleAlert size={30} strokeWidth={1.6} />
      </span>
      <h1>{stale ? "A new version of ReOrbit is ready" : "This page ran into a problem"}</h1>
      <p className="stx-text">
        {stale
          ? "ReOrbit was just updated. Reload to get the latest version. Nothing you saved is lost."
          : "Something unexpected happened while showing this page. Nothing was lost, and the rest of ReOrbit still works."}
      </p>
      <div className="stx-actions">
        {!stale && (
          <button type="button" className="stx-btn primary" onClick={onRetry}>
            <RotateCw size={15} /> Try again
          </button>
        )}
        <button
          type="button"
          className={`stx-btn ${stale ? "primary" : "ghost"}`}
          onClick={() => window.location.reload()}
        >
          Reload the page
        </button>
        <Link to={home.to} className="stx-btn ghost" onClick={onRetry}>
          {home.label}
        </Link>
      </div>
      {!stale && (
        <>
          <button
            type="button"
            className={`stx-details-toggle ${open ? "open" : ""}`}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            For the support team <ChevronDown size={15} />
          </button>
          {open && <pre className="stx-details">{String(error?.message || error)}</pre>}
        </>
      )}
    </section>
  );
}

/* Catches a crash in one page so the navbar or sidebar around it keeps working.
   Give it resetKey={pathname}: moving to another page clears the error. */
export default class RouteErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Page crashed:", error, info?.componentStack);
    if (STALE_BUILD.test(String(error?.message || error))) reloadOnce();
  }

  componentDidUpdate(previous) {
    if (previous.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const { theme = "public", home = { to: "/", label: "Go to home" }, full = false } = this.props;
    return (
      <CrashView
        theme={theme}
        home={home}
        full={full}
        error={error}
        stale={STALE_BUILD.test(String(error?.message || error))}
        onRetry={this.reset}
      />
    );
  }
}
