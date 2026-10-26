import React from "react";
import { NavLink } from "react-router-dom";
import { Store, ShoppingBag, ReceiptText } from "lucide-react";
import { useCartCount } from "../../../data/shopStore";
import { isActive, useOrders } from "../../../data/ordersStore";

/* Small tab bar shown at the top of the cart / checkout / success pages. */
export default function ShopNav() {
  const cart = useCartCount();
  const open = useOrders().filter(isActive).length;
  const cls = ({ isActive: on }) => `sp-nav-link ${on ? "is-active" : ""}`;

  return (
    <nav className="sp-nav" aria-label="Shop sections">
      <NavLink to="/user-marketplace" end className={cls}><Store size={16} /> Marketplace</NavLink>
      <NavLink to="/user-cart" className={cls}>
        <ShoppingBag size={16} /> Cart {cart > 0 && <span className="sp-pill">{cart}</span>}
      </NavLink>
      <NavLink to="/user-orders" className={cls}>
        <ReceiptText size={16} /> My orders {open > 0 && <span className="sp-pill soft">{open}</span>}
      </NavLink>
    </nav>
  );
}
