/* The buying pages (marketplace, product, cart, checkout, orders) are the same for members,
   ReMakers and admins. They are written with the member paths; this makes every link and
   navigate() land on the visitor's own portal instead:
     ReMaker: /user-marketplace -> /remaker-marketplace, /user-orders -> /remaker-orders, ...
     Admin:   /user-marketplace -> /admin-shop,          /user-orders -> /admin-shop/orders, ... */
import * as RR from "react-router-dom";
import React from "react";

import { portalOf } from "../api/session";

const MAPS = {
  remaker: [
    /* help desk: raising a ticket, the ticket list and one ticket live under /remaker-help */
    ["/user-help/contact", "/remaker-help/new"],
    ["/user-help/tickets", "/remaker-help/tickets"],
    ["/user-help", "/remaker-help"],
    ["/user-sell", "/remaker-products"],
    ["/user-remakers", "/remaker-marketplace"],
    ["/user-marketplace", "/remaker-marketplace"],
    ["/user-wishlist", "/remaker-saved"],
    ["/user-reviews", "/remaker-my-reviews"],
    ["/user-orders", "/remaker-orders"],
    ["/user-cart", "/remaker-cart"],
    ["/user-checkout", "/remaker-checkout"],
  ],
  admin: [
    ["/user-help", "/admin-support"],
    ["/user-sell", "/admin-sell"],
    ["/user-remakers", "/admin-shop"],
    ["/user-marketplace", "/admin-shop"],
    ["/user-wishlist", "/admin-shop/wishlist"],
    ["/user-reviews", "/admin-shop/reviews"],
    ["/user-orders", "/admin-shop/orders"],
    ["/user-cart", "/admin-shop/cart"],
    ["/user-checkout", "/admin-shop/checkout"],
  ],
};

export function portalPath(path) {
  if (typeof path !== "string" || !path.startsWith("/user-")) return path;
  const portal = portalOf(window.location.pathname);
  const map = MAPS[portal];
  if (!map) return path;
  /* the ticket list is a tab of the ReMaker help page, not a page of its own */
  if (portal === "remaker" && /^\/user-help\/tickets\/?(\?|#|$)/.test(path))
    return "/remaker-help?tab=tickets";
  for (const [from, to] of map) {
    if (
      path === from ||
      path.startsWith(`${from}/`) ||
      path.startsWith(`${from}?`) ||
      path.startsWith(`${from}#`)
    ) {
      return to + path.slice(from.length);
    }
  }
  return path;
}

const fix = (to) =>
  typeof to === "string"
    ? portalPath(to)
    : to && to.pathname
      ? { ...to, pathname: portalPath(to.pathname) }
      : to;

export * from "react-router-dom";

export const Link = React.forwardRef(function Link({ to, ...rest }, ref) {
  return <RR.Link ref={ref} to={fix(to)} {...rest} />;
});

export const NavLink = React.forwardRef(function NavLink({ to, ...rest }, ref) {
  return <RR.NavLink ref={ref} to={fix(to)} {...rest} />;
});

export function Navigate({ to, ...rest }) {
  return <RR.Navigate to={fix(to)} {...rest} />;
}

export function useNavigate() {
  const nav = RR.useNavigate();
  return React.useCallback(
    (to, opts) => (typeof to === "number" ? nav(to) : nav(fix(to), opts)),
    [nav],
  );
}
