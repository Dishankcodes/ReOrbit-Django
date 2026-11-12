import React from "react";
import { Link, useNavigate } from "../../../shared/portalRouter";
import {
  AlertTriangle,
  ArrowRight,
  Leaf,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Store,
  Trash2,
  Truck,
  BadgeCheck,
  Sparkles,
} from "lucide-react";

import {
  clearCart,
  removeFromCart,
  setCartQty,
  startCheckout,
  useCart,
  useCartCount,
} from "../../data/shopStore";
import { isLiveId, useServerQuote } from "../../data/checkoutStore";
import { useLiveMarketplace } from "../../data/liveMarketplace";
import Spinner, { PageLoader } from "../../../shared/components/Spinner";
import "../../../shared/components/Spinner.css";
import { feeLabel } from "../../../shared/commerce";
import { sellerPath } from "../../data/ordersStore";
import { formatPrice } from "../../../data/marketplaceData";
import EmptyState from "../../components/ui/EmptyState";
import SafeImage from "../../components/ui/SafeImage";
import useToast from "../../components/ui/useToast";
import ShopNav from "./components/ShopNav";

import "../../css/shared/ui-base.css";
import "../../css/shop/shop-base.css";
import "../../css/shop/UserCart.css";

export default function UserCart() {
  const navigate = useNavigate();
  const { ready } =
    useLiveMarketplace(); /* real products join the catalogue once this has loaded */
  const cart = useCart();
  const stored = useCartCount();
  const { toast, show } = useToast();

  /* Only real products can be bought; the sample pieces in the demo catalogue cannot. */
  const buyable = cart.lines.filter((l) => isLiveId(l.id));
  const q = useServerQuote(buyable);
  const problems = q.quote?.problems || {};
  const canCheckout =
    buyable.length > 0 &&
    !!q.quote &&
    Object.keys(problems).length === 0 &&
    !q.loading;

  const checkout = () => {
    if (!canCheckout) return;
    startCheckout(
      buyable.map((l) => ({ id: l.id, qty: l.qty })),
      "cart",
    );
    navigate("/user-checkout");
  };

  if (!ready && stored > 0) {
    return (
      <div className="dn sp">
        <ShopNav />
        <PageLoader label="Loading your cart…" />
      </div>
    );
  }

  if (cart.all.length === 0) {
    return (
      <div className="dn sp">
        <ShopNav />
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          text="Add pre-loved pieces or ReMaker creations and they'll wait for you here."
          actionLabel="Browse marketplace"
          to="/user-marketplace"
        />
      </div>
    );
  }

  const quote = q.quote;

  return (
    <div className="dn sp">
      <ShopNav />

      <header className="ushp-head">
        <div>
          <span className="dn-eyebrow">Almost yours</span>
          <h1>Your cart</h1>
          <p className="dn-muted">
            {cart.all.length} {cart.all.length === 1 ? "piece" : "pieces"} ·
            review before you check out
          </p>
        </div>
        <button
          type="button"
          className="ushp-textbtn danger"
          onClick={() => {
            clearCart();
            show("Cart cleared.");
          }}
        >
          <Trash2 size={15} /> Clear cart
        </button>
      </header>

      <div className="ushp-grid">
        <section className="ushp-lines" aria-label="Cart items">
          {cart.all.map((l) => {
            const { item } = l;
            const sample = !isLiveId(l.id);
            const problem = problems[l.id];
            const off = l.unavailable || sample || !!problem;
            const remaker = item.sellerType === "remaker";
            return (
              <article
                key={l.id}
                className={`dn-card ushp-line ${off ? "is-off" : ""}`}
              >
                <Link
                  to={`/user-marketplace/product/${item.id}`}
                  className="ushp-line-img"
                >
                  <SafeImage src={item.image} alt={item.title} />
                </Link>

                <div className="ushp-line-main">
                  <span className="ushp-cat">
                    {item.category} · {item.condition} ·{" "}
                    {remaker ? (
                      <b>
                        <Sparkles size={11} /> ReMaker
                      </b>
                    ) : (
                      <b>
                        <BadgeCheck size={11} /> Community
                      </b>
                    )}
                  </span>
                  <h3>
                    <Link to={`/user-marketplace/product/${item.id}`}>
                      {item.title}
                    </Link>
                  </h3>
                  <Link to={sellerPath(item)} className="dn-link ushp-seller">
                    {remaker ? "Made by" : "Sold by"} {item.seller}
                  </Link>

                  {off ? (
                    <p className="ushp-warn">
                      <AlertTriangle size={14} />{" "}
                      {sample
                        ? "This is a sample piece and can't be bought yet."
                        : problem || item.reason}{" "}
                      Remove it to continue.
                    </p>
                  ) : (
                    <div className="ushp-line-ctrl">
                      <div
                        className="ushp-qty"
                        role="group"
                        aria-label={`Quantity of ${item.title}`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setCartQty(item.id, l.qty - 1, item.available)
                          }
                          disabled={l.qty <= 1}
                          aria-label="Decrease quantity"
                        >
                          <Minus size={14} />
                        </button>
                        <output>{l.qty}</output>
                        <button
                          type="button"
                          onClick={() =>
                            setCartQty(item.id, l.qty + 1, item.available)
                          }
                          disabled={l.qty >= item.available}
                          aria-label="Increase quantity"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      {item.available <= 2 && (
                        <span className="ushp-low">
                          Only {item.available} left
                        </span>
                      )}
                      <button
                        type="button"
                        className="ushp-textbtn danger"
                        onClick={() => {
                          removeFromCart(item.id);
                          show("Removed from cart.");
                        }}
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                  )}
                </div>

                {!off && (
                  <div className="ushp-line-price">
                    <strong>{formatPrice(item.price * l.qty)}</strong>
                    <span>{formatPrice(item.price)} each</span>
                  </div>
                )}
                {off && (
                  <button
                    type="button"
                    className="ushp-textbtn danger ushp-line-remove"
                    onClick={() => removeFromCart(item.id)}
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                )}
              </article>
            );
          })}
        </section>

        <aside className="dn-card ushp-summary" aria-label="Order summary">
          <h3>Order summary</h3>

          {q.error && (
            <p className="dn-error" role="alert">
              {q.error}{" "}
              <button type="button" className="dn-link" onClick={q.retry}>
                Try again
              </button>
            </p>
          )}
          <dl aria-busy={q.loading}>
            <div>
              <dt>Subtotal ({buyable.reduce((n, l) => n + l.qty, 0)} items)</dt>
              <dd>{quote ? formatPrice(quote.subtotal) : <Spinner />}</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>
                {quote ? (
                  quote.delivery_fee ? (
                    formatPrice(quote.delivery_fee)
                  ) : (
                    "Free"
                  )
                ) : (
                  <Spinner />
                )}
              </dd>
            </div>
            {quote && quote.platform_fee > 0 && (
              <div>
                <dt>{feeLabel()}</dt>
                <dd>{formatPrice(quote.platform_fee)}</dd>
              </div>
            )}
            <div className="total">
              <dt>Total</dt>
              <dd>{quote ? formatPrice(quote.total) : <Spinner />}</dd>
            </div>
          </dl>
          {quote && quote.groups.length > 1 && (
            <p className="ushp-note">
              Pieces from {quote.groups.length} sellers ship as{" "}
              {quote.groups.length} separate orders; delivery and fees are
              worked out per seller.
            </p>
          )}

          <button
            type="button"
            className="dn-btn dn-btn--block ushp-big"
            onClick={checkout}
            disabled={!canCheckout}
          >
            {q.loading ? (
              <Spinner label="Checking prices…" />
            ) : (
              <>
                Proceed to checkout <ArrowRight size={16} />
              </>
            )}
          </button>
          <Link to="/user-marketplace" className="dn-link ushp-center">
            Continue shopping
          </Link>

          <ul className="ushp-mini">
            <li>
              <ShieldCheck size={14} /> Secure checkout
            </li>
            <li>
              <Truck size={14} /> Delivery to your address
            </li>
          </ul>
        </aside>
      </div>

      {toast}
    </div>
  );
}
