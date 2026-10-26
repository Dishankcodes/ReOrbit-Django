import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, LayoutDashboard, Compass } from "lucide-react";
import { useAccess } from "../../data/teamStore";
import "../../css/states/AdminStates.css";

/* Shown inside the admin layout, so the sidebar is still there to help. */
const POPULAR = [
  { key: "users", label: "Users", path: "/admin-users" },
  { key: "orders", label: "Orders", path: "/admin-orders" },
  { key: "donations", label: "Donations", path: "/admin-donations" },
  { key: "pickups", label: "Pickups", path: "/admin-pickups" },
  { key: "complaints", label: "Complaints", path: "/admin-complaints" },
  { key: "help", label: "Help & Support", path: "/admin-help" },
];

export default function AdminNotFound() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const access = useAccess();
  const links = POPULAR.filter((l) => l.key === "help" || access.canSee(l.key));
  return (
    <div className="st-crash st-404" role="status">
      <div className="st-404-art" aria-hidden="true">
        <span>4</span>
        <span className="st-404-planet"><Compass size={44} strokeWidth={1.4} /></span>
        <span>4</span>
      </div>
      <h2>We could not find that page</h2>
      <p>The address <code>{pathname}</code> does not match anything in the admin. It may have been moved, or the link has a typo.</p>
      <div className="st-actions">
        <button type="button" className="ad-btn ad-btn-ghost" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/admin-dashboard"))}><ArrowLeft size={15} /> Go back</button>
        <Link to="/admin-dashboard" className="ad-btn ad-btn-primary"><LayoutDashboard size={15} /> Go to dashboard</Link>
      </div>
      <div className="st-quick">
        <span>Or jump to</span>
        {links.map((l) => <Link key={l.path} to={l.path}>{l.label}</Link>)}
      </div>
    </div>
  );
}
