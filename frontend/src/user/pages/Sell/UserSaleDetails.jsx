import React from "react";
import { Link, useParams } from "react-router-dom";
import { Check, MapPin, PackageCheck, Receipt, User, Package, Truck } from "lucide-react";

import { SALE_STEPS, advanceSale, useSale } from "../../data/listingsStore";
import { formatPrice } from "../../../data/marketplaceData";
import { formatDateTime } from "../../utils/format";
import Crumbs from "../../components/ui/Crumbs";
import EmptyState from "../../components/ui/EmptyState";
import SafeImage from "../../components/ui/SafeImage";
import useToast from "../../components/ui/useToast";
import DonationTimeline from "../../components/ui/Timeline";
import { PayoutBadge, SaleBadge } from "./components/SellBadges";
import { NEXT_LABEL } from "./UserSales";

import "../../css/shared/ui-base.css";
import "../../css/sell/sell-base.css";
import "../../css/sell/UserSales.css";

export default function UserSaleDetails() {
  const { saleId } = useParams();
  const sale = useSale(saleId);
  const { toast, show } = useToast();

  if (!sale) {
    return <div className="dn"><EmptyState icon={Package} title="We couldn't find that sale" text="Check your sales list." actionLabel="Sales & payouts" to="/user-sell/sales" /></div>;
  }

  const idx = SALE_STEPS.indexOf(sale.status);

  return (
    <div className="dn sl">
      <Crumbs items={[{ label: "Sell", to: "/user-sell" }, { label: "Sales", to: "/user-sell/sales" }, { label: sale.id }]} />

      <header className="sl-head">
        <div>
          <div className="sl-head-meta"><span className="dn-dcard-id">SALE {sale.id}</span><SaleBadge status={sale.status} /><PayoutBadge status={sale.payout.status} /></div>
          <h1>{sale.title}</h1>
          <p className="dn-muted">Ordered {formatDateTime(sale.placedAt)} by {sale.buyer.name}</p>
        </div>
        {NEXT_LABEL[sale.status] && (
          <button type="button" className="dn-btn" onClick={() => { advanceSale(sale.id); show("Sale updated."); }}><PackageCheck size={16} /> {NEXT_LABEL[sale.status]}</button>
        )}
      </header>

      <section className="dn-card dn-card-pad">
        <ol className="sl-steps4">
          {SALE_STEPS.map((s, i) => (
            <li key={s} className={i < idx || sale.status === "Delivered" ? "done" : i === idx ? "now" : ""}>
              <span>{i < idx || sale.status === "Delivered" ? <Check size={15} /> : i + 1}</span>
              <b>{s}</b>
            </li>
          ))}
        </ol>
      </section>

      <div className="sl-layout" style={{ marginTop: 22 }}>
        <div className="sl-main">
          <section className="dn-card dn-card-pad">
            <div className="dn-card-head"><h2>Item sold</h2>{sale.listing && <Link to={`/user-sell/${sale.listing.id}`} className="dn-link">Open listing →</Link>}</div>
            <div className="sl-sale-item">
              <SafeImage src={sale.image} alt={sale.title} />
              <div><h3>{sale.title}</h3><p className="dn-muted">Qty {sale.qty} · {formatPrice(sale.price)} each</p></div>
              <strong>{formatPrice(sale.gross)}</strong>
            </div>
          </section>

          <section className="dn-card dn-card-pad">
            <div className="dn-card-head"><div><h2>Activity</h2><small>From order to payout</small></div></div>
            <DonationTimeline events={sale.events} />
          </section>
        </div>

        <aside className="sl-side">
          <section className="dn-card dn-card-pad">
            <div className="dn-card-head"><h3>Your payout</h3><Receipt size={18} /></div>
            <dl className="sl-money">
              <div><dt>Sale price</dt><dd>{formatPrice(sale.gross)}</dd></div>
              <div><dt>Commission (8%)</dt><dd>− {formatPrice(sale.commission)}</dd></div>
              {sale.pickupFee > 0 && <div><dt>Managed pickup fee</dt><dd>− {formatPrice(sale.pickupFee)}</dd></div>}
              <div className="total"><dt>You receive</dt><dd>{formatPrice(sale.net)}</dd></div>
            </dl>
            <p className="sl-payline">{sale.payout.status === "Paid" ? `Paid on ${formatDateTime(sale.payout.at)}` : sale.payout.status === "Processing" ? "Payout is being processed." : "Released after the buyer receives the item."}</p>
          </section>

          <section className="dn-card dn-card-pad">
            <div className="dn-card-head"><h3>Buyer</h3><User size={18} /></div>
            <p className="sl-buyer"><strong>{sale.buyer.name}</strong><span><MapPin size={13} /> {sale.buyer.city}</span></p>
            <p className="dn-hint">Full address is shared only with the courier.</p>
          </section>

          {sale.courier && (
            <section className="dn-card dn-card-pad">
              <div className="dn-card-head"><h3>Courier</h3><Truck size={18} /></div>
              <p className="sl-buyer"><strong>{sale.courier.name}</strong><span>AWB {sale.courier.awb}</span></p>
            </section>
          )}
        </aside>
      </div>
      {toast}
    </div>
  );
}
