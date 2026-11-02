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

import { clearCart, removeFromCart, setCartQty, startCheckout, useCart } from "../../data/shopStore";
import { feeLabel, useCommerce } from "../../../shared/commerce";
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
  const commerce = useCommerce();
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
  /* Only ReMaker products can earn free delivery; the gap is for the closest one. */
  const gaps = cart.lines.filter((l) => l.item.sellerType === "remaker" && l.fee > 0).map((l) => commerce.freeDeliveryFrom - l.lineSubtotal);
  const toFree = gaps.length ? Math.max(0, Math.min(...gaps)) : 0;

  return (
    <div className="dn sp">
      <ShopNav />

      <header className="ushp-head">
        <div>
          <span className="dn-eyebrow">Almost yours</span>
          <h1>Your cart</h1>
          <p className="dn-muted">
            {cart.all.length} {cart.all.length === 1 ? "piece" : "pieces"} · review before you check out
          </p>
        </div>
        <button type="button" className="ushp-textbtn danger" onClick={() => { clearCart(); show("Cart cleared."); }}>
          <Trash2 size={15} /> Clear cart
        </button>
      </header>

      <div className="ushp-grid">
        <section className="ushp-lines" aria-label="Cart items">
          {cart.all.map((l) => {
            const { item } = l;
            const priced = cart.lines.find((x) => x.id === l.id);
            const remaker = item.sellerType === "remaker";
            return (
              <article key={l.id} className={`dn-card ushp-line ${l.unavailable ? "is-off" : ""}`}>
                <Link to={`/user-marketplace/product/${item.id}`} className="ushp-line-img">
                  <SafeImage src={item.image} alt={item.title} />
                </Link>

                <div className="ushp-line-main">
                  <span className="ushp-cat">
                    {item.category} · {item.condition} ·{" "}
                    {remaker ? <b><Sparkles size={11} /> ReMaker</b> : <b><BadgeCheck size={11} /> Community</b>}
                  </span>
                  <h3><Link to={`/user-marketplace/product/${item.id}`}>{item.title}</Link></h3>
                  <Link to={sellerPath(item)} className="dn-link ushp-seller">
                    {remaker ? "Made by" : "Sold by"} {item.seller}
                  </Link>

                  {l.unavailable ? (
                    <p className="ushp-warn"><AlertTriangle size={14} /> {item.reason} Remove it to continue.</p>
                  ) : (
                    <div className="ushp-line-ctrl">
                      <div className="ushp-qty" role="group" aria-label={`Quantity of ${item.title}`}>
                        <button type="button" onClick={() => setCartQty(item.id, l.qty - 1, item.available)} disabled={l.qty <= 1} aria-label="Decrease quantity"><Minus size={14} /></button>
                        <output>{l.qty}</output>
                        <button type="button" onClick={() => setCartQty(item.id, l.qty + 1, item.available)} disabled={l.qty >= item.available} aria-label="Increase quantity"><Plus size={14} /></button>
                      </div>
                      {item.available <= 2 && <span className="ushp-low">Only {item.available} left</span>}
                      <button type="button" className="ushp-textbtn danger" onClick={() => { removeFromCart(item.id); show("Removed from cart."); }}>
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                  )}
                </div>

                {!l.unavailable && priced && (
                  <div className="ushp-line-price">
                    <strong>{formatPrice(priced.lineSubtotal)}</strong>
                    <span>{formatPrice(item.price)} each</span>
                    <em>{priced.fee ? `+ ${formatPrice(priced.fee)} delivery` : "Free delivery"}</em>
                  </div>
                )}
                {l.unavailable && (
                  <button type="button" className="ushp-textbtn danger ushp-line-remove" onClick={() => removeFromCart(item.id)}>
                    <Trash2 size={14} /> Remove
                  </button>
                )}
              </article>
            );
          })}
        </section>

        <aside className="dn-card ushp-summary" aria-label="Order summary">
          <h3>Order summary</h3>

          {toFree > 0 && cart.lines.length > 0 && (
            <p className="ushp-freebar">
              <Truck size={14} /> Add {formatPrice(toFree)} more to a ReMaker piece for free delivery.
            </p>
          )}

          <dl>
            <div><dt>Subtotal ({cart.count} {cart.count === 1 ? "item" : "items"})</dt><dd>{formatPrice(cart.subtotal)}</dd></div>
            <div><dt>Delivery</dt><dd>{cart.delivery ? formatPrice(cart.delivery) : "Free"}</dd></div>
            {cart.platformFee > 0 && <div><dt>{feeLabel()}</dt><dd>{formatPrice(cart.platformFee)}</dd></div>}
            <div className="total"><dt>Total</dt><dd>{formatPrice(cart.total)}</dd></div>
          </dl>

          {cart.co2 > 0 && (
            <p className="ushp-impact"><Leaf size={15} /> This order keeps about <b>{cart.co2} kg</b> of CO₂ out of new production.</p>
          )}

          <button type="button" className="dn-btn dn-btn--block ushp-big" onClick={checkout} disabled={cart.lines.length === 0}>
            Proceed to checkout <ArrowRight size={16} />
          </button>
          <Link to="/user-marketplace" className="dn-link ushp-center">Continue shopping</Link>

          <ul className="ushp-mini">
            <li><ShieldCheck size={14} /> Secure checkout</li>
            <li><Truck size={14} /> {free ? `${free} with free delivery` : "Delivery to your address"}</li>
          </ul>
        </aside>
      </div>

      {toast}
    </div>
  );
}
