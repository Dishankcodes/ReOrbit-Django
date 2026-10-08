import React, { useMemo, useState } from "react";
import { Heart, Search, ShoppingBag, Trash2, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import "../../css/marketplace-css/UserWishlist.css";

const initialWishlist = [
  {
    id: 1,
    title: "Reclaimed Wooden Table",
    category: "Furniture",
    seller: "GreenCraft Studio",
    price: 2000,
    image:
      "https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 2,
    title: "Handmade Ceramic Vase",
    category: "Home Decor",
    seller: "Clay Orbit",
    price: 850,
    image:
      "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 3,
    title: "Recycled Canvas Bag",
    category: "Accessories",
    seller: "ReThread",
    price: 1300,
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 4,
    title: "Upcycled Study Lamp",
    category: "Lighting",
    seller: "Luma ReMade",
    price: 1100,
    image:
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80",
  },
];

export default function UserWishlist() {
  const navigate = useNavigate();

  const [items, setItems] = useState(initialWishlist);
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return items;

    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.seller.toLowerCase().includes(query),
    );
  }, [items, search]);

  const removeItem = (id) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  return (
    <section className="user-wishlist-page">
      <div className="wishlist-header">
        <div>
          <span className="wishlist-eyebrow">Saved for later</span>

          <h1>My Wishlist</h1>

          <p>
            Keep the products you love close and return whenever you're ready to
            give them a new orbit.
          </p>
        </div>

        <div className="wishlist-count">
          <Heart size={14} />
          {items.length} saved items
        </div>
      </div>

      <div className="wishlist-toolbar">
        <label className="wishlist-search">
          <Search size={14} />

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search saved items..."
          />
        </label>
      </div>

      {filteredItems.length > 0 ? (
        <div className="wishlist-grid">
          {filteredItems.map((item) => (
            <article className="wishlist-card" key={item.id}>
              <div className="wishlist-image">
                <img src={item.image} alt={item.title} />

                <button
                  type="button"
                  className="wishlist-heart"
                  onClick={() => removeItem(item.id)}
                  aria-label={`Remove ${item.title}`}
                >
                  <Heart size={17} fill="currentColor" />
                </button>
              </div>

              <div className="wishlist-info">
                <span className="wishlist-category">{item.category}</span>

                <h3>{item.title}</h3>

                <p>by {item.seller}</p>

                <div className="wishlist-bottom">
                  <strong className="wishlist-price">
                    ₹{item.price.toLocaleString("en-IN")}
                  </strong>

                  <button
                    type="button"
                    className="wishlist-view"
                    onClick={() =>
                      navigate(`/user-marketplace/product/${item.id}`)
                    }
                  >
                    View
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="wishlist-empty">
          <div className="wishlist-empty-icon">
            <Heart size={27} />
          </div>

          <h2>Your wishlist is waiting</h2>

          <p>
            Save products from the marketplace and they'll appear here for easy
            access later.
          </p>

          <Link to="/user-marketplace">
            <ShoppingBag
              size={13}
              style={{ marginRight: 6, verticalAlign: "middle" }}
            />
            Explore Marketplace
          </Link>
        </div>
      )}
    </section>
  );
}
