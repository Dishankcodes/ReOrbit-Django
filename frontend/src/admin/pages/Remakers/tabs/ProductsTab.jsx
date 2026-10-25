import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  Link2,
  MoreVertical,
  Ban,
  Tag,
  ExternalLink,
  X,
} from "lucide-react";

import EmptyState from "../../../components/ui/EmptyState";
import StatusBadge from "../../../components/ui/StatusBadge";
import ConfirmActionModal from "../../../components/ui/ConfirmActionModal";

import { updateRemakerProduct } from "../../../data/remakersStore";
import { formatDate, formatINR } from "../../../utils/format";

const DISABLE_ACTION = {
  key: "disable-remaker-product",
  tone: "danger",
  icon: "ban",
  needsReason: true,
  title: "Disable this product?",
  body: "This product will be marked as disabled in the admin panel. Provide a reason for disabling it.",
  confirmLabel: "Disable product",
  placeholder: "Explain why this product should be disabled...",
  reasonHint: "required",
};

export default function ProductsTab({ remaker, toast }) {
  const navigate = useNavigate();

  const [openMenu, setOpenMenu] = useState(null);
  const [disabling, setDisabling] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [suggestedPrice, setSuggestedPrice] = useState("");
  const [priceMessage, setPriceMessage] = useState("");

  const notify = (message) => {
    if (typeof toast === "function") {
      toast(message);
    }
  };

  const openPriceForm = (product) => {
    setOpenMenu(null);
    setSuggestedPrice(String(product.suggested_price ?? product.price ?? ""));
    setPriceMessage(product.suggested_price_message || "");
    setPricing(product);
  };

  const saveSuggestedPrice = (event) => {
    event.preventDefault();

    if (!pricing) return;

    const price = Number(suggestedPrice);

    if (!Number.isFinite(price) || price <= 0) {
      notify("Enter a valid price greater than zero.");
      return;
    }

    const saved = updateRemakerProduct(remaker.remaker_id, pricing.product_id, {
      suggested_price: price,
      suggested_price_message: priceMessage.trim(),
      suggested_price_at: new Date().toISOString(),
    });

    if (!saved) {
      notify("Could not find this product. Please refresh and try again.");
      return;
    }

    notify(`Suggested price saved for "${pricing.title}".`);
    setPricing(null);
  };

  const disableProduct = (reason) => {
    if (!disabling) return;

    const cleanReason = String(reason || "").trim();

    if (!cleanReason) {
      notify("A reason is required to disable this product.");
      return;
    }

    const saved = updateRemakerProduct(
      remaker.remaker_id,
      disabling.product_id,
      {
        is_disabled: true,
        disabled_reason: cleanReason,
        disabled_at: new Date().toISOString(),
      },
    );

    if (!saved) {
      notify("Could not find this product. Please refresh and try again.");
      return;
    }

    notify(`"${disabling.title}" has been disabled.`);
    setDisabling(null);
  };

  const openProductDetails = (product) => {
    navigate(`/admin-products/${encodeURIComponent(product.product_id)}`);
  };

  if (!remaker.products || remaker.products.length === 0) {
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
    <>
      <div className="aup-items">
        {remaker.products.map((product) => {
          const stockClass =
            product.stock === 0 ? "out" : product.stock <= 3 ? "low" : "";

          const displayStatus = product.is_disabled
            ? "Disabled"
            : product.status;

          return (
            <article
              key={product.product_id}
              className="aup-item"
              style={{
                position: "relative",
                cursor: "pointer",
              }}
              role="link"
              tabIndex={0}
              aria-label={`View product details for ${product.title}`}
              onClick={() => openProductDetails(product)}
              onKeyDown={(event) => {
                if (
                  event.target === event.currentTarget &&
                  (event.key === "Enter" || event.key === " ")
                ) {
                  event.preventDefault();
                  openProductDetails(product);
                }
              }}
            >
              {/* Three-dot actions menu */}
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  zIndex: 5,
                }}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  aria-label={`Actions for ${product.title}`}
                  aria-expanded={openMenu === product.product_id}
                  className="ad-btn ad-btn-ghost ad-btn-sm"
                  style={{
                    width: 34,
                    height: 34,
                    padding: 0,
                    justifyContent: "center",
                    borderRadius: 9,
                    background: "#ffffff",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  }}
                  onClick={() =>
                    setOpenMenu((current) =>
                      current === product.product_id
                        ? null
                        : product.product_id,
                    )
                  }
                >
                  <MoreVertical size={18} />
                </button>

                {openMenu === product.product_id && (
                  <div
                    role="menu"
                    style={{
                      position: "absolute",
                      top: 40,
                      right: 0,
                      width: 210,
                      padding: 6,
                      background: "#ffffff",
                      border: "1px solid #d8e4de",
                      borderRadius: 12,
                      boxShadow: "0 12px 32px rgba(8,39,31,0.16)",
                    }}
                  >
                    {!product.is_disabled && (
                      <>
                        <button
                          type="button"
                          role="menuitem"
                          className="au-menu-item tone-danger"
                          style={{ width: "100%" }}
                          onClick={() => {
                            setOpenMenu(null);
                            setDisabling(product);
                          }}
                        >
                          <Ban size={15} />
                          Disable this product
                        </button>

                        <div className="au-menu-sep" />
                      </>
                    )}

                    <button
                      type="button"
                      role="menuitem"
                      className="au-menu-item"
                      style={{ width: "100%" }}
                      onClick={() => openPriceForm(product)}
                    >
                      <Tag size={15} />
                      Suggest a new price
                    </button>
                  </div>
                )}
              </div>

              {/* Product image and status */}
              <div className="aup-item-image">
                <img src={product.image} alt={product.title} />

                <StatusBadge
                  status={displayStatus}
                  className="aup-item-status"
                />
              </div>

              {/* Product information */}
              <div className="aup-item-body">
                <span className="aup-item-cat">{product.category}</span>

                <h4>{product.title}</h4>

                <div className="aup-item-meta">
                  <strong>{formatINR(product.price)}</strong>

                  <span className={`rm-prod-stock ${stockClass}`}>
                    {product.stock === 0
                      ? "Out of stock"
                      : `${product.stock} in stock`}
                  </span>
                </div>

                <div className="rm-prod-source">
                  <Link2 size={13} />
                  {product.source_item
                    ? `Upcycled from ${product.source_item}`
                    : "Own material"}
                </div>

                <div className="aup-item-foot">
                  <span className="aup-mono">{product.product_id}</span>
                  <small>{formatDate(product.created_at)}</small>
                </div>

                {product.is_disabled && (
                  <p className="aup-item-note">
                    <Ban size={14} />
                    Disabled: {product.disabled_reason || "No reason provided."}
                  </p>
                )}

                {product.suggested_price != null && (
                  <p className="aup-item-note">
                    <Tag size={14} />
                    Suggested price: {formatINR(product.suggested_price)}
                    {product.suggested_price_message
                      ? ` — ${product.suggested_price_message}`
                      : ""}
                  </p>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 10,
                    color: "#4f8f78",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  View product details
                  <ExternalLink size={13} />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Disable product: reason is required */}
      <ConfirmActionModal
        action={disabling ? DISABLE_ACTION : null}
        targets={disabling ? [disabling.title] : []}
        onClose={() => setDisabling(null)}
        onConfirm={disableProduct}
      />

      {/* Suggest a new price */}
      {pricing && (
        <div
          className="ad-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPricing(null);
            }
          }}
        >
          <form
            className="ad-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="remaker-suggest-price-title"
            onSubmit={saveSuggestedPrice}
          >
            <button
              type="button"
              className="ad-modal-close"
              onClick={() => setPricing(null)}
              aria-label="Close"
            >
              <X size={16} />
            </button>

            <div className="ad-modal-icon tone-positive">
              <Tag size={22} />
            </div>

            <h3 id="remaker-suggest-price-title">Suggest a new price</h3>

            <p className="ad-modal-text">
              Suggest a revised price for "{pricing.title}". The original
              listing price will remain unchanged.
            </p>

            <div className="ad-modal-targets">
              <span>Current price: {formatINR(pricing.price)}</span>
            </div>

            <label className="ad-modal-field">
              <span>Suggested price (₹)</span>

              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                autoFocus
                value={suggestedPrice}
                onChange={(event) => setSuggestedPrice(event.target.value)}
                placeholder="Enter suggested price"
              />
            </label>

            <label className="ad-modal-field">
              <span>Message to the ReMaker (optional)</span>

              <textarea
                rows={3}
                value={priceMessage}
                onChange={(event) => setPriceMessage(event.target.value)}
                placeholder="Explain why you recommend this price..."
              />
            </label>

            <div className="ad-modal-actions">
              <button
                type="button"
                className="ad-btn ad-btn-ghost"
                onClick={() => setPricing(null)}
              >
                Cancel
              </button>

              <button type="submit" className="ad-btn ad-btn-primary">
                Save suggestion
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
