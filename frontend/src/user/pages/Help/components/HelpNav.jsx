import React from "react";
import { NavLink } from "react-router-dom";
import { CircleHelp, LifeBuoy, MessageSquarePlus } from "lucide-react";
import { useTickets } from "../../../data/supportStore";

export default function HelpNav() {
  const open = useTickets().filter((t) => t.status !== "Resolved").length;
  const cls = ({ isActive }) => `hp-nav-link ${isActive ? "is-active" : ""}`;
  return (
    <nav className="hp-nav" aria-label="Help sections">
      <NavLink to="/user-help" end className={cls}><CircleHelp size={15} /> Help center</NavLink>
      <NavLink to="/user-help/contact" className={cls}><MessageSquarePlus size={15} /> Contact support</NavLink>
      <NavLink to="/user-help/tickets" className={cls}><LifeBuoy size={15} /> My tickets {open > 0 && <span className="hp-pill">{open}</span>}</NavLink>
    </nav>
  );
}
