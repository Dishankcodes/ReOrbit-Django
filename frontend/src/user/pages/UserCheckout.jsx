import { ArrowLeft, Check, CreditCard, MapPin, ShieldCheck, ShoppingBag, Truck, ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { currentUser, formatPrice, getItemById } from "../data/mockData";
import "../styles/pages.css";

export default function UserCheckout() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const productId = params.get("productId");
  const requestedQuantity = Number(params.get("quantity")) || 1;
  const product = getItemById(productId);
  const [quantity, setQuantity] = useState(Math.max(1, requestedQuantity));
  const [placed, setPlaced] = useState(false);

  const subtotal = useMemo(
    () => (product ? product.price * quantity : 0),
    [product, quantity],
  );
  const delivery = subtotal >= 3000 ? 0 : 99;
  const total = subtotal + delivery;

  if (!product) {
    return (
      <div className="page checkout-page">
        <div className="checkout-empty card">
          <div className="checkout-empty-icon"><ShoppingBag size={26} /></div>
          <span className="eyebrow">CHECKOUT</span>
          <h2>Product not found</h2>
          <p>The item you selected is no longer available in this checkout.</p>
          <Link className="btn btn-primary" to="/user-marketplace">Back to marketplace</Link>
        </div>
      </div>
    );
  }

  if (placed) {
    return (
      <div className="page checkout-page">
        <section className="checkout-success card">
          <div className="checkout-success-icon"><Check size={28} /></div>
          <span className="eyebrow">ORDER CONFIRMED</span>
          <h2>Your order is on its way to a new orbit.</h2>
          <p>Your UI-only order confirmation has been created for <strong>{product.title}</strong>.</p>
          <div className="checkout-success-meta">
            <span>Order reference</span>
            <strong>RO-DEMO-{product.id.slice(0, 6).toUpperCase()}</strong>
          </div>
          <div className="hero-actions checkout-success-actions">
            <Link className="btn btn-primary" to="/user-orders">View my orders</Link>
            <Link className="btn btn-soft" to="/user-marketplace">Continue shopping</Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page checkout-page">
      <div className="checkout-back-row">
        <button type="button" className="checkout-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Back
        </button>
        <span>Secure UI checkout</span>
      </div>

      <div className="checkout-layout">
        <section>
          <div className="checkout-section card">
            <div className="checkout-section-head">
              <div><span className="eyebrow">DELIVERY</span><h3>Delivery address</h3></div>
              <span className="checkout-step">01</span>
            </div>
            <div className="checkout-address">
              <span className="checkout-icon"><MapPin size={17} /></span>
              <div><strong>{currentUser.name}</strong><p>{currentUser.city}, Gujarat · {currentUser.pincode}</p><small>{currentUser.email}</small></div>
              <button type="button">Change</button>
            </div>
          </div>

          <div className="checkout-section card">
            <div className="checkout-section-head">
              <div><span className="eyebrow">PAYMENT</span><h3>Payment method</h3></div>
              <span className="checkout-step">02</span>
            </div>
            <button type="button" className="payment-option active">
              <span className="checkout-icon"><CreditCard size={17} /></span>
              <span><strong>Card / UPI</strong><small>Demo payment selection for UI</small></span>
              <span className="payment-check"><Check size={13} /></span>
            </button>
            <button type="button" className="payment-option">
              <span className="checkout-icon"><ShoppingBag size={17} /></span>
              <span><strong>Cash on delivery</strong><small>Available for eligible orders</small></span>
            </button>
          </div>

          <div className="checkout-section card">
            <div className="checkout-section-head">
              <div><span className="eyebrow">ITEM</span><h3>Review your purchase</h3></div>
              <span className="checkout-step">03</span>
            </div>
            <div className="checkout-product">
              <img src={product.image} alt={product.title} />
              <div><span>{product.category}</span><h4>{product.title}</h4><p>Sold by {product.seller}</p><strong>{formatPrice(product.price)}</strong></div>
              <div className="checkout-qty"><button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button><strong>{quantity}</strong><button type="button" onClick={() => setQuantity((q) => Math.min(product.quantity || 10, q + 1))}>+</button></div>
            </div>
          </div>
        </section>

        <aside className="checkout-summary card">
          <span className="eyebrow">ORDER SUMMARY</span>
          <h3>Ready for another life?</h3>
          <div className="checkout-summary-product"><img src={product.image} alt="" /><div><strong>{product.title}</strong><span>{quantity} × {formatPrice(product.price)}</span></div></div>
          <div className="checkout-summary-lines"><div><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div><div><span>Delivery</span><strong>{delivery ? formatPrice(delivery) : "FREE"}</strong></div></div>
          <div className="checkout-total"><span>Total</span><strong>{formatPrice(total)}</strong></div>
          <button type="button" className="btn btn-primary checkout-place" onClick={() => setPlaced(true)}>Place demo order <ArrowRight size={14} className="checkout-arrow" /></button>
          <div className="checkout-trust"><ShieldCheck size={15} /><span>Protected checkout UI</span><Truck size={15} /><span>Impact-aware delivery</span></div>
        </aside>
      </div>
    </div>
  );
}
