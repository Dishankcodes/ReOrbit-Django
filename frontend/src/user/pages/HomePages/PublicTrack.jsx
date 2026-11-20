import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Ban, Check, ExternalLink, MapPin, Package, PackageCheck, PartyPopper, Truck, Warehouse } from "lucide-react";

import { shareTrackingApi } from "../../../api/orders";
import "./PublicTrack.css";

/* /track/:token — a delivery someone shared (family at home, the person receiving a gift).
   No login. Shows only what a courier's tracking page would: status, steps, courier, the item and
   the delivery city. The link is signed by the server and expires. */
const STEPS = [
  { key: "placed", label: "Order placed", icon: Package },
  { key: "packed", label: "Packed", icon: PackageCheck },
  { key: "shipped", label: "On the way", icon: Truck },
  { key: "delivered", label: "Delivered", icon: PartyPopper },
];
const STAGE = { Confirmed: 0, Packed: 1, Shipped: 2, Delivered: 3 };

const when = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
    : "";

export default function PublicTrack() {
  const { token } = useParams();
  const [o, setO] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Track a delivery · ReOrbit";
    shareTrackingApi
      .publicView(token)
      .then(setO)
      .catch((e) => setError(e.message || "This tracking link isn't valid or has expired."));
  }, [token]);

  const cancelled = o?.status === "Cancelled";
  const stage = o ? (STAGE[o.status] ?? 0) : 0;
  const packedAt = o?.events.find((e) => e.label === "Packed")?.at;
  const at = { placed: o?.placed_at, packed: packedAt, shipped: o?.shipped_at, delivered: o?.delivered_at };
  const title = !o
    ? ""
    : cancelled
      ? "This order was cancelled"
      : o.status === "Delivered"
        ? `Delivered on ${new Date(o.delivered_at).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}`
        : o.status === "Shipped"
          ? "On its way"
          : o.status === "Packed"
            ? "Packed and ready to leave"
            : "Being prepared";
  const sub = !o
    ? ""
    : cancelled
      ? "No delivery will happen for this order."
      : o.status === "Delivered"
        ? "The parcel has reached its home."
        : o.status === "Shipped"
          ? o.delivery === "ReOrbit Delivery"
            ? "ReOrbit's own team is delivering it."
            : `With ${o.courier?.name || "the courier"}.`
          : "The seller is getting it ready.";

  return (
    <div className="ptk">
      <header className="ptk-top">
        <Link to="/" className="ptk-brand">
          <img src="/images/brand/reorbit-globe-512.png" alt="" />
          <span>
            ReOrbit
            <small>Live tracking</small>
          </span>
        </Link>
      </header>

      <main className="ptk-main">
        {error ? (
          <section className="ptk-card ptk-empty">
            <Ban size={30} />
            <h1>Link not working</h1>
            <p>{error}</p>
            <Link to="/" className="ptk-btn">
              Visit ReOrbit
            </Link>
          </section>
        ) : !o ? (
          <section className="ptk-card ptk-empty" aria-busy="true">
            <p>Loading the delivery…</p>
          </section>
        ) : (
          <>
            <section className={`ptk-hero ${cancelled ? "is-off" : o.status === "Delivered" ? "is-done" : ""}`}>
              <div>
                <small>ORDER {o.id}</small>
                <h1>{title}</h1>
                <p>{sub}</p>
              </div>
              <span className="ptk-hero-icon" aria-hidden="true">
                {cancelled ? <Ban size={44} /> : o.status === "Delivered" ? <PartyPopper size={44} /> : o.status === "Shipped" ? <Truck size={44} /> : <Warehouse size={44} />}
              </span>
            </section>

            {!cancelled && (
              <section className="ptk-card">
                <ol className="ptk-steps">
                  {STEPS.map((s, i) => {
                    const done = i <= stage;
                    const Icon = s.icon;
                    return (
                      <li key={s.key} className={done ? (i === stage ? "is-now" : "is-done") : ""}>
                        <span className="ptk-dot">{done && i < stage ? <Check size={15} /> : <Icon size={15} />}</span>
                        <strong>{s.label}</strong>
                        <small>{done ? when(at[s.key]) : ""}</small>
                      </li>
                    );
                  })}
                </ol>
              </section>
            )}

            <div className="ptk-grid">
              <section className="ptk-card ptk-item">
                {o.item.image ? <img src={o.item.image} alt="" /> : <span className="ptk-noimg"><Package size={22} /></span>}
                <div>
                  <strong>{o.item.title}</strong>
                  <small>
                    {o.item.qty} {o.item.qty === 1 ? "item" : "items"} · from {o.seller.name}
                  </small>
                  <p>
                    <MapPin size={14} /> Delivering to {o.to.city}
                    {o.to.pincode ? ` ${o.to.pincode}` : ""}
                  </p>
                </div>
              </section>

              <section className="ptk-card ptk-courier">
                <h2>Courier</h2>
                {o.courier ? (
                  <>
                    <strong>{o.courier.name}</strong>
                    <code>{o.courier.tracking_no}</code>
                    {o.courier.tracking_url && (
                      <a href={o.courier.tracking_url} target="_blank" rel="noreferrer" className="ptk-btn">
                        Track on {o.courier.name} <ExternalLink size={14} />
                      </a>
                    )}
                  </>
                ) : (
                  <p>
                    {o.delivery === "ReOrbit Delivery"
                      ? "ReOrbit's own team collects it from the seller and delivers it."
                      : "Courier details appear here once it ships."}
                  </p>
                )}
              </section>
            </div>

            {o.events.length > 0 && (
              <section className="ptk-card">
                <h2>Updates</h2>
                <ul className="ptk-events">
                  {[...o.events].reverse().map((e, i) => (
                    <li key={`${e.label}-${i}`}>
                      <span />
                      <strong>{e.label}</strong>
                      <small>{when(e.at)}</small>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <p className="ptk-foot">
              Shared from a ReOrbit order. Only the delivery status is shown here.{" "}
              <Link to="/">Shop pre-loved and handmade on ReOrbit</Link>
            </p>
          </>
        )}
      </main>
    </div>
  );
}
