import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ChevronRight,
  ArrowLeft,
  Heart,
  ShoppingCart,
  Zap,
  Minus,
  Plus,
  ShieldCheck,
  Truck,
  RotateCcw,
  MapPin,
  CalendarDays,
  Star,
  Store,
  ExternalLink,
  PackageX,
  Eye,
  BadgeCheck,
  Sparkles,
  Info,
} from "lucide-react";

import {
  useShopProduct,
  useShopProducts,
  useSeller,
  addToCart,
  startCheckout,
  toggleWishlist,
  useWishlist,
  useCart,
  deliveryFee,
} from "../../data/shopStore";
import { formatDate, formatINR } from "../../utils/format";
import ProductImg from "./components/ProductImg";
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

const stars = (n) =>
  Array.from({ length: 5 }, (_, i) => (
    <Star
      key={i}
      size={14}
      className={i < Math.round(n) ? "on" : ""}
      fill={i < Math.round(n) ? "currentColor" : "none"}
    />
  ));

function whyNot(p) {
  if (!p.sellerOk)
    return `The seller account is ${p.owner.status.toLowerCase()}, so this listing cannot be bought.`;
  if (p.state === "pending")
    return "This item is still waiting for verification.";
  if (p.state === "rejected")
    return "This item was rejected and is not on the marketplace.";
  if (p.available <= 0 && p.state === "live")
    return "This listing is sold out.";
  return "This listing is not live on the marketplace right now.";
}

export default function AdminShopProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const p = useShopProduct(id);
  const seller = useSeller(p?.owner.id);
  const all = useShopProducts();
  const cart = useCart();
  const saved = useWishlist().has(id);
  const { toast, toastNode } = useToast();
  const [qty, setQty] = useState(1);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    setQty(1);
  }, [id]);

  const more = useMemo(
    () =>
      p ? (seller?.live || []).filter((x) => x.id !== p.id).slice(0, 4) : [],
    [p, seller],
  );
  const similar = useMemo(
    () =>
      p
        ? all
            .filter(
              (x) =>
                x.category === p.category &&
                x.id !== p.id &&
                x.owner.id !== p.owner.id,
            )
            .slice(0, 4)
        : [],
    [p, all],
  );

  if (!p) {
    return (
      <div className="au-page sh-page">
        <ShopNav />
        <section className="au-panel">
          <EmptyState
            icon={PackageX}
            title="Product not found"
            text="This listing does not exist or the link is wrong."
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

  const isRm = p.type === "product";
  const inCart = cart.all.find((l) => l.id === p.id);
  const max = Math.max(1, p.available);
  const lineSub = p.price * qty;
  const fee = deliveryFee(p, lineSub);
  const eta = new Date(
    new Date("2026-10-20T13:00:00").getTime() + (isRm ? 4 : 5) * 86400000,
  );

  const add = () => {
    addToCart(p.id, qty, p.available);
    toast(`${p.title} added to cart`);
  };
  const buyNow = () => {
    startCheckout([{ id: p.id, qty }], "buy");
    navigate("/admin-shop/checkout");
  };

  return (
    <div className="au-page sh-page">
      <ShopNav />
      <nav className="aup-crumbs" aria-label="Breadcrumb">
        <Link to="/admin-shop" className="aup-back">
          <ArrowLeft size={15} /> Shop
        </Link>
        <ChevronRight size={14} />
        <span>{p.category}</span>
        <ChevronRight size={14} />
        <span aria-current="page">{p.title}</span>
      </nav>

      {!p.purchasable && (
        <div className="sh-notice" role="status">
          <Info size={16} />{" "}
          <div>
            <strong>Not available to buy.</strong> <span>{whyNot(p)}</span>
          </div>
        </div>
      )}

      <div className="sh-detail">
        {/* ---------- photo ---------- */}
        <div className="sh-photo">
          <ProductImg src={p.image} alt={p.title} />
          <span className={`sh-tag lg ${isRm ? "rm" : "item"}`}>
            {isRm ? (
              <>
                <Sparkles size={13} /> ReMaker product
              </>
            ) : (
              <>
                <BadgeCheck size={13} /> Community item
              </>
            )}
          </span>
          <div className="sh-photo-meta">
            <span>
              <Eye size={13} /> {p.views} views
            </span>
            <span>
              <Heart size={13} /> {p.wishlisted} saved
            </span>
          </div>
        </div>

        {/* ---------- buy box ---------- */}
        <div className="sh-buy">
          <span className="sh-cat">
            {p.category}
            {p.condition ? ` · ${p.condition} condition` : ""}
          </span>
          <h1>{p.title}</h1>
          {isRm && seller?.rating ? (
            <div className="sh-rating">
              {stars(seller.rating)}
              <span>
                {seller.rating} from {seller.reviews.length} review
                {seller.reviews.length === 1 ? "" : "s"}
              </span>
            </div>
          ) : null}
          <div className="sh-price-row">
            <strong>{formatINR(p.price)}</strong>
            <span className={`sh-stock ${p.available <= 2 ? "low" : ""}`}>
              {p.available > 0
                ? p.available <= 2
                  ? `Only ${p.available} left`
                  : `${p.available} in stock`
                : "Out of stock"}
            </span>
          </div>
          <p className="sh-desc">{p.description}</p>

          <dl className="sh-facts">
            <div>
              <dt>Category</dt>
              <dd>{p.category}</dd>
            </div>
            <div>
              <dt>{isRm ? "Made by" : "Condition"}</dt>
              <dd>{isRm ? p.owner.name : p.condition}</dd>
            </div>
            <div>
              <dt>Listed on</dt>
              <dd>{formatDate(p.posted_at)}</dd>
            </div>
            <div>
              <dt>Listing ID</dt>
              <dd className="aup-mono">{p.id}</dd>
            </div>
          </dl>

          <div className="sh-qty-row">
            <div className="sh-qty" role="group" aria-label="Quantity">
              <button
                type="button"
                onClick={() => setQty((n) => Math.max(1, n - 1))}
                disabled={qty <= 1 || !p.purchasable}
                aria-label="Decrease quantity"
              >
                <Minus size={15} />
              </button>
              <output aria-live="polite">{qty}</output>
              <button
                type="button"
                onClick={() => setQty((n) => Math.min(max, n + 1))}
                disabled={qty >= max || !p.purchasable}
                aria-label="Increase quantity"
              >
                <Plus size={15} />
              </button>
            </div>
            <span className="sh-qty-total">
              Subtotal <strong>{formatINR(lineSub)}</strong>
            </span>
          </div>

          <div className="sh-cta">
            <button
              type="button"
              className="ad-btn ad-btn-primary sh-big"
              onClick={buyNow}
              disabled={!p.purchasable}
            >
              <Zap size={16} /> Buy now
            </button>
            <button
              type="button"
              className="ad-btn ad-btn-ghost sh-big"
              onClick={add}
              disabled={!p.purchasable}
            >
              <ShoppingCart size={16} />{" "}
              {inCart ? "Add one more" : "Add to cart"}
            </button>
            <button
              type="button"
              className={`sh-heart static ${saved ? "on" : ""}`}
              aria-pressed={saved}
              aria-label={saved ? "Remove from saved" : "Save for later"}
              onClick={() => toggleWishlist(p.id)}
            >
              <Heart size={18} fill={saved ? "currentColor" : "none"} />
            </button>
          </div>
          {inCart && (
            <Link to="/admin-shop/cart" className="sh-link">
              {inCart.qty} already in your cart · View cart
            </Link>
          )}

          <ul className="sh-trust">
            <li>
              <Truck size={17} />
              <div>
                <strong>
                  {fee ? `Delivery ${formatINR(fee)}` : "Free delivery"}
                </strong>
                <span>Arrives by {formatDate(eta)}</span>
              </div>
            </li>
            <li>
              <ShieldCheck size={17} />
              <div>
                <strong>Secure payment</strong>
                <span>No platform fee for admin</span>
              </div>
            </li>
            <li>
              <RotateCcw size={17} />
              <div>
                <strong>7-day returns</strong>
                <span>If it is not as described</span>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* ---------- seller profile ---------- */}
      <section className="sh-seller" aria-label="Seller">
        <header className="sh-sec-head">
          <div>
            <h3>About the seller</h3>
            <p>Who you are buying from.</p>
          </div>
        </header>
        <div className="sh-seller-body">
          <div className="sh-seller-main">
            <UserAvatar
              name={p.owner.name}
              src={p.owner.image}
              size={64}
              rounded="18px"
            />
            <div>
              <div className="sh-seller-name">
                <strong>{p.owner.name}</strong>
                <span className={`ap-role ${isRm ? "rm" : ""}`}>
                  {p.owner.role}
                </span>
                <StatusBadge status={p.owner.status} />
              </div>
              {isRm && <span className="sh-handle">“{p.owner.handle}”</span>}
              <ul className="sh-seller-meta">
                <li>
                  <MapPin size={14} /> {p.owner.city}
                </li>
                <li>
                  <CalendarDays size={14} /> Member since{" "}
                  {formatDate(p.owner.since)}
                </li>
                <li>
                  <Store size={14} /> {seller.live.length} live listing
                  {seller.live.length === 1 ? "" : "s"}
                </li>
                {seller.rating ? (
                  <li>
                    <Star size={14} /> {seller.rating} rating
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
          <div className="sh-seller-actions">
            <Link
              to={`/admin-shop/seller/${p.owner.id}`}
              className="ad-btn ad-btn-primary ad-btn-sm"
            >
              <Store size={14} /> Visit shop
            </Link>
            <Link to={p.owner.path} className="ad-btn ad-btn-ghost ad-btn-sm">
              <ExternalLink size={14} /> Admin profile
            </Link>
            <Link
              to={`/admin-products/${p.id}`}
              className="ad-btn ad-btn-ghost ad-btn-sm"
            >
              <ExternalLink size={14} /> Listing in Products
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- reviews ---------- */}
      {p.reviews.length > 0 && (
        <section className="sh-block" aria-label="Reviews">
          <header className="sh-sec-head">
            <div>
              <h3>Buyer reviews</h3>
              <p>What people said about this product.</p>
            </div>
          </header>
          <ul className="sh-reviews">
            {p.reviews.map((r, i) => (
              <li key={i}>
                <div className="sh-rating">{stars(r.rating)}</div>
                <p>“{r.text}”</p>
                <span>{r.reviewer || r.by || "A buyer"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {more.length > 0 && (
        <section className="sh-block" aria-label="More from this seller">
          <header className="sh-sec-head">
            <div>
              <h3>More from {p.owner.name}</h3>
            </div>
            <Link to={`/admin-shop/seller/${p.owner.id}`} className="sh-link">
              See all
            </Link>
          </header>
          <div className="sh-grid compact">
            {more.map((x) => (
              <ProductCard
                key={x.id}
                product={x}
                inCart={cart.all.some((l) => l.id === x.id)}
                onAdded={(y) => toast(`${y.title} added to cart`)}
              />
            ))}
          </div>
        </section>
      )}
      {similar.length > 0 && (
        <section className="sh-block" aria-label="Similar products">
          <header className="sh-sec-head">
            <div>
              <h3>Similar in {p.category}</h3>
            </div>
          </header>
          <div className="sh-grid compact">
            {similar.map((x) => (
              <ProductCard
                key={x.id}
                product={x}
                inCart={cart.all.some((l) => l.id === x.id)}
                onAdded={(y) => toast(`${y.title} added to cart`)}
              />
            ))}
          </div>
        </section>
      )}
      {toastNode}
    </div>
  );
}
