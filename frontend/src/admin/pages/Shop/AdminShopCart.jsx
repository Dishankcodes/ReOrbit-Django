import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Trash2, Minus, Plus, Heart, ArrowRight, ShieldCheck, Truck, AlertTriangle, Store, Tag } from "lucide-react";

import { useCart, setCartQty, removeFromCart, clearCart, startCheckout, toggleWishlist, useWishlist } from "../../data/shopStore";
import { formatINR } from "../../utils/format";
import ProductImg from "./components/ProductImg";
import ShopNav from "./components/ShopNav";
import EmptyState from "../../components/ui/EmptyState";
import useToast from "../../components/ui/useToast";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/shop/AdminShop.css";

export default function AdminShopCart() {
  const navigate = useNavigate();
  const cart = useCart();
  const saved = useWishlist();
  const { toast, toastNode } = useToast();

  const checkout = () => { startCheckout(cart.lines.map((l) => ({ id: l.id, qty: l.qty })), "cart"); navigate("/admin-shop/checkout"); };
  const free = cart.lines.filter((l) => l.fee === 0).length;

  if (cart.all.length === 0) {
    return (
      <div className="au-page sh-page">
        <ShopNav />
        <section className="au-panel">
          <EmptyState icon={ShoppingCart} title="Your cart is empty" text="Add community items or ReMaker products to start an order." action={<Link to="/admin-shop" className="ad-btn ad-btn-primary ad-btn-sm"><Store size={14} /> Browse products</Link>} />
        </section>
      </div>
    );
  }

  return (
    <div className="au-page sh-page">
      <ShopNav />
      <header className="sh-pagehead"><div><h2>Your cart</h2><p>{cart.all.length} item{cart.all.length === 1 ? "" : "s"} · review before you check out</p></div>
        <button type="button" className="sh-link danger" onClick={() => { clearCart(); toast("Cart cleared"); }}><Trash2 size={14} /> Clear cart</button></header>

      <div className="sh-cartgrid">
        <section className="sh-lines" aria-label="Cart items">
          {cart.all.map((l) => {
            const p = l.product;
            const line = cart.lines.find((x) => x.id === l.id);
            return (
              <article key={l.id} className={`sh-line ${l.unavailable ? "off" : ""}`}>
                <Link to={`/admin-shop/product/${p.id}`} className="sh-line-img"><ProductImg src={p.image} alt={p.title} /></Link>
                <div className="sh-line-main">
                  <span className="sh-cat">{p.category} · {p.type === "product" ? "ReMaker" : "Community"}</span>
                  <h3><Link to={`/admin-shop/product/${p.id}`}>{p.title}</Link></h3>
                  <Link to={`/admin-shop/seller/${p.owner.id}`} className="sh-link small">Sold by {p.owner.name}</Link>
                  {l.unavailable ? (
                    <p className="sh-line-warn"><AlertTriangle size={14} /> No longer available. Remove it to continue.</p>
                  ) : (
                    <div className="sh-line-ctrl">
                      <div className="sh-qty sm" role="group" aria-label={`Quantity of ${p.title}`}>
                        <button type="button" onClick={() => setCartQty(p.id, l.qty - 1, p.available)} disabled={l.qty <= 1} aria-label="Decrease quantity"><Minus size={14} /></button>
                        <output>{l.qty}</output>
                        <button type="button" onClick={() => setCartQty(p.id, l.qty + 1, p.available)} disabled={l.qty >= p.available} aria-label="Increase quantity"><Plus size={14} /></button>
                      </div>
                      <button type="button" className="sh-link" onClick={() => toggleWishlist(p.id)}><Heart size={14} fill={saved.has(p.id) ? "currentColor" : "none"} /> {saved.has(p.id) ? "Saved" : "Save for later"}</button>
                      <button type="button" className="sh-link danger" onClick={() => { removeFromCart(p.id); toast("Removed from cart"); }}><Trash2 size={14} /> Remove</button>
                    </div>
                  )}
                </div>
                {!l.unavailable && (
                  <div className="sh-line-price"><strong>{formatINR(line.lineSubtotal)}</strong><span>{formatINR(p.price)} each</span><em>{line.fee ? `+ ${formatINR(line.fee)} delivery` : "Free delivery"}</em></div>
                )}
              </article>
            );
          })}
        </section>

        <aside className="sh-summary" aria-label="Order summary">
          <h3>Order summary</h3>
          <dl>
            <div><dt>Subtotal ({cart.count} item{cart.count === 1 ? "" : "s"})</dt><dd>{formatINR(cart.subtotal)}</dd></div>
            <div><dt>Delivery</dt><dd>{cart.delivery ? formatINR(cart.delivery) : "Free"}</dd></div>
            <div><dt>Platform fee <Tag size={12} /></dt><dd className="good">Waived</dd></div>
            <div className="total"><dt>Total</dt><dd>{formatINR(cart.total)}</dd></div>
          </dl>
          <button type="button" className="ad-btn ad-btn-primary sh-big" onClick={checkout} disabled={cart.lines.length === 0}>Proceed to checkout <ArrowRight size={16} /></button>
          <Link to="/admin-shop" className="sh-link center">Continue shopping</Link>
          <ul className="sh-mini-trust">
            <li><ShieldCheck size={14} /> Secure checkout</li>
            <li><Truck size={14} /> {free ? `${free} with free delivery` : "Delivery to your address"}</li>
          </ul>
        </aside>
      </div>
      {toastNode}
    </div>
  );
}
