import React from "react";
import { NavLink } from "react-router-dom";
import { Boxes, PlusCircle, ReceiptText } from "lucide-react";
import { useSales, needsAction } from "../../../data/sellStore";

/* Tab bar shown at the top of every Sell page (re-uses the shop tab styles). */
export default function SellNav() {
  const todo = useSales().filter(needsAction).length;
  const cls = ({ isActive }) => `sh-nav-link ${isActive ? "active" : ""}`;
  return (
    <nav className="sh-nav" aria-label="Sell sections">
      <NavLink to="/admin-sell" end className={cls}>
        <Boxes size={16} /> My listings
      </NavLink>
      <NavLink to="/admin-sell/new" className={cls}>
        <PlusCircle size={16} /> Add product
      </NavLink>
      <NavLink to="/admin-sell/sales" className={cls}>
        <ReceiptText size={16} /> Sales{" "}
        {todo > 0 && (
          <span className="sh-pill" data-testid="sales-todo">
            {todo}
          </span>
        )}
      </NavLink>
    </nav>
  );
}
