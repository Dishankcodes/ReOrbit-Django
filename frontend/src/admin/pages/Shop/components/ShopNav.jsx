import React from "react";
import { NavLink } from "react-router-dom";
import { Store, ShoppingCart, ReceiptText } from "lucide-react";
import { useCartCount, usePurchases } from "../../../data/shopStore";

/* Small tab bar shown at the top of every Shop page. */
export default function ShopNav() {
  const cart = useCartCount();
  const open = usePurchases().filter((o) => ["Pending", "Confirmed"].includes(o.order_status)).length;
  const cls = ({ isActive }) => `sh-nav-link ${isActive ? "active" : ""}`;
  return (
    <nav className="sh-nav" aria-label="Shop sections">
      <NavLink to="/admin-shop" end className={cls}><Store size={16} /> Browse</NavLink>
      <NavLink to="/admin-shop/cart" className={cls}><ShoppingCart size={16} /> Cart {cart > 0 && <span className="sh-pill" data-testid="cart-count">{cart}</span>}</NavLink>
      <NavLink to="/admin-shop/orders" className={cls}><ReceiptText size={16} /> My purchases {open > 0 && <span className="sh-pill soft">{open}</span>}</NavLink>
    </nav>
  );
}
