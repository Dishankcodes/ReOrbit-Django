import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ChevronRight, ArrowLeft, PackageX, MapPin, CalendarDays, ExternalLink, Eye, Heart, Warehouse, Tag,
  Wrench, BellRing, Lightbulb, Layers, Snowflake,
} from "lucide-react";

import { useStockItem, runWarehouseAction } from "../../data/warehouseStore";
import { getWarehouseActions } from "../../data/warehouseActions";
import { useSettings } from "../../data/settingsStore";
import { formatDate, formatDateTime, formatINR } from "../../utils/format";

import StatusBadge from "../../components/ui/StatusBadge";
import UserAvatar from "../../components/ui/UserAvatar";
import EmptyState from "../../components/ui/EmptyState";
import ConfirmActionModal from "../../components/ui/ConfirmActionModal";
import { ACTION_ICONS } from "../../components/ui/actionIcons";
import useToast from "../../components/ui/useToast";
import { AlertChip, SaleChip } from "./components/StockBadges";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/users/AdminUserProfile.css";
import "../../css/products/AdminProducts.css";
import "../../css/orders/AdminOrders.css";
import "../../css/warehouse/AdminWarehouse.css";

const ADVICE = {
  watch: { title: "This item has not sold in a week.", text: "A small push usually works at this stage. Try a 15% price cut or feature it on the homepage.", keys: ["discount", "promote"] },
  slow: { title: "This item is moving slowly.", text: "It has been on sale for two weeks or more. Cut the price and promote it, or send it to a ReMaker for a refresh.", keys: ["discount", "refurbish"] },
  dead: { title: "This is dead stock.", text: "It has been unsold for a month or more and is tying up money and rack space. Refurbish it for a second chance, or donate it.", keys: ["refurbish", "donate"] },
};

export default function AdminWarehouseItem() {
  const UNSOLD_DAYS = useSettings().warehouse.unsoldDays;
  const { inventoryId } = useParams();
  const navigate = useNavigate();
  const s = useStockItem(inventoryId);
  const { toast, toastNode } = useToast();
  const [pending, setPending] = useState(null);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [inventoryId]);

  if (!s) {
    return (
      <div className="aup-page">
        <section className="aup-card">
          <EmptyState
            icon={PackageX}
            title="Stock line not found"
            text="This item is not in the warehouse or the link is wrong."
            action={<button type="button" className="ad-btn ad-btn-primary ad-btn-sm" onClick={() => navigate("/admin-warehouse")}><ArrowLeft size={14} /> Back to warehouse</button>}
          />
        </section>
      </div>
    );
  }

  const actions = getWarehouseActions(s);
  const advice = s.alert ? ADVICE[s.alert.key] : null;
  const heroActions = actions.filter((a) => ["discount", "promote", "refurbish", "donate", "list", "putAway", "receiveBack", "dispatch"].includes(a.key)).slice(0, 3);
  const pct = Math.min(100, (s.daysListed / 30) * 100);
  const sellMargin = s.list_price - s.cost_price;

  const confirmAction = (note) => {
    runWarehouseAction(s.inventory_id, pending.key, note);
    toast(`${s.inventory_id} ${pending.toast}.`);
    setPending(null);
  };

  return (
    <div className="aup-page">
      <nav className="aup-crumbs" aria-label="Breadcrumb">
        <Link to="/admin-warehouse" className="aup-back"><ArrowLeft size={15} /> Warehouse</Link>
        <ChevronRight size={14} />
        <span aria-current="page">{s.inventory_id}</span>
      </nav>

      {/* ---------- hero ---------- */}
      <section className="aup-hero">
        <div className="aup-hero-main">
          <img src={s.image} alt={s.title} className="aw-hero-img" />
          <div className="aup-hero-info">
            <div className="aup-hero-name">
              <h2>{s.title}{s.quantity > 1 ? ` ×${s.quantity}` : ""}</h2>
              <StatusBadge status={s.warehouse_status} />
              {s.alert && <AlertChip stock={s} />}
            </div>
            <ul className="aup-hero-meta">
              <li><Warehouse size={14} /> {s.inventory_id}</li>
              <li><MapPin size={14} /> {s.location ? `Rack ${s.locationLabel}` : "Left the warehouse"}</li>
              <li><CalendarDays size={14} /> In stock {s.daysInStock} day{s.daysInStock === 1 ? "" : "s"}</li>
            </ul>
          </div>
        </div>
        <div className="ao-hero-side">
          <div className="ao-hero-total"><small>Marketplace price</small><strong>{formatINR(s.list_price)}</strong></div>
          {heroActions.length > 0 && (
            <div className="aup-hero-actions">
              {heroActions.map((a) => {
                const Icon = ACTION_ICONS[a.icon];
                return <button key={a.key} type="button" className={`aup-hero-btn tone-${a.tone}`} onClick={() => setPending(a)}><Icon size={15} /> {a.short}</button>;
              })}
            </div>
          )}
        </div>
      </section>

      {/* ---------- alert + recommendations ---------- */}
      {advice && (
        <section className={`aw-advice lvl-${s.alert.key}`} role="alert">
          <span className="aw-advice-icon"><BellRing size={20} /></span>
          <div className="aw-advice-body">
            <strong>{advice.title} Unsold for {s.daysListed} days.</strong>
            <p>{advice.text}</p>
            <div className="aw-advice-actions">
              {actions.filter((a) => advice.keys.includes(a.key)).map((a) => {
                const Icon = ACTION_ICONS[a.icon];
                return <button key={a.key} type="button" className="ad-btn ad-btn-sm aw-btn-solid" onClick={() => setPending(a)}><Icon size={14} /> {a.label}</button>;
              })}
              {actions.some((a) => a.key === "snooze") && (
                <button type="button" className="ad-btn ad-btn-sm aw-btn-plain" onClick={() => setPending(actions.find((a) => a.key === "snooze"))}><Snowflake size={14} /> Snooze 3 days</button>
              )}
            </div>
          </div>
        </section>
      )}
      {!s.alert && s.snoozed && s.rawAlert && (
        <div className="aup-notice tone-suspended" role="status">
          <strong>Alert snoozed.</strong>
          <span>This item has been unsold for {s.daysListed} days. You will be reminded again after the snooze ends.</span>
        </div>
      )}
      {s.warehouse_status === "Received" && (
        <div className="aup-notice tone-suspended" role="status">
          <strong>Waiting at the receiving dock.</strong>
          <span>Check the item against the purchase order, then put it away on a rack so it can be listed.</span>
        </div>
      )}
      {s.warehouse_status === "Assigned" && (
        <div className="aup-notice tone-suspended" role="status">
          <strong>Sold and packed.</strong>
          <span>This item is reserved for a buyer. Dispatch it to release the rack space.</span>
        </div>
      )}

      <div className="aup-grid-2">
        {/* ---------- left ---------- */}
        <div className="aup-stack">
          <section className="aup-card">
            <header className="aup-card-head"><div><h3>Stock details</h3><p>What we are holding.</p></div></header>
            <dl className="aw-facts">
              <div><dt>Inventory ID</dt><dd className="aup-mono">{s.inventory_id}</dd></div>
              <div><dt>SKU</dt><dd className="aup-mono">{s.sku}</dd></div>
              <div><dt>Item ID</dt><dd className="aup-mono">{s.item_id}</dd></div>
              <div><dt>Category</dt><dd>{s.category}</dd></div>
              <div><dt>Condition</dt><dd>{s.condition}</dd></div>
              <div><dt>Quantity</dt><dd>{s.quantity}</dd></div>
              <div><dt>Sale status</dt><dd><SaleChip stock={s} /></dd></div>
              <div><dt>Homepage</dt><dd>{s.promoted ? "Promoted" : "Not promoted"}</dd></div>
            </dl>
          </section>

          <section className="aup-card">
            <header className="aup-card-head"><div><h3>Bought from</h3><p>Who we purchased this stock from.</p></div></header>
            <div className="aw-source">
              <UserAvatar name={s.source.name} src={s.source.image} size={52} rounded="15px" />
              <div>
                <strong>{s.source.name}</strong>
                <span>{s.source.sub}</span>
                <span className={`ap-role ${s.source.type === "ReMaker" ? "rm" : ""}`}>{s.source.type}</span>
              </div>
              <Link to={s.source.path} className="ad-btn ad-btn-ghost ad-btn-sm"><ExternalLink size={14} /> View profile</Link>
            </div>
            <dl className="ao-txn">
              <div><dt>Purchase order</dt><dd className="aup-mono">{s.purchase_ref}</dd></div>
              <div><dt>Received</dt><dd>{formatDateTime(s.received_at)}</dd></div>
              <div><dt>Put away</dt><dd>{s.stored_at ? formatDateTime(s.stored_at) : "Not yet"}</dd></div>
            </dl>
          </section>

          {s.refurb && (
            <section className="aup-card">
              <header className="aup-card-head"><div><h3>Refurbishment</h3><p>Work being done by a ReMaker.</p></div><StatusBadge status={s.refurb.progress} /></header>
              <dl className="ao-txn" style={{ margin: 0 }}>
                <div><dt>ReMaker</dt><dd>{s.refurb.path ? <Link to={s.refurb.path} className="aup-link">{s.refurb.name}</Link> : s.refurb.name}</dd></div>
                <div><dt>Assigned</dt><dd>{formatDate(s.refurb.assigned_at)}</dd></div>
                <div><dt>Due back</dt><dd>{formatDate(s.refurb.due)}</dd></div>
              </dl>
            </section>
          )}
        </div>

        {/* ---------- right ---------- */}
        <div className="aup-stack">
          <section className="aup-card">
            <header className="aup-card-head"><div><h3>Rack location</h3><p>Where to find it on the floor.</p></div></header>
            {s.location ? (
              <div className="aw-rack">
                <div className="aw-rack-code">
                  {[["Zone", s.location.zone], ["Rack", s.location.rack], ["Bin", s.location.bin]].map(([label, value]) => (
                    <span key={label}><small>{label}</small><strong>{value}</strong></span>
                  ))}
                </div>
                <p>{s.zone ? `Zone ${s.zone.key} · ${s.zone.name}` : s.location.zone === "DOCK" ? "Receiving dock" : "QC & refurbishment bay"}</p>
              </div>
            ) : (
              <p className="ap-muted">This item has left the warehouse, so no rack space is used.</p>
            )}
          </section>

          <section className="aup-card">
            <header className="aup-card-head"><div><h3>Sales performance</h3><p>How it is doing on the marketplace.</p></div></header>
            {s.sale_status === "Listed" && s.warehouse_status === "Stored" ? (
              <>
                <div className="aw-meter">
                  <div className="aw-meter-top"><strong>{s.daysListed} days on sale</strong><span>Alert at {UNSOLD_DAYS} days</span></div>
                  <div className="aw-meter-track">
                    <i className={`lvl-${s.alert ? s.alert.key : "ok"}`} style={{ width: `${pct}%` }} />
                    <b style={{ left: `${(UNSOLD_DAYS / 30) * 100}%` }} />
                  </div>
                  <div className="aw-meter-scale"><span>0</span><span>7</span><span>14</span><span>30+</span></div>
                </div>
                <div className="aw-stats">
                  <div><Eye size={16} /><strong>{s.views}</strong><small>Views</small></div>
                  <div><Heart size={16} /><strong>{s.wishlisted}</strong><small>Wishlisted</small></div>
                  <div><Tag size={16} /><strong>{s.price_cuts}</strong><small>Price cuts</small></div>
                </div>
              </>
            ) : (
              <p className="ap-muted">Not on sale right now, so there is nothing to track.</p>
            )}
            <dl className="ao-bill" style={{ marginTop: 14 }}>
              <div><dt>Cost to ReOrbit</dt><dd>{formatINR(s.cost_price)}</dd></div>
              <div><dt>Marketplace price</dt><dd>{formatINR(s.list_price)}</dd></div>
              <div className="total"><dt>Expected margin</dt><dd>{formatINR(sellMargin)}</dd></div>
            </dl>
          </section>

          <section className="aup-card">
            <header className="aup-card-head"><div><h3>Stock history</h3><p>Every step this item has been through.</p></div></header>
            <ol className="apd-tl">
              {[...s.events].reverse().map((e) => (
                <li key={e.id}>
                  <i className={`apd-dot ${e.tone}`} />
                  <div><strong>{e.label}</strong><p>{e.detail}</p><time>{formatDateTime(e.at)}</time></div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      <ConfirmActionModal action={pending} targets={[s.inventory_id]} onConfirm={confirmAction} onClose={() => setPending(null)} />
      {toastNode}
    </div>
  );
}
