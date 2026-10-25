import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Boxes, MoreVertical, Ban, Tag, ExternalLink, X } from "lucide-react";

import EmptyState from "../../../components/ui/EmptyState";
import StatusBadge from "../../../components/ui/StatusBadge";
import ConfirmActionModal from "../../../components/ui/ConfirmActionModal";
import { updateUserItem } from "../../../data/usersStore";
import { formatDate, formatINR } from "../../../utils/format";

const DISABLE_ACTION = {
  key: "disable-item",
  tone: "danger",
  icon: "ban",
  needsReason: true,
  title: "Disable this item?",
  body: "The item will be marked as disabled in the admin panel. Provide a reason for the action.",
  confirmLabel: "Disable item",
  placeholder: "Explain why this item should be disabled...",
  reasonHint: "required",
};

export default function ItemsTab({ user, toast }) {
  const navigate = useNavigate();

  const [openMenu, setOpenMenu] = useState(null);
  const [disabling, setDisabling] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [suggestedPrice, setSuggestedPrice] = useState("");
  const [priceMessage, setPriceMessage] = useState("");

  const notify = (message) => {
    if (typeof toast === "function") toast(message);
  };

  const openPriceForm = (item) => {
    setOpenMenu(null);
    setSuggestedPrice(String(item.estimated_price ?? ""));
    setPriceMessage("");
    setPricing(item);
  };

  const saveSuggestedPrice = (event) => {
    event.preventDefault();

    const price = Number(suggestedPrice);

    if (!Number.isFinite(price) || price <= 0) {
      notify("Enter a valid price greater than zero.");
      return;
    }

    updateUserItem(user.user_id, pricing.item_id, {
      suggested_price: price,
      suggested_price_message: priceMessage.trim(),
      suggested_price_at: new Date().toISOString(),
    });

    notify(`Suggested price saved for "${pricing.title}".`);
    setPricing(null);
  };

  if (!user.items || user.items.length === 0) {
    return (
      <section className="aup-card">
        <EmptyState
          icon={Boxes}
          title="No items uploaded"
          text="Items this user lists on the marketplace will show up here."
        />
      </section>
    );
  }

  return (
    <>
      <div className="aup-items">
        {user.items.map((item) => (
          <article
            key={item.item_id}
            className="aup-item"
            style={{
              position: "relative",
              cursor: "pointer",
            }}
            onClick={() =>
              navigate(`/admin-products/${encodeURIComponent(item.item_id)}`)
            }
            onKeyDown={(event) => {
              if (
                event.target === event.currentTarget &&
                (event.key === "Enter" || event.key === " ")
              ) {
                event.preventDefault();
                navigate(`/admin-products/${encodeURIComponent(item.item_id)}`);
              }
            }}
            role="link"
            tabIndex={0}
          >
            {/* Three-dot menu */}
            <div
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                zIndex: 5,
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                aria-label={`Actions for ${item.title}`}
                aria-expanded={openMenu === item.item_id}
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
                    current === item.item_id ? null : item.item_id,
                  )
                }
              >
                <MoreVertical size={18} />
              </button>

              {openMenu === item.item_id && (
                <div
                  role="menu"
                  style={{
                    position: "absolute",
                    top: 40,
                    right: 0,
                    width: 205,
                    padding: 6,
                    background: "#fff",
                    border: "1px solid #d8e4de",
                    borderRadius: 12,
                    boxShadow: "0 12px 32px rgba(8,39,31,0.16)",
                  }}
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="au-menu-item tone-danger"
                    style={{ width: "100%" }}
                    onClick={() => {
                      setOpenMenu(null);
                      setDisabling(item);
                    }}
                  >
                    <Ban size={15} />
                    Disable this item
                  </button>

                  <div className="au-menu-sep" />

                  <button
                    type="button"
                    role="menuitem"
                    className="au-menu-item"
                    style={{ width: "100%" }}
                    onClick={() => openPriceForm(item)}
                  >
                    <Tag size={15} />
                    Suggest a new price
                  </button>
                </div>
              )}
            </div>

            <div className="aup-item-image">
              <img src={item.image} alt={item.title} />

              <StatusBadge
                status={item.is_disabled ? "Disabled" : item.item_status}
                className="aup-item-status"
              />
            </div>

            <div className="aup-item-body">
              <span className="aup-item-cat">{item.category}</span>

              <h4>{item.title}</h4>

              <div className="aup-item-meta">
                <strong>{formatINR(item.estimated_price)}</strong>
                <span>Qty {item.quantity}</span>
                <span>{item.condition} condition</span>
              </div>

              <div className="aup-item-foot">
                <small>{formatDate(item.created_at)}</small>
              </div>

              {item.is_disabled && (
                <p className="aup-item-note">
                  <Ban size={14} /> Disabled: {item.disabled_reason}
                </p>
              )}

              {item.suggested_price != null && (
                <p className="aup-item-note">
                  <Tag size={14} />
                  Suggested price: {formatINR(item.suggested_price)}
                  {item.suggested_price_message
                    ? ` — ${item.suggested_price_message}`
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
        ))}
      </div>

      {/* Disable item: reason is required */}
      <ConfirmActionModal
        action={disabling ? DISABLE_ACTION : null}
        targets={disabling ? [disabling.title] : []}
        onClose={() => setDisabling(null)}
        onConfirm={(reason) => {
          updateUserItem(user.user_id, disabling.item_id, {
            is_disabled: true,
            disabled_reason: reason,
            disabled_at: new Date().toISOString(),
          });

          notify(`"${disabling.title}" has been disabled.`);
          setDisabling(null);
        }}
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
            aria-labelledby="suggest-price-title"
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

            <h3 id="suggest-price-title">Suggest a new price</h3>

            <p className="ad-modal-text">
              Suggest a revised price for "{pricing.title}". The original
              listing price will remain unchanged.
            </p>

            <div className="ad-modal-targets">
              <span>Current price: {formatINR(pricing.estimated_price)}</span>
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
              <span>Message to the owner (optional)</span>
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
