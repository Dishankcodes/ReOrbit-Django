import React from "react";
import { Heart } from "lucide-react";
import EmptyState from "../../../components/ui/EmptyState";
import { formatDate, formatINR } from "../../../utils/format";

export default function WishlistTab({ user }) {
  if (user.wishlist.length === 0) {
    return (
      <section className="aup-card">
        <EmptyState icon={Heart} title="Wishlist is empty" text="Items and ReMaker products saved by this user will appear here." />
      </section>
    );
  }

  return (
    <section className="aup-card">
      <header className="aup-card-head">
        <div>
          <h3>Saved for later</h3>
          <p>Marketplace items and ReMaker products on this user’s wishlist.</p>
        </div>
      </header>
      <ul className="aup-list">
        {user.wishlist.map((entry) => (
          <li key={entry.wishlist_id} className="aup-list-row">
            <img src={entry.image} alt="" className="aup-thumb" />
            <div className="aup-list-main">
              <strong>{entry.title}</strong>
              <span>{entry.kind} · {entry.by} · saved {formatDate(entry.added_at)}</span>
            </div>
            <div className="aup-list-end"><strong>{formatINR(entry.price)}</strong></div>
          </li>
        ))}
      </ul>
    </section>
  );
}
