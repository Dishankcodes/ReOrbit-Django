import React from "react";
import { NavLink } from "react-router-dom";
import { Star, History, Sparkles, Ticket, Trophy } from "lucide-react";

const LINKS = [
  { to: "/user-orbit-points", end: true, label: "Overview", icon: Star },
  { to: "/user-orbit-points/history", label: "History", icon: History },
  { to: "/user-orbit-points/earn", label: "Ways to earn", icon: Sparkles },
  { to: "/user-orbit-points/vouchers", label: "Rewards & vouchers", icon: Ticket },
  { to: "/user-badges", label: "Badges", icon: Trophy },
];

export default function PointsNav() {
  return (
    <nav className="rw-nav" aria-label="Orbit Points sections">
      {LINKS.map((l) => {
        const Icon = l.icon;
        return (
          <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `rw-nav-link ${isActive ? "is-active" : ""}`}>
            <Icon size={15} /> {l.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
