import { ArrowRight, Heart, ShoppingBag, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ITEMS, formatPrice } from "../data/mockData";
import { getWishlistIds, saveWishlistIds } from "../data/userUiState";
import "../styles/pages.css";

export default function UserWishlist() {
  const [ids, setIds] = useState(() => {
    const stored = getWishlistIds();
    if (stored.length) return stored;
    const fallback = ITEMS.slice(0, 5).map((item) => item.id);
    saveWishlistIds(fallback);
    return fallback;
  });
  const items = useMemo(() => ITEMS.filter((item) => ids.includes(item.id)), [ids]);

  const remove = (id) => {
    setIds((current) => {
      const next = current.filter((itemId) => itemId !== id);
      saveWishlistIds(next);
      return next;
    });
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">SAVED FOR LATER</span>
          <h2>Your Wishlist</h2>
          <p>Keep the pieces you love close until they find their next orbit.</p>
        </div>
        <span className="count-chip"><Heart size={13} /> {items.length} saved</span>
      </div>

      {items.length ? (
        <div className="wishlist-grid">
          {items.map((item) => (
            <article className="product-card card" key={item.id}>
              <div className="product-image">
                <img src={item.image} alt={item.title} />
                <button type="button" onClick={() => remove(item.id)} aria-label="Remove from wishlist">
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="product-copy">
                <span>{item.category}</span>
                <h4>{item.title}</h4>
                <p>{item.seller}</p>
                <div>
                  <strong>{formatPrice(item.price)}</strong>
                  <Link to={`/user-marketplace/product/${item.id}`}><ShoppingBag size={13} /> View</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="card empty">
          <Heart size={25} />
          <h3>Your wishlist is waiting.</h3>
          <p>Save products from the marketplace and they will appear here.</p>
          <Link className="btn btn-primary" to="/user-marketplace">Explore marketplace <ArrowRight size={14} /></Link>
        </div>
      )}
    </div>
  );
}
