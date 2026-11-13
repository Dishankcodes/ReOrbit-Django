import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Ban,
  ChevronRight,
  CircleCheck,
  ExternalLink,
  Eye,
  Heart,
  PackageX,
  Pencil,
  ShoppingBag,
} from "lucide-react";

import { BackLink } from "../../../shared/backNav";
import { adminStoreApi } from "../../../api/products";
import { adminOrdersApi } from "../../../api/orders";
import {
  deactivateRemakerProduct,
  fetchAdminRemakerProduct,
  fetchStoreStats,
  reactivateRemakerProduct,
} from "../../../api/adminProducts";
import { useAccess } from "../../data/teamStore";
import { PRODUCT_ACTION_LIST } from "../../data/productActions";
import { formatDate, formatDateTime, formatINR, timeAgo } from "../../utils/format";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import ConfirmActionModal from "../../components/ui/ConfirmActionModal";
import useToast from "../../components/ui/useToast";
import { SkeletonRows } from "../../../shared/components/Skeleton";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/users/AdminUserProfile.css";
import "../../css/remakers/AdminRemakers.css";
import "../../css/products/AdminProducts.css";

const ACTIONS = PRODUCT_ACTION_LIST;
const SOURCE = { warehouse: "Warehouse stock", refurbished: "Refurbished", other: "Other / new" };

function Fact({ label, children }) {
  return (
    <div className="aup-detail">
      <dt>{label}</dt>
      <dd>{children || "—"}</dd>
    </div>
  );
}

/* Details of a real product: a ReMaker's (RPR-…) or one from the ReOrbit store (ADI-…). */
export default function AdminProductDetailsLive() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { can } = useAccess();
  const canEdit = can("products", "edit");
  const { toast, toastNode } = useToast();
  const isStore = productId.startsWith("ADI-");

  const [p, setP] = useState(null);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState(false);
  const [orders, setOrders] = useState(null);
  const [stats, setStats] = useState(null);
  const [shot, setShot] = useState(0);
  const [pending, setPending] = useState(null);

  const load = useCallback(() => {
    setError("");
    setMissing(false);
    (isStore ? adminStoreApi.get(productId) : fetchAdminRemakerProduct(productId))
      .then(setP)
      .catch((e) => (e.status === 404 ? setMissing(true) : setError(e.message || "Could not load this product.")));
    adminOrdersApi
      .list(`?item=${encodeURIComponent(productId)}&page_size=50`)
      .then((d) => setOrders(d.results))
      .catch(() => setOrders([]));
    if (isStore) fetchStoreStats().then((s) => setStats(s[productId] || {})).catch(() => setStats({}));
  }, [productId, isStore]);

  useEffect(() => {
    setP(null);
    setShot(0);
    load();
    window.scrollTo({ top: 0 });
  }, [load]);

  const act = async (fn, done) => {
    try {
      setP(await fn());
      toast(done);
    } catch (e) {
      toast(e.message || "Could not update the product.");
    }
  };

  const confirm = async (reason) => {
    const { action } = pending;
    setPending(null);
    await act(
      () => (action.key === "deactivate" ? deactivateRemakerProduct(p.id, reason) : reactivateRemakerProduct(p.id)),
      `“${p.title}” ${action.toast}.`,
    );
  };

  const back = (
    <BackLink
      to={isStore ? "/admin-products?tab=store" : "/admin-products"}
      className="aup-back"
      icon={<ArrowLeft size={15} />}
      label="Products"
    />
  );

  if (missing) {
    return (
      <div className="aup-page">
        <section className="aup-card">
          <EmptyState
            icon={PackageX}
            title="Listing not found"
            text="This product does not exist or the link is wrong."
            action={
              <button type="button" className="ad-btn ad-btn-primary ad-btn-sm" onClick={() => navigate("/admin-products")}>
                <ArrowLeft size={14} /> Back to products
              </button>
            }
          />
        </section>
      </div>
    );
  }
  if (error) {
    return (
      <div className="aup-page">
        <section className="aup-card">
          <ErrorState text={error} onRetry={load} />
        </section>
      </div>
    );
  }
  if (!p) {
    return (
      <div className="aup-page">
        <section className="aup-card">
          <SkeletonRows count={6} />
        </section>
      </div>
    );
  }

  const off = !!p.deactivation;
  const images = p.images || [];
  const main = images[shot]?.url || p.cover;
  const owner = isStore ? null : p.remaker;
  const sold = (orders || []).filter((o) => !["Cancelled", "Returned_To_Origin"].includes(o.status));
  const specs = p.specs || {};
  const timeline = [
    { id: "made", label: "Product created", at: p.created_at },
    ...(p.updated_at && p.updated_at !== p.created_at ? [{ id: "edit", label: "Last updated", at: p.updated_at }] : []),
    ...(off ? [{ id: "off", label: "Switched off by admin", detail: p.deactivation.reason, at: p.deactivation.at }] : []),
  ].sort((a, b) => new Date(b.at) - new Date(a.at));

  return (
    <div className="aup-page">
      <nav className="aup-crumbs" aria-label="Breadcrumb">
        {back}
        <ChevronRight size={14} />
        <span aria-current="page">{p.title}</span>
      </nav>

      {off && (
        <div className="aup-notice tone-deleted" role="status">
          <strong>This product is switched off.</strong>
          <span>Reason: {p.deactivation.reason || "No reason provided."}</span>
        </div>
      )}
      {!off && p.status === "Inactive" && (
        <div className="aup-notice tone-deleted" role="status">
          <strong>This product is off the marketplace.</strong>
          <span>It is hidden from buyers until it is published again.</span>
        </div>
      )}

      <div className="apd-top">
        <section className="aup-card apd-gallery" aria-label="Photos">
          <div className="apd-main">{main ? <img src={main} alt={p.title} /> : <span className="apr-noimg" style={{ width: "100%", height: "100%" }} />}</div>
          {images.length > 1 && (
            <div className="apd-thumbs">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  className={shot === i ? "active" : ""}
                  onClick={() => setShot(i)}
                  aria-label={`Show photo ${i + 1}`}
                  aria-pressed={shot === i}
                >
                  <img src={img.url} alt="" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="aup-card apd-info">
          <div className="apd-badges">
            <span className={`ap-type ${isStore ? "item" : "product"}`}>{isStore ? "ReOrbit store" : "ReMaker product"}</span>
            {off ? <StatusBadge status="Disabled" /> : <StatusBadge status={p.status} />}
          </div>
          <h2>{p.title}</h2>
          <p className="apd-id">
            <span className="aup-mono">{p.id}</span> · {p.category?.name}
          </p>

          <div className="apd-price">
            <strong>{formatINR(Number(p.price))}</strong>
            <span>listing price</span>
            {isStore && p.mrp ? <del style={{ marginLeft: 10, opacity: 0.6 }}>{formatINR(Number(p.mrp))}</del> : null}
          </div>

          <dl className="apd-facts">
            <Fact label="Category">{p.category?.name}</Fact>
            <Fact label="Stock">{p.stock === 0 ? "Out of stock" : `${p.stock} available`}</Fact>
            {isStore ? (
              <>
                <Fact label="SKU">{p.sku}</Fact>
                <Fact label="Condition">{p.condition}</Fact>
                <Fact label="Source">{SOURCE[p.source] || p.source}</Fact>
                <Fact label="Delivery">{p.delivery === "free" ? "Free delivery" : "Flat-rate delivery"}</Fact>
                <Fact label="Returns">{p.returnable ? "Returnable" : "Not returnable"}</Fact>
                <Fact label="Material">{specs.material}</Fact>
                <Fact label="Dimensions">{specs.dimensions}</Fact>
                <Fact label="Weight">{specs.weight ? `${specs.weight} kg` : ""}</Fact>
                <Fact label="Warranty">{specs.warranty}</Fact>
              </>
            ) : (
              <>
                <Fact label="Materials">{p.materials}</Fact>
                <Fact label="Dimensions">{p.dimensions}</Fact>
                <Fact label="Customisation">{p.customization_available ? "Available" : "Not offered"}</Fact>
                <Fact label="Pickup">{String(p.pickup_preference || "").replace(/_/g, " ")}</Fact>
              </>
            )}
            <Fact label="Posted on">{formatDateTime(p.created_at)}</Fact>
            <Fact label="Posted">{timeAgo(p.created_at)}</Fact>
          </dl>

          <p className="apd-desc">{p.description}</p>

          {canEdit && (
            <div className="apd-actions">
              {isStore ? (
                <>
                  <Link to={`/admin-sell/edit/${p.id}`} className="ad-btn ad-btn-primary">
                    <Pencil size={15} /> Edit product
                  </Link>
                  {["Listed", "Sold_Out"].includes(p.status) && (
                    <button type="button" className="ad-btn ad-btn-ghost" onClick={() => act(() => adminStoreApi.pause(p.id), "Product paused.")}>
                      Pause
                    </button>
                  )}
                  {["Inactive", "Draft"].includes(p.status) && (
                    <button type="button" className="ad-btn ad-btn-primary" onClick={() => act(() => adminStoreApi.publish(p.id), "Product is live.")}>
                      <CircleCheck size={15} /> Publish
                    </button>
                  )}
                </>
              ) : off ? (
                <button type="button" className="ad-btn ad-btn-primary" onClick={() => setPending({ action: ACTIONS.reactivate })}>
                  <CircleCheck size={15} /> Reactivate
                </button>
              ) : p.status !== "Draft" ? (
                <button type="button" className="ad-btn ad-btn-danger" onClick={() => setPending({ action: ACTIONS.deactivate })}>
                  <Ban size={15} /> Deactivate this product
                </button>
              ) : null}
            </div>
          )}
        </section>
      </div>

      <div className="aup-grid-2">
        <div className="aup-stack">
          <section className="aup-card">
            <header className="aup-card-head">
              <div>
                <h3>Orders</h3>
                <p>Sales of this product.</p>
              </div>
            </header>
            {orders === null ? (
              <SkeletonRows count={2} />
            ) : orders.length === 0 ? (
              <p className="aup-muted-note">No orders for this product yet.</p>
            ) : (
              <ul className="aup-list">
                {orders.map((o) => (
                  <li key={o.id} className="aup-list-row">
                    <div className="aup-list-main">
                      <strong>
                        <Link to={`/admin-orders/${o.id}`} className="aup-mono">
                          {o.id}
                        </Link>
                      </strong>
                      <span>
                        {formatDate(o.created_at)} · {String(o.payment?.method || "").replace("_", " ")}
                      </span>
                    </div>
                    <div className="aup-list-end">
                      <strong>{formatINR(o.total)}</strong>
                      <StatusBadge status={o.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="aup-stack">
          {owner && (
            <section className="aup-card">
              <header className="aup-card-head">
                <div>
                  <h3>Posted by</h3>
                  <p>The ReMaker who listed this.</p>
                </div>
              </header>
              <div className="apd-owner">
                <div>
                  <strong>{owner.name}</strong>
                  <span>@{owner.username}</span>
                  <span>
                    <span className="ap-role rm">ReMaker</span>
                  </span>
                </div>
              </div>
              <Link to={`/admin-remakers/${owner.id}`} className="ad-btn ad-btn-ghost" style={{ width: "100%" }}>
                <ExternalLink size={15} /> View ReMaker profile
              </Link>
            </section>
          )}

          <section className="aup-card">
            <header className="aup-card-head">
              <div>
                <h3>Engagement</h3>
                <p>How buyers are responding.</p>
              </div>
            </header>
            <div className="apd-metrics">
              {isStore && (
                <>
                  <div>
                    <small>
                      <Eye size={13} /> Views
                    </small>
                    <strong>{p.views ?? 0}</strong>
                  </div>
                  <div>
                    <small>
                      <Heart size={13} /> Wishlisted
                    </small>
                    <strong>{stats ? stats.wishlisted || 0 : "…"}</strong>
                  </div>
                </>
              )}
              <div>
                <small>
                  <ShoppingBag size={13} /> Orders
                </small>
                <strong>{orders === null ? "…" : sold.length}</strong>
              </div>
            </div>
          </section>

          <section className="aup-card">
            <header className="aup-card-head">
              <div>
                <h3>Listing timeline</h3>
                <p>From posting to today.</p>
              </div>
            </header>
            <ol className="apd-tl">
              {timeline.map((e) => (
                <li key={e.id}>
                  <i className={`apd-dot ${e.id === "off" ? "bad" : "good"}`} />
                  <div>
                    <strong>{e.label}</strong>
                    {e.detail && <p>{e.detail}</p>}
                    <time>{formatDateTime(e.at)}</time>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      <ConfirmActionModal action={pending?.action} targets={[p.title]} onConfirm={confirm} onClose={() => setPending(null)} />
      {toastNode}
    </div>
  );
}
