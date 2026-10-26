import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Leaf,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Store,
  Trash2,
  Truck,
  BadgeCheck,
  Sparkles,
} from "lucide-react";

import { clearCart, removeFromCart, setCartQty, startCheckout, useCart, FREE_DELIVERY_FROM } from "../../data/shopStore";
import { sellerPath } from "../../data/ordersStore";
import { formatPrice } from "../../../data/marketplaceData";
import EmptyState from "../../components/ui/EmptyState";
import SafeImage from "../../components/ui/SafeImage";
import useToast from "../../components/ui/useToast";
import ShopNav from "./components/ShopNav";

import "../../css/shared/ui-base.css";
import "../../css/shop/shop-base.css";
import "../../css/shop/UserCart.css";

export default function UserCart() {
  const navigate = useNavigate();
  const cart = useCart();
  const { toast, show } = useToast();

  const checkout = () => {
    startCheckout(cart.lines.map((l) => ({ id: l.id, qty: l.qty })), "cart");
    navigate("/user-checkout");
  };

  if (cart.all.length === 0) {
    return (
      <div className="dn sp">
        <ShopNav />
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          text="Add pre-loved pieces or ReMaker creations and they'll wait for you here."
          actionLabel="Browse marketplace"
          to="/user-marketplace"
        />
      </div>
    );
  }

  const free = cart.lines.filter((l) => l.fee === 0).length;
  const toFree = Math.max(0, FREE_DELIVERY_FROM - cart.subtotal);

  return (
    <div className="dn sp">
      <ShopNav />

      <header className="sp-head">
        <div>
          <span className="dn-eyebrow">Almost yours</span>
          <h1>Your cart</h1>
          <p className="dn-muted">
            {cart.all.length} {cart.all.length === 1 ? "piece" : "pieces"} · review before you check out
          </p>
        </div>
        <button type="button" className="sp-textbtn danger" onClick={() => { clearCart(); show("Cart cleared."); }}>
          <Trash2 size={15} /> Clear cart
        </button>
      </header>

      <div className="sp-grid">
        <section className="sp-lines" aria-label="Cart items">
          {cart.all.map((l) => {
            const { item } = l;
            const priced = cart.lines.find((x) => x.id === l.id);
            const remaker = item.sellerType === "remaker";
            return (
              <article key={l.id} className={`dn-card sp-line ${l.unavailable ? "is-off" : ""}`}>
                <Link to={`/user-marketplace/product/${item.id}`} className="sp-line-img">
                  <SafeImage src={item.image} alt={item.title} />
                </Link>

                <div className="sp-line-main">
                  <span className="sp-cat">
                    {item.category} · {item.condition} ·{" "}
                    {remaker ? <b><Sparkles size={11} /> ReMaker</b> : <b><BadgeCheck size={11} /> Community</b>}
                  </span>
                  <h3><Link to={`/user-marketplace/product/${item.id}`}>{item.title}</Link></h3>
                  <Link to={sellerPath(item)} className="dn-link sp-seller">
                    {remaker ? "Made by" : "Sold by"} {item.seller}
                  </Link>

                  {l.unavailable ? (
                    <p className="sp-warn"><AlertTriangle size={14} /> {item.reason} Remove it to continue.</p>
                  ) : (
                    <div className="sp-line-ctrl">
                      <div className="sp-qty" role="group" aria-label={`Quantity of ${item.title}`}>
                        <button type="button" onClick={() => setCartQty(item.id, l.qty - 1, item.available)} disabled={l.qty <= 1} aria-label="Decrease quantity"><Minus size={14} /></button>
                        <output>{l.qty}</output>
                        <button type="button" onClick={() => setCartQty(item.id, l.qty + 1, item.available)} disabled={l.qty >= item.available} aria-label="Increase quantity"><Plus size={14} /></button>
                      </div>
                      {item.available <= 2 && <span className="sp-low">Only {item.available} left</span>}
                      <button type="button" className="sp-textbtn danger" onClick={() => { removeFromCart(item.id); show("Removed from cart."); }}>
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                  )}
                </div>

                {!l.unavailable && priced && (
                  <div className="sp-line-price">
                    <strong>{formatPrice(priced.lineSubtotal)}</strong>
                    <span>{formatPrice(item.price)} each</span>
                    <em>{priced.fee ? `+ ${formatPrice(priced.fee)} delivery` : "Free delivery"}</em>
                  </div>
                )}
                {l.unavailable && (
                  <button type="button" className="sp-textbtn danger sp-line-remove" onClick={() => removeFromCart(item.id)}>
                    <Trash2 size={14} /> Remove
                  </button>
                )}
              </article>
            );
          })}
        </section>

        <aside className="dn-card sp-summary" aria-label="Order summary">
          <h3>Order summary</h3>

          {toFree > 0 && cart.lines.length > 0 && (
            <p className="sp-freebar">
              <Truck size={14} /> Add {formatPrice(toFree)} more to a single piece for free delivery.
            </p>
          )}

          <dl>
            <div><dt>Subtotal ({cart.count} {cart.count === 1 ? "item" : "items"})</dt><dd>{formatPrice(cart.subtotal)}</dd></div>
            <div><dt>Delivery</dt><dd>{cart.delivery ? formatPrice(cart.delivery) : "Free"}</dd></div>
            <div className="total"><dt>Total</dt><dd>{formatPrice(cart.total)}</dd></div>
          </dl>

          {cart.co2 > 0 && (
            <p className="sp-impact"><Leaf size={15} /> This order keeps about <b>{cart.co2} kg</b> of CO₂ out of new production.</p>
          )}

          <button type="button" className="dn-btn dn-btn--block sp-big" onClick={checkout} disabled={cart.lines.length === 0}>
            Proceed to checkout <ArrowRight size={16} />
          </button>
          <Link to="/user-marketplace" className="dn-link sp-center">Continue shopping</Link>

          <ul className="sp-mini">
            <li><ShieldCheck size={14} /> Secure checkout</li>
            <li><Truck size={14} /> {free ? `${free} with free delivery` : "Delivery to your address"}</li>
          </ul>
        </aside>
      </div>

      {toast}
    </div>
  );
}
