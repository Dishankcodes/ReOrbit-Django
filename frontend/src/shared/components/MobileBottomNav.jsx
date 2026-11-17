import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { House, Package, Plus, ReceiptText, Store, UserRound } from "lucide-react";

import "./MobileBottomNav.css";

/* The phone menu shown after login: two tabs, a raised "+" in the middle, two tabs.
   The sidebar is still there (the menu button in the header); this is the quick way
   to the places people use most. It only exists on screens up to 900px wide. */
const SIDES = {
  user: {
    items: [
      { label: "Home", to: "/user-dashboard", icon: House },
      { label: "Marketplace", to: "/user-marketplace", icon: Store },
      { label: "Sell", to: "/user-sell/new", icon: Plus, add: true, label2: "Add a product" },
      { label: "Orders", to: "/user-orders", icon: ReceiptText },
      { label: "Profile", to: "/user-profile", icon: UserRound, also: ["/user-settings"] },
    ],
  },
  remaker: {
    items: [
      { label: "Home", to: "/remaker-dashboard", icon: House },
      { label: "Marketplace", to: "/remaker-marketplace", icon: Store },
      { label: "Add", to: "/remaker-products/new", icon: Plus, add: true, label2: "Add a product" },
      { label: "Sales", to: "/remaker-sales", icon: ReceiptText, also: ["/remaker-orders"] },
      { label: "Profile", to: "/remaker-profile", icon: UserRound, also: ["/remaker-settings"] },
    ],
  },
  admin: {
    items: [
      { label: "Home", to: "/admin-dashboard", icon: House },
      { label: "Orders", to: "/admin-orders", icon: ReceiptText },
      { label: "List", to: "/admin-sell/new", icon: Plus, add: true, label2: "List a product" },
      { label: "Products", to: "/admin-products", icon: Package },
      { label: "Profile", to: "/admin-profile", icon: UserRound, also: ["/admin-settings"] },
    ],
  },
};

/* The chat composer lives at the bottom of the screen, so a chat thread hides the menu. */
const CHAT_THREAD = /-messages\/[^/]+\/?$/;

const isActive = (item, pathname) => {
  const paths = [item.to, ...(item.also || [])];
  if (item.add) return pathname === item.to;
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
};

export default function MobileBottomNav({ side = "user" }) {
  const { pathname } = useLocation();
  const [typing, setTyping] = useState(false);
  const config = SIDES[side] || SIDES.user;

  /* While the keyboard is up the menu would sit on top of what is being typed. */
  useEffect(() => {
    const field = (el) =>
      el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && el.type !== "checkbox" && el.type !== "radio" && el.type !== "button" && el.type !== "submit";
    const on = (event) => field(event.target) && setTyping(true);
    const off = () => setTyping(false);
    document.addEventListener("focusin", on);
    document.addEventListener("focusout", off);
    return () => {
      document.removeEventListener("focusin", on);
      document.removeEventListener("focusout", off);
    };
  }, []);

  const hidden = CHAT_THREAD.test(pathname);

  /* lets the page leave room for the menu (see responsive.css) */
  useEffect(() => {
    document.body.classList.toggle("has-bottom-nav", !hidden);
    return () => document.body.classList.remove("has-bottom-nav");
  }, [hidden]);

  if (hidden) return null;

  return (
    <nav
      className={`mbn mbn-${side} ${typing ? "mbn-typing" : ""}`}
      aria-label="Main menu"
    >
      {config.items.map((item) => {
        const Icon = item.icon;
        const active = isActive(item, pathname);
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.add}
            className={`mbn-item ${item.add ? "mbn-add" : ""} ${active ? "active" : ""}`}
            aria-current={active ? "page" : undefined}
            aria-label={item.label2 || item.label}
          >
            <span className="mbn-icon">
              <Icon
                size={item.add ? 26 : 22}
                strokeWidth={item.add ? 2.4 : active ? 2.3 : 1.8}
                fill={active && !item.add ? "currentColor" : "none"}
                fillOpacity={active && !item.add ? 0.14 : 0}
              />
            </span>
            {!item.add && <span className="mbn-label">{item.label}</span>}
          </NavLink>
        );
      })}
    </nav>
  );
}
