import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  MapPin,
  CalendarDays,
  Star,
  Store,
  ExternalLink,
  UserX,
} from "lucide-react";

import { useSeller, useCart } from "../../data/shopStore";
import { formatDate } from "../../utils/format";
import ProductCard from "./components/ProductCard";
import ShopNav from "./components/ShopNav";
import UserAvatar from "../../components/ui/UserAvatar";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import useToast from "../../components/ui/useToast";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/users/AdminUserProfile.css";
import "../../css/shop/AdminShop.css";

/* A seller's shop: their profile and everything they have listed. */
export default function AdminShopSeller() {
  const { id } = useParams();
  const navigate = useNavigate();
  const seller = useSeller(id);
  const cart = useCart();
  const { toast, toastNode } = useToast();
  const [tab, setTab] = useState("live");

  if (!seller) {
    return (
      <div className="au-page sh-page">
        <ShopNav />
        <section className="au-panel">
          <EmptyState
            icon={UserX}
            title="Seller not found"
            text="This seller has nothing listed on the marketplace."
            action={
              <button
                type="button"
                className="ad-btn ad-btn-primary ad-btn-sm"
                onClick={() => navigate("/admin-shop")}
              >
                <ArrowLeft size={14} /> Back to shop
              </button>
            }
          />
        </section>
      </div>
    );
  }
  const { owner, live, products, rating, reviews } = seller;
  const isRm = owner.role === "ReMaker";
  const unavailable = products.filter((p) => !p.purchasable);
  const list = tab === "live" ? live : unavailable;

  return (
    <div className="au-page sh-page">
      <ShopNav />
      <nav className="aup-crumbs" aria-label="Breadcrumb">
        <Link to="/admin-shop" className="aup-back">
          <ArrowLeft size={15} /> Shop
        </Link>
        <ChevronRight size={14} />
        <span aria-current="page">{owner.name}</span>
      </nav>

      <section className="sh-shophero">
        <UserAvatar
          name={owner.name}
          src={owner.image}
          size={92}
          rounded="26px"
        />
        <div className="sh-shophero-info">
          <div className="sh-seller-name">
            <h2>{owner.name}</h2>
            <span className={`ap-role ${isRm ? "rm" : ""}`}>{owner.role}</span>
            <StatusBadge status={owner.status} />
          </div>
          {isRm && <span className="sh-handle">“{owner.handle}”</span>}
          <ul className="sh-seller-meta">
            <li>
              <MapPin size={14} /> {owner.city}
            </li>
            <li>
              <CalendarDays size={14} /> Member since {formatDate(owner.since)}
            </li>
            {rating ? (
              <li>
                <Star size={14} /> {rating} · {reviews.length} review
                {reviews.length === 1 ? "" : "s"}
              </li>
            ) : null}
          </ul>
        </div>
        <div className="sh-shophero-stats">
          <div>
            <strong>{live.length}</strong>
            <span>Live listings</span>
          </div>
          <div>
            <strong>{products.length}</strong>
            <span>All listings</span>
          </div>
          <Link to={owner.path} className="ad-btn ad-btn-ghost ad-btn-sm">
            <ExternalLink size={14} /> Admin profile
          </Link>
        </div>
      </section>

      <div className="sh-seg" role="tablist" aria-label="Listings">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "live"}
          className={tab === "live" ? "on" : ""}
          onClick={() => setTab("live")}
        >
          Available <em>{live.length}</em>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "off"}
          className={tab === "off" ? "on" : ""}
          onClick={() => setTab("off")}
        >
          Not available <em>{unavailable.length}</em>
        </button>
      </div>

      {list.length === 0 ? (
        <section className="au-panel">
          <EmptyState
            icon={Store}
            title={
              tab === "live" ? "Nothing to buy right now" : "No hidden listings"
            }
            text={
              tab === "live"
                ? "This seller has no live listings at the moment."
                : "Every listing from this seller is available."
            }
          />
        </section>
      ) : (
        <div className="sh-grid">
          {list.map((p) =>
            tab === "live" ? (
              <ProductCard
                key={p.id}
                product={p}
                inCart={cart.all.some((l) => l.id === p.id)}
                onAdded={(x) => toast(`${x.title} added to cart`)}
              />
            ) : (
              <article key={p.id} className="sh-card off">
                <Link
                  to={`/admin-shop/product/${p.id}`}
                  className="sh-card-img"
                >
                  <img src={p.image} alt={p.title} />
                </Link>
                <div className="sh-card-body">
                  <span className="sh-cat">{p.category}</span>
                  <h3>
                    <Link to={`/admin-shop/product/${p.id}`}>{p.title}</Link>
                  </h3>
                  <StatusBadge
                    status={
                      p.state === "pending"
                        ? "Pending"
                        : p.state === "rejected"
                          ? "Rejected"
                          : p.available <= 0
                            ? "Sold"
                            : "Inactive"
                    }
                  />
                </div>
              </article>
            ),
          )}
        </div>
      )}
      {toastNode}
    </div>
  );
}
