import React, { useEffect, useMemo, useState } from "react";
import { usePageTitle } from "../../../shared/pageMeta";
import { idFrom, personPath, productPath } from "../../../shared/slug";
import useReadableAddress from "../../../shared/useReadableAddress";
import { useNavigate, useParams, Link } from "../../../shared/portalRouter";
import { trackProductView } from "../../../shared/trafficSource";
import {
  BadgeCheck,
  Boxes,
  ChevronRight,
  Eye,
  Heart,
  Leaf,
  MapPin,
  Minus,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Star,
  Zap,
  PackageX,
  Sparkles,
  RotateCcw,
  Ban,
} from "lucide-react";

import { useGoBack } from "../../../shared/backNav";
import {
  addToCart,
  startCheckout,
  useCartCount,
  useInCart,
  useShopItem,
} from "../../data/shopStore";
import { useWishlist } from "../../data/wishlistStore";
import { useLiveMarketplace } from "../../data/liveMarketplace";
import {
  getItemById,
  getProductsBySeller,
  formatPrice,
} from "../../../data/marketplaceData";
import ReportButton from "../../../shared/components/ReportButton";
import {
  reviewReportFiler,
  useProductReviews,
} from "../../../shared/hooks/usePublicReviews";
import { useUserComplaintFiler } from "../../../shared/complaints";
import SafeImage from "../../components/ui/SafeImage";
import { apiRequest } from "../../../api/api";
import MessageButton from "../../components/ui/MessageButton";
import { sellerChat } from "../../data/messageTargets";

import "../../css/shared/ui-base.css";
import "../../css/marketplace-css/UserProductDetailsV2.css";

import { PageLoader } from "../../../shared/components/Spinner";
const Stars = ({ rating = 0 }) => (
  <span className="pd-stars" aria-label={`${rating} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((s) => (
      <Star
        key={s}
        size={13}
        fill={s <= Math.round(rating) ? "currentColor" : "none"}
      />
    ))}
  </span>
);

export default function UserProductDetails() {
  const { goBack, canGoBack, prevLabel } = useGoBack("/user-marketplace");
  const params = useParams();
  const rawProduct = params.productId ?? params.id;
  const productId = idFrom(rawProduct); // "teak-table-RPR-1001" -> "RPR-1001"
  const navigate = useNavigate();
  const live = useLiveMarketplace(); // makes sure live listings are loaded when this page is opened directly
  const item = getItemById(productId);
  usePageTitle(item?.title);
  useReadableAddress(rawProduct, item ? productPath(item.id, item.title) : "");
  const wish = useWishlist();
  const stock = useShopItem(productId, live.version);
  const cartCount = useCartCount();
  const inCart = useInCart(productId);
  const fileComplaint = useUserComplaintFiler();
  const [tab, setTab] = useState("details");
  const [qty, setQty] = useState(1);
  const [toast, setToast] = useState(false);
  /* every photo of this product (the card list only carries the cover); click one to see it full size */
  const [photos, setPhotos] = useState([]);
  const [photoIndex, setPhotoIndex] = useState(0);
  useEffect(() => {
    let active = true;
    setPhotos([]);
    setPhotoIndex(0);
    apiRequest(`/marketplace/${encodeURIComponent(productId)}/`, {
      auth: false,
    })
      .then((r) => {
        const list = (r.data?.product?.images || [])
          .map((i) => i.url)
          .filter(Boolean);
        if (active) setPhotos(list);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [productId]);

  useEffect(() => {
    setQty(1);
    setTab("details");
  }, [productId]);

  /* counts one view for the ReMaker's Analytics page (their own views are ignored by the server) */
  useEffect(() => {
    if (item?.id) trackProductView(item.id);
  }, [item?.id]);

  const { reviews, summary: reviewSummary } = useProductReviews(item?.id);
  const related = useMemo(
    () =>
      item
        ? getProductsBySeller(item.sellerId)
            .filter((p) => p.id !== item.id)
            .slice(0, 4)
        : [],
    [item],
  );

  if (!item && !live.ready)
    return (
      <div className="dn pd">
        <PageLoader label="Loading product…" />
      </div>
    );

  if (!item) {
    return (
      <div className="dn pd">
        <div className="pd-missing">
          <PackageX size={34} />
          <h1>Product not found</h1>
          <p>
            This piece may have moved to another orbit or is no longer
            available.
          </p>
          <button
            type="button"
            className="dn-btn"
            onClick={() => navigate("/user-marketplace")}
          >
            Back to marketplace
          </button>
        </div>
      </div>
    );
  }

  const isMaker = item.sellerType === "remaker";
  const isStore = item.sellerType === "admin";
  const sellerLabel = isMaker
    ? "ReMaker"
    : isStore
      ? "ReOrbit store"
      : "Community seller";
  const listedOn = String(item.listedDate).includes("T")
    ? new Date(item.listedDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : item.listedDate;
  const liked = wish.has(productId);
  const buyable = Boolean(stock?.purchasable);
  const maxQty = Math.max(1, stock?.available || 1);
  const sellerPath = personPath(isMaker ? "remaker" : "user", item.sellerId, item.seller);
  /* Where the seller card goes: a ReMaker to their studio, a community seller to their
     profile, and ReOrbit itself to everything ReOrbit sells. */
  const sellerHref = isStore ? "/user-marketplace?source=admin" : sellerPath;
  const sellerCta = isMaker
    ? "View ReMaker profile"
    : isStore
      ? "See ReOrbit listings"
      : "View seller profile";
  const sellerLinked = isStore || Boolean(item.sellerId);
  const SellerCard = sellerLinked ? Link : "section";
  const sellerProps = sellerLinked
    ? {
        to: sellerHref,
        className: "pd-seller pd-seller--link",
        "aria-label": `${sellerCta}: ${item.seller}`,
      }
    : { className: "pd-seller" };

  const addCart = () => {
    addToCart(item.id, qty, stock.available);
    setToast(true);
    window.clearTimeout(window.__reorbitCartTimer);
    window.__reorbitCartTimer = window.setTimeout(() => setToast(false), 2600);
  };
  const buyNow = () => {
    startCheckout([{ id: item.id, qty }], "buy");
    navigate("/user-checkout");
  };

  return (
    <div className="dn pd">
      <nav className="pd-top" aria-label="Breadcrumb">
        <button type="button" className="pd-back" onClick={goBack}>
          ← {canGoBack ? `Back to ${prevLabel}` : "Marketplace"}
        </button>
        <span className="pd-crumbs">
          <Link to="/user-marketplace">Marketplace</Link> / {item.category} /{" "}
          <b>{item.title}</b>
        </span>
        <button
          type="button"
          className="pd-cartlink"
          onClick={() => navigate("/user-cart")}
        >
          <ShoppingCart size={15} /> Cart {cartCount > 0 && <b>{cartCount}</b>}
        </button>
      </nav>

      <section className="pd-hero">
        <div className="pd-media" data-gallery>
          <div className="pd-gallery">
            <SafeImage
              src={photos[photoIndex] || item.image}
              alt={item.title}
              title="Click to see it full size"
            />
            <span className={`pd-type ${isMaker ? "maker" : ""}`}>
              {isMaker ? (
                <>
                  <Sparkles size={12} /> ReMaker piece
                </>
              ) : isStore ? (
                <>
                  <BadgeCheck size={12} /> ReOrbit store
                </>
              ) : (
                <>
                  <Boxes size={12} /> Community item
                </>
              )}
            </span>
            <button
              type="button"
              className={`pd-heart ${liked ? "on" : ""}`}
              aria-pressed={liked}
              aria-label={liked ? "Remove from wishlist" : "Save to wishlist"}
              onClick={() => wish.toggle(productId)}
            >
              <Heart size={18} fill={liked ? "currentColor" : "none"} />
            </button>
          </div>
          {photos.length > 1 && (
            <div className="pd-thumbs" role="list" aria-label="Photos">
              {photos.map((src, i) => (
                <button
                  type="button"
                  role="listitem"
                  key={src}
                  className={i === photoIndex ? "on" : ""}
                  aria-label={`Show photo ${i + 1}`}
                  onClick={() => setPhotoIndex(i)}
                >
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pd-info">
          <span className="pd-eyebrow">
            {item.category} · {item.condition}
          </span>
          <h1>{item.title}</h1>
          <div className="pd-price">
            <strong>{formatPrice(item.price)}</strong>
            <span>Listed price</span>
          </div>
          <p className="pd-summary">{item.summary}</p>

          <ul className="pd-facts">
            {item.co2SavedKg > 0 && (
              <li>
                <Leaf size={16} />
                <span>
                  <b>{item.co2SavedKg} kg CO₂</b> kept from new production
                </span>
              </li>
            )}
            <li>
              <MapPin size={16} />
              <span>
                <b>
                  {item.pincode ? `${item.city}, ${item.pincode}` : item.city}
                </b>{" "}
                · arrange delivery after purchase
              </span>
            </li>
            {item.live &&
              (item.returnable === false ? (
                <li className="pd-noreturn">
                  <Ban size={16} />
                  <span>
                    <b>Returns not accepted</b> for this product. Check the
                    photos and details before you buy.
                  </span>
                </li>
              ) : (
                <li>
                  <RotateCcw size={16} />
                  <span>
                    <b>7-day returns</b> if it arrives damaged or not as
                    described
                  </span>
                </li>
              ))}
          </ul>

          {!buyable && stock?.reason && (
            <p className="pd-notice">{stock.reason}</p>
          )}
          {buyable && (
            <div className="pd-qty">
              <span>Quantity</span>
              <div>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                  aria-label="Less"
                >
                  <Minus size={14} />
                </button>
                <b>{qty}</b>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                  disabled={qty >= maxQty}
                  aria-label="More"
                >
                  <Plus size={14} />
                </button>
              </div>
              <small>
                {stock.available <= 2
                  ? `Only ${stock.available} left`
                  : `${stock.available} available`}
              </small>
            </div>
          )}

          <div className="pd-actions">
            <button
              type="button"
              className="dn-btn pd-buy"
              disabled={!buyable}
              onClick={buyNow}
            >
              <Zap size={16} /> Buy now
            </button>
            <button
              type="button"
              className="dn-btn dn-btn--ghost"
              disabled={!buyable}
              onClick={addCart}
            >
              <ShoppingBag size={16} />{" "}
              {inCart ? "Add one more" : "Add to cart"}
            </button>
          </div>
          <div className="pd-actions sub">
            <MessageButton
              target={sellerChat(item)}
              label={isMaker ? "Message the ReMaker" : "Message the seller"}
            />
            <ReportButton
              type="Product"
              label="Report this listing"
              file={fileComplaint}
              target={{
                id: item.id,
                name: item.title,
                sub: `${item.seller} · ${isMaker ? "ReMaker" : "User"}`,
                image: item.image,
                ownerName: item.seller,
                ownerRole: isMaker ? "ReMaker" : "User",
                price: item.price,
                category: item.category,
              }}
            />
          </div>
        </div>
      </section>

      <SellerCard {...sellerProps}>
        <SafeImage src={item.sellerImage} alt="" />
        <div className="pd-seller-id">
          <small>{sellerLabel}</small>
          <strong>
            {item.seller} {isMaker && <BadgeCheck size={15} />}
          </strong>
          <span>{item.city}</span>
        </div>
        <dl>
          <div>
            <dt>Rating</dt>
            <dd>
              <Star size={12} fill="currentColor" /> {item.sellerRating}
            </dd>
          </div>
          <div>
            <dt>Reviews</dt>
            <dd>{reviewSummary.count}</dd>
          </div>
          <div>
            <dt>Listed</dt>
            <dd>{listedOn}</dd>
          </div>
        </dl>
        {sellerLinked && (
          <span className="pd-seller-go">
            {sellerCta} <ChevronRight size={15} aria-hidden="true" />
          </span>
        )}
      </SellerCard>

      <div className="pd-tabs" role="tablist">
        {[
          ["details", "Details"],
          ["reviews", `Reviews (${reviewSummary.count})`],
        ].map(([k, l]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            className={tab === k ? "on" : ""}
            onClick={() => setTab(k)}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "details" ? (
        <section className="pd-details">
          <div>
            <h2>About this piece</h2>
            <p>{item.description}</p>
            <div className="pd-stats">
              <div>
                <Boxes size={16} />
                <small>Availability</small>
                <b>
                  {item.quantity > 1
                    ? `${item.quantity} available`
                    : "1 available"}
                </b>
              </div>
              {!item.live && (
                <div>
                  <Eye size={16} />
                  <small>Views</small>
                  <b>{item.views}</b>
                </div>
              )}
              <div>
                <Heart size={16} />
                <small>Saves</small>
                <b>{item.likes}</b>
              </div>
            </div>
          </div>
          <dl className="pd-glance">
            <h3>At a glance</h3>
            <div>
              <dt>Category</dt>
              <dd>{item.category}</dd>
            </div>
            <div>
              <dt>Condition</dt>
              <dd>{item.condition}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{item.city}</dd>
            </div>
            {item.co2SavedKg > 0 && (
              <div>
                <dt>Impact</dt>
                <dd>{item.co2SavedKg} kg CO₂ saved</dd>
              </div>
            )}
            <div>
              <dt>Seller</dt>
              <dd>{sellerLabel}</dd>
            </div>
          </dl>
        </section>
      ) : (
        <section className="pd-reviews">
          {reviews.length ? (
            reviews.map((r) => (
              <article key={r.id}>
                <div>
                  <strong>{r.name}</strong>
                  <Stars rating={r.rating} />
                  <time>{r.date}</time>
                </div>
                <p>{r.text}</p>
                {r.reply && (
                  <p className="pd-reply">
                    <b>Seller reply:</b> {r.reply.text}
                  </p>
                )}
                <ReportButton
                  type="Review"
                  label="Report review"
                  file={reviewReportFiler(r.id)}
                  target={{
                    name: `${r.name}’s review`,
                    sub: `On ${item.seller} · ${r.rating}★`,
                    reviewer: r.name,
                    onProduct: item.title,
                    rating: r.rating,
                    text: r.text,
                    ownerName: item.seller,
                    ownerRole: isMaker ? "ReMaker" : "User",
                  }}
                />
              </article>
            ))
          ) : (
            <p className="pd-none">No one has reviewed this product yet.</p>
          )}
        </section>
      )}

      {related.length > 0 && (
        <section className="pd-related">
          <h2>More from {item.seller}</h2>
          <div>
            {related.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => {
                  navigate(productPath(p.id, p.title));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <SafeImage src={p.image} alt="" />
                <span>{p.title}</span>
                <b>{formatPrice(p.price)}</b>
              </button>
            ))}
          </div>
        </section>
      )}

      {toast && (
        <div className="pd-toast" role="status">
          <ShoppingBag size={15} /> Added to cart{" "}
          <button type="button" onClick={() => navigate("/user-cart")}>
            View cart
          </button>
        </div>
      )}
    </div>
  );
}
