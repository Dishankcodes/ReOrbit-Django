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
    ["/user-marketplace", "/remaker-marketplace"],
    ["/user-wishlist", "/remaker-saved"],
    ["/user-orders", "/remaker-orders"],
    ["/user-cart", "/remaker-cart"],
    ["/user-checkout", "/remaker-checkout"],
  ],
  admin: [
    ["/user-marketplace", "/admin-shop"],
    ["/user-wishlist", "/admin-shop/wishlist"],
    ["/user-orders", "/admin-shop/orders"],
    ["/user-cart", "/admin-shop/cart"],
    ["/user-checkout", "/admin-shop/checkout"],
  ],
};

export function portalPath(path) {
  if (typeof path !== "string" || !path.startsWith("/user-")) return path;
  const map = MAPS[portalOf(window.location.pathname)];
  if (!map) return path;
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
