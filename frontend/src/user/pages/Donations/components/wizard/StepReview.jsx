import React from "react";
import { Pencil, Package, MapPin, CalendarDays, Phone, Star } from "lucide-react";
import { formatLongDate } from "../../../../utils/format";
import { ConditionBadge } from "../DonationBadges";
import { estimatePoints } from "../../../../data/donationsStore";

export default function StepReview({ form, address, onEdit, errors, set }) {
  return (
    <div className="dn-form">
      <div className="dn-review">
        <section className="dn-review-block">
          <header>
            <h3><Package size={17} /> Item</h3>
            <button type="button" className="dn-link" onClick={() => onEdit(0)}>
              <Pencil size={13} /> Edit
            </button>
          </header>

          <div className="dn-review-item">
            <div className="dn-review-photos">
              {form.images.slice(0, 4).map((image) => (
                <img key={image.id} src={image.url} alt="" />
              ))}
            </div>
            <div>
              <strong>{form.title}</strong>
              <p>{form.description}</p>
              <div className="dn-review-tags">
                <span className="dn-chip">{form.category}</span>
                <span className="dn-chip">Qty {form.quantity}</span>
                <ConditionBadge condition={form.condition} />
              </div>
            </div>
          </div>
        </section>

        <section className="dn-review-block">
          <header>
            <h3><MapPin size={17} /> Pickup</h3>
            <button type="button" className="dn-link" onClick={() => onEdit(1)}>
              <Pencil size={13} /> Edit
            </button>
          </header>
          <dl className="dn-review-list">
            <div>
              <dt><MapPin size={14} /> Address</dt>
              <dd>{address.line}, {address.city} – {address.pincode}</dd>
            </div>
            <div>
              <dt><CalendarDays size={14} /> When</dt>
              <dd>{formatLongDate(`${form.date}T09:00:00`)} · {form.slot}</dd>
            </div>
            <div>
              <dt><Phone size={14} /> Contact</dt>
              <dd>{form.contactName} · {form.phone}</dd>
            </div>
            {form.note && (
              <div>
                <dt>Note</dt>
                <dd>{form.note}</dd>
              </div>
            )}
          </dl>
        </section>

        <div className="dn-banner">
          <Star size={18} />
          <div>
            <strong>You'll earn {estimatePoints(form.quantity)} Orbit Points</strong>
            Credited once your donation is completed and the certificate is issued.
          </div>
        </div>
      </div>

      <label className={`dn-agree ${errors.agree ? "is-error" : ""}`}>
        <input
          type="checkbox"
          checked={form.agree}
          onChange={(event) => set("agree", event.target.checked)}
        />
        <span>
          I confirm the details and photos are accurate, the item is clean and safe to use, and I'll be
          available during the pickup slot.
        </span>
      </label>
      {errors.agree && <span className="dn-error">{errors.agree}</span>}
    </div>
  );
}
