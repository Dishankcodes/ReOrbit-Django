import React from "react";
import { Package, Link2, EyeOff, Eye } from "lucide-react";
import EmptyState from "../../../components/ui/EmptyState";
import StatusBadge from "../../../components/ui/StatusBadge";
import { setProductStatus } from "../../../data/remakersStore";
import { formatDate, formatINR } from "../../../utils/format";

export default function ProductsTab({ remaker, toast }) {
  if (remaker.products.length === 0) {
    return (
      <section className="aup-card">
        <EmptyState
          icon={Package}
          title="No products yet"
          text="Finished pieces this ReMaker lists for sale will appear here."
        />
      </section>
    );
  }

  return (
    <div className="aup-items">
      {remaker.products.map((p) => {
        const stockClass = p.stock === 0 ? "out" : p.stock <= 3 ? "low" : "";
        return (
          <article key={p.product_id} className="aup-item">
            <div className="aup-item-image">
              <img src={p.image} alt={p.title} />
              <StatusBadge status={p.status} className="aup-item-status" />
            </div>
            <div className="aup-item-body">
              <span className="aup-item-cat">{p.category}</span>
              <h4>{p.title}</h4>
              <div className="aup-item-meta">
                <strong>{formatINR(p.price)}</strong>
                <span className={`rm-prod-stock ${stockClass}`}>
                  {p.stock === 0 ? "Out of stock" : `${p.stock} in stock`}
                </span>
              </div>
              <div className="rm-prod-source">
                <Link2 size={13} />
                {p.source_item
                  ? `Upcycled from ${p.source_item}`
                  : "Own material"}
              </div>
              <div className="aup-item-foot">
                <span className="aup-mono">{p.product_id}</span>
                <small>{formatDate(p.created_at)}</small>
              </div>
              {p.status === "Listed" && (
                <div className="aup-item-actions">
                  <button
                    type="button"
                    className="ad-btn ad-btn-ghost ad-btn-sm"
                    onClick={() => {
                      setProductStatus(
                        remaker.remaker_id,
                        p.product_id,
                        "Inactive",
                      );
                      toast(`“${p.title}” removed from the marketplace.`);
                    }}
                  >
                    <EyeOff size={14} /> Deactivate
                  </button>
                </div>
              )}
              {p.status === "Inactive" && remaker.status === "Active" && (
                <div className="aup-item-actions">
                  <button
                    type="button"
                    className="ad-btn ad-btn-primary ad-btn-sm"
                    onClick={() => {
                      setProductStatus(
                        remaker.remaker_id,
                        p.product_id,
                        "Listed",
                      );
                      toast(`“${p.title}” is listed again.`);
                    }}
                  >
                    <Eye size={14} /> Reactivate
                  </button>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
