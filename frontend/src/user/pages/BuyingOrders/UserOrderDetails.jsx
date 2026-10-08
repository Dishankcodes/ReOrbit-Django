import React from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Package,
  MapPin,
  CreditCard,
  Truck,
  Clock3,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import "../../css/UserBuyingOrders-css/UserOrderDetails.css";

const orders = {
  ROD12548: {
    id: "ROD12548",
    product: "Reclaimed Wooden Chair",
    category: "Furniture",
    description: "Restored solid-wood chair with a natural finish.",
    price: 2800,
    quantity: 1,
    date: "12 Aug 2026",
    status: "Delivered",
    image:
      "https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=1000&q=80",
  },

  ROD12549: {
    id: "ROD12549",
    product: "Recycled Table Lamp",
    category: "Home Decor",
    description: "Upcycled table lamp crafted from reclaimed materials.",
    price: 1100,
    quantity: 1,
    date: "16 Aug 2026",
    status: "Shipped",
    image:
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1000&q=80",
  },

  ROD12550: {
    id: "ROD12550",
    product: "Vintage Canvas Bag",
    category: "Accessories",
    description: "Hand-restored canvas bag designed for everyday use.",
    price: 1300,
    quantity: 1,
    date: "19 Aug 2026",
    status: "Processing",
    image:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1000&q=80",
  },
};

const timeline = [
  {
    title: "Order placed",
    description: "Your order has been successfully created.",
    date: "12 Aug · 10:30 AM",
    icon: Check,
    active: true,
  },
  {
    title: "Packed",
    description: "The seller prepared your item for shipment.",
    date: "12 Aug · 02:45 PM",
    icon: Package,
    active: true,
  },
  {
    title: "Shipped",
    description: "Your package is on its way.",
    date: "13 Aug · 09:00 AM",
    icon: Truck,
    active: true,
  },
  {
    title: "Out for delivery",
    description: "Your order is with the delivery partner.",
    date: "14 Aug · 08:10 AM",
    icon: MapPin,
    active: true,
  },
  {
    title: "Delivered",
    description: "Package delivered successfully.",
    date: "14 Aug · 01:35 PM",
    icon: CheckCircle2,
    active: true,
  },
];

export default function UserOrderDetails() {
  const navigate = useNavigate();
  const { orderId } = useParams();

  const order = orders[orderId] || orders.ROD12548;

  const subtotal = order.price * order.quantity;
  const delivery = 50;
  const total = subtotal + delivery;

  return (
    <section className="user-order-details">
      <div className="order-details-top">
        <button
          type="button"
          className="order-details-back"
          onClick={() => navigate("/user-orders")}
        >
          <ArrowLeft size={14} />
          Back to Orders
        </button>

        <span className="order-details-top-status">
          <CheckCircle2 size={13} />
          {order.status}
        </span>
      </div>

      <div className="order-details-hero">
        <small>Order #{order.id}</small>

        <h1>Your order journey</h1>

        <p>
          Everything about this purchase, from payment to delivery, in one
          place.
        </p>
      </div>

      <div className="order-details-layout">
        <div>
          <article className="order-details-card">
            <div className="order-details-card-header">
              <div>
                <span>Purchased item</span>
                <h2>Order summary</h2>
              </div>

              <span>{order.date}</span>
            </div>

            <div className="order-detail-product">
              <div className="order-detail-product-image">
                <img src={order.image} alt={order.product} />
              </div>

              <div>
                <h3>{order.product}</h3>

                <p>
                  {order.category} · Quantity {order.quantity}
                </p>

                <p>{order.description}</p>
              </div>

              <strong className="order-detail-product-price">
                ₹{order.price.toLocaleString("en-IN")}
              </strong>
            </div>
          </article>

          <article className="order-details-card">
            <div className="order-details-card-header">
              <div>
                <span>Live journey</span>
                <h2>Order tracking</h2>
              </div>

              <Truck size={19} />
            </div>

            <div className="order-timeline">
              {timeline.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    className={`order-timeline-item ${
                      item.active ? "completed" : ""
                    }`}
                    key={item.title}
                  >
                    <div className="order-timeline-dot">
                      <Icon size={14} />
                    </div>

                    <div className="order-timeline-content">
                      <strong>{item.title}</strong>

                      <p>{item.description}</p>

                      <p>{item.date}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        </div>

        <aside>
          <article className="order-details-card">
            <div className="order-details-card-header">
              <div>
                <span>Payment</span>
                <h2>Price details</h2>
              </div>

              <CreditCard size={18} />
            </div>

            <div className="order-summary-list">
              <div className="order-summary-row">
                <span>Item price</span>
                <strong>₹{subtotal.toLocaleString("en-IN")}</strong>
              </div>

              <div className="order-summary-row">
                <span>Delivery</span>
                <strong>₹{delivery}</strong>
              </div>

              <div className="order-summary-total">
                <span>Total paid</span>

                <strong>₹{total.toLocaleString("en-IN")}</strong>
              </div>
            </div>

            <div className="order-address">
              <span className="order-address-label">Delivery address</span>

              <strong>Dishank Prajapati</strong>

              <p>
                82, Sunrise Apartment,
                <br />
                Ahmedabad, Gujarat 380015
              </p>
            </div>
          </article>

          <article className="order-details-card">
            <div className="order-details-card-header">
              <div>
                <span>Need assistance?</span>
                <h2>Order support</h2>
              </div>

              <Clock3 size={18} />
            </div>

            <p
              style={{
                marginTop: 14,
                color: "#6b756d",
                fontSize: 8,
                lineHeight: 1.7,
              }}
            >
              Need help with this order? Visit Help & FAQ or contact ReOrbit
              support.
            </p>

            <button
              type="button"
              className="order-view-btn"
              style={{ marginTop: 14 }}
              onClick={() => navigate("/user-help")}
            >
              Open Help & FAQ
            </button>
          </article>
        </aside>
      </div>
    </section>
  );
}
