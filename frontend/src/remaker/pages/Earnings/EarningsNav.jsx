import React from "react";
import { NavLink } from "react-router-dom";

/* Sub navigation shared by the three earnings pages */
export default function EarningsNav() {
  const items = [
    { to: "/remaker-earnings", label: "Overview", end: true },
    { to: "/remaker-earnings/transactions", label: "Transactions" },
    { to: "/remaker-earnings/payouts", label: "Payouts" },
  ];

  return (
    <nav className="sls-subnav" aria-label="Earnings sections">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
