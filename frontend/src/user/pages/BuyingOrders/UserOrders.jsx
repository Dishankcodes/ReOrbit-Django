import React, { useMemo, useState } from "react";
import {
  Search,
  Package,
  ChevronRight,
  ShoppingBag,
  Truck,
  CheckCircle2,
  Clock3,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import "../../css/UserBuyingOrders-css/UserOrders.css";

const initialOrders = [
  {
    id: "ROD12548",
    productId: 1,
    product: "Reclaimed Wooden Chair",
    category: "Furniture",
    description: "Restored solid-wood chair with a natural finish.",
    price: 2800,
    quantity: 1,
    date: "12 Aug 2026",
    status: "Delivered",
    image:
      "https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "ROD12549",
    productId: 2,
    product: "Recycled Table Lamp",
    category: "Home Decor",
    description: "Upcycled table lamp crafted from reclaimed materials.",
    price: 1100,
    quantity: 1,
    date: "16 Aug 2026",
    status: "Shipped",
    image:
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "ROD12550",
    productId: 3,
    product: "Vintage Canvas Bag",
    category: "Accessories",
    description: "Hand-restored canvas bag designed for everyday use.",
    price: 1300,
    quantity: 1,
    date: "19 Aug 2026",
    status: "Processing",
    image:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "ROD12551",
    productId: 4,
    product: "Upcycled Ceramic Vase",
    category: "Decor",
    description: "Hand-finished ceramic vase given a second life.",
    price: 850,
    quantity: 2,
    date: "21 Aug 2026",
    status: "Delivered",
    image:
      "https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&w=900&q=80",
  },
];

const tabs = ["All", "Processing", "Shipped", "Delivered"];

function StatusIcon({ status }) {
  if (status === "Delivered") {
    return <CheckCircle2 size={13} />;
  }

  if (status === "Shipped") {
    return <Truck size={13} />;
  }

  return <Clock3 size={13} />;
}

export default function UserOrders() {
  const navigate = useNavigate();

  const [orders] = useState(initialOrders);
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesTab = activeTab === "All" || order.status === activeTab;

      const matchesSearch =
        !query ||
        order.id.toLowerCase().includes(query) ||
        order.product.toLowerCase().includes(query) ||
        order.category.toLowerCase().includes(query);

      return matchesTab && matchesSearch;
    });
  }, [orders, activeTab, search]);

  const summary = {
    all: orders.length,
    processing: orders.filter((o) => o.status === "Processing").length,
    shipped: orders.filter((o) => o.status === "Shipped").length,
    delivered: orders.filter((o) => o.status === "Delivered").length,
  };

  return (
    <section className="user-orders-page">
      <div className="orders-header">
        <div className="orders-header-left">
          <span className="orders-eyebrow">Your purchase journey</span>

          <h1>My Orders</h1>

          <p className="orders-subtitle">
            Keep track of everything you have purchased through ReOrbit, from
            processing to successful delivery.
          </p>
        </div>

        <div className="orders-summary">
          <div className="orders-summary-card">
            <span>Total</span>
            <strong>{summary.all}</strong>
          </div>

          <div className="orders-summary-card">
            <span>Active</span>
            <strong>{summary.processing + summary.shipped}</strong>
          </div>

          <div className="orders-summary-card">
            <span>Delivered</span>
            <strong>{summary.delivered}</strong>
          </div>
        </div>
      </div>

      <div className="orders-toolbar">
        <div className="orders-tabs">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={activeTab === tab ? "active" : ""}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <label className="orders-search">
          <Search size={14} />

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search orders..."
          />
        </label>
      </div>

      {filteredOrders.length > 0 ? (
        <div className="orders-list">
          {filteredOrders.map((order) => (
            <article className="order-card" key={order.id}>
              <div className="order-card-header">
                <div>
                  <span className="order-id">Order #{order.id}</span>

                  <span className="order-date">{order.date}</span>
                </div>

                <span className="order-status">
                  <StatusIcon status={order.status} />
                  {order.status}
                </span>
              </div>

              <div className="order-card-body">
                <div className="order-card-image">
                  <img src={order.image} alt={order.product} />
                </div>

                <div className="order-card-info">
                  <span className="order-category">{order.category}</span>

                  <h3>{order.product}</h3>

                  <p>
                    {order.description} · Qty {order.quantity}
                  </p>
                </div>

                <strong className="order-price">
                  ₹{order.price.toLocaleString("en-IN")}
                </strong>

                <button
                  type="button"
                  className="order-view-btn"
                  onClick={() => navigate(`/user-orders/${order.id}`)}
                >
                  View details
                  <ChevronRight size={13} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="orders-empty">
          <div className="orders-empty-icon">
            <Package size={27} />
          </div>

          <h3>No orders found</h3>

          <p>
            We could not find an order matching your current filter or search.
          </p>

          <Link to="/user-marketplace">Explore Marketplace</Link>
        </div>
      )}
    </section>
  );
}
