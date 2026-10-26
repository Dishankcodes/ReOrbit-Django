import React from "react";
import { Link } from "react-router-dom";
import { TriangleAlert, RotateCw, LayoutDashboard, ChevronDown } from "lucide-react";
import "../css/states/AdminStates.css";

/* Catches a crash on one admin page so the sidebar and header stay usable.
   The layout gives it key={pathname}, so moving to another page resets it. */
export default class AdminErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null, showDetails: false }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("Admin page crashed:", error, info?.componentStack); }
  reset = () => this.setState({ error: null, showDetails: false });

  render() {
    const { error, showDetails } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="st-crash" role="alert">
        <span className="st-crash-icon"><TriangleAlert size={30} strokeWidth={1.6} /></span>
        <span className="st-code">Error</span>
        <h2>This page ran into a problem</h2>
        <p>Something unexpected happened while showing this page. Nothing was lost, and the rest of the admin still works.</p>
        <div className="st-actions">
          <button type="button" className="ad-btn ad-btn-primary" onClick={this.reset}><RotateCw size={15} /> Try again</button>
          <Link to="/admin-dashboard" className="ad-btn ad-btn-ghost" onClick={this.reset}><LayoutDashboard size={15} /> Go to dashboard</Link>
          <button type="button" className="ad-btn ad-btn-ghost" onClick={() => window.location.reload()}>Reload the page</button>
        </div>
        <button type="button" className={`st-details-toggle ${showDetails ? "open" : ""}`} aria-expanded={showDetails} onClick={() => this.setState({ showDetails: !showDetails })}>
          For the support team <ChevronDown size={15} />
        </button>
        {showDetails && <pre className="st-details">{String(error?.message || error)}</pre>}
      </div>
    );
  }
}
