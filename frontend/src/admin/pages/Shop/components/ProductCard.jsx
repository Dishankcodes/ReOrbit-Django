import React from "react";
import { Link } from "react-router-dom";
import { Heart, ShoppingCart, Check, BadgeCheck, Sparkles } from "lucide-react";
import ProductImg from "./ProductImg";
import UserAvatar from "../../../components/ui/UserAvatar";
import { formatINR } from "../../../utils/format";
import {
  addToCart,
  toggleWishlist,
  useWishlist,
} from "../../../data/shopStore";

/* One product in the shop grid. */
export default function ProductCard({ product: p, inCart, onAdded }) {
  const saved = useWishlist().has(p.id);
  const isRm = p.type === "product";
  return (
    <article className="sh-card">
      <Link
        to={`/admin-shop/product/${p.id}`}
        className="sh-card-img"
        aria-label={`Open ${p.title}`}
      >
        <ProductImg src={p.image} alt={p.title} />
        <span className={`sh-tag ${isRm ? "rm" : "item"}`}>
          {isRm ? (
            <>
              <Sparkles size={12} /> ReMaker
            </>
          ) : (
            <>
              <BadgeCheck size={12} /> Community
            </>
          )}
        </span>
        {p.available <= 2 && (
          <span className="sh-low">Only {p.available} left</span>
        )}
      </Link>
      <button
        type="button"
        className={`sh-heart ${saved ? "on" : ""}`}
        aria-pressed={saved}
        aria-label={saved ? "Remove from saved" : "Save for later"}
        onClick={() => toggleWishlist(p.id)}
      >
        <Heart size={16} fill={saved ? "currentColor" : "none"} />
      </button>
      <div className="sh-card-body">
        <span className="sh-cat">
          {p.category}
          {p.condition ? ` · ${p.condition}` : ""}
        </span>
        <h3>
          <Link to={`/admin-shop/product/${p.id}`}>{p.title}</Link>
        </h3>
        <Link
          to={`/admin-shop/seller/${p.owner.id}`}
          className="sh-seller-chip"
        >
          <UserAvatar
            name={p.owner.name}
            src={p.owner.image}
            size={22}
            rounded="50%"
          />
          <span>{isRm ? p.owner.handle || p.owner.name : p.owner.name}</span>
          <em>{p.owner.city}</em>
        </Link>
        <div className="sh-card-foot">
          <strong>{formatINR(p.price)}</strong>
          <button
            type="button"
            className={`sh-add ${inCart ? "in" : ""}`}
            onClick={() => {
              addToCart(p.id, 1, p.available);
              onAdded?.(p);
            }}
            aria-label={`Add ${p.title} to cart`}
          >
            {inCart ? (
              <>
                <Check size={14} /> In cart
              </>
            ) : (
              <>
                <ShoppingCart size={14} /> Add
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
