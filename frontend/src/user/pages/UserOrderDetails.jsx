import { ArrowLeft, Check, MapPin, Package, Star, Truck } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { formatPrice, getItemById, getOrderById } from "../data/mockData";
import "../styles/pages.css";

export default function UserOrderDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const order = getOrderById(orderId);
  const product = order ? getItemById(order.productId) : null;

  if (!order) {
    return (
      <div className="page order-detail-page">
        <div className="checkout-empty card">
          <div className="checkout-empty-icon"><Package size={26} /></div>
          <span className="eyebrow">MY ORDERS</span>
          <h2>Order not found</h2>
          <p>We could not find the order you requested.</p>
          <Link className="btn btn-primary" to="/user-orders">Back to orders</Link>
        </div>
      </div>
    );
  }

  const steps = [
    ["Order placed", "Your order was confirmed", true],
    ["Processing", "Seller is preparing your item", true],
    ["In transit", "Package is moving to you", order.status === "In transit" || order.status === "Delivered"],
    ["Delivered", "Item reached its new home", order.status === "Delivered"],
  ];

  return (
    <div className="page order-detail-page">
      <div className="checkout-back-row">
        <button type="button" className="checkout-back" onClick={() => navigate(-1)}><ArrowLeft size={14} /> Back</button>
        <span>Order {order.id}</span>
      </div>

      <section className="order-detail-hero card">
        <div>
          <span className="eyebrow">ORDER CONFIRMED</span>
          <h2>{order.product}</h2>
          <p>Placed on {order.date} · {order.id}</p>
        </div>
        <span className={`status ${order.status.toLowerCase().replace(" ", "-")}`}>{order.status}</span>
      </section>

      <div className="order-detail-grid">
        <section className="card order-timeline-card">
          <div className="section-head"><div><span className="eyebrow">DELIVERY JOURNEY</span><h3>Order timeline</h3></div><Truck size={20} /></div>
          <div className="order-timeline">
            {steps.map(([title, text, done], index) => (
              <div className={`timeline-step ${done ? "done" : ""}`} key={title}>
                <span>{done ? <Check size={13} /> : index + 1}</span>
                <div><strong>{title}</strong><small>{text}</small></div>
              </div>
            ))}
          </div>
        </section>

        <section className="card order-detail-product">
          <span className="eyebrow">ITEM DETAILS</span>
          <div className="order-detail-item">
            <img src={order.image} alt={order.product} />
            <div><span>{product?.category || "Marketplace"}</span><h3>{order.product}</h3><p>Sold by {order.seller}</p><strong>{formatPrice(order.amount)}</strong></div>
          </div>
          <div className="order-detail-facts"><span><MapPin size={14} /> {product?.city || "India"}</span><span><Package size={14} /> Quantity 1</span><span><Star size={14} /> Review after delivery</span></div>
          <Link className="btn btn-soft" to={`/user-marketplace/product/${order.productId}`}>View product</Link>
        </section>
      </div>

      <section className="card order-address-card">
        <div><span className="eyebrow">DELIVERY ADDRESS</span><h3>{"Aarav Patel"}</h3><p>Ahmedabad, Gujarat · 380015</p></div>
        <div><span className="eyebrow">ESTIMATED DELIVERY</span><strong>{order.delivery}</strong><small>Updates are UI-only until backend tracking is connected.</small></div>
      </section>
    </div>
  );
}
