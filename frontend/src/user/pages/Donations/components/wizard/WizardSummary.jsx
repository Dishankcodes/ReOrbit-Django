import React from "react";
import { Leaf, Scale, Star, Ticket, CalendarDays, Sparkles } from "lucide-react";
import { VOUCHER_MIN } from "../../../../data/donationsStore";
import { formatDayMonth } from "../../../../utils/format";

/* Live side card: what's been entered so far, and what happens after. The reward and the
   impact (weight, CO2) aren't guessed here: ReOrbit sets the reward, and the impact is
   measured when the item reaches the warehouse. */
export default function WizardSummary({ form }) {
  const cover = form.images[0]?.url;

  return (
    <aside className="dn-card dn-sum">
      <div className="dn-sum-cover">
        {cover ? (
          <img src={cover} alt="" />
        ) : (
          <div className="dn-sum-placeholder">
            <Sparkles size={26} />
            <span>Your item will appear here</span>
          </div>
        )}
      </div>

      <div className="dn-sum-body">
        <span className="dn-eyebrow">Your donation</span>
        <h3>{form.title.trim() || "Untitled item"}</h3>
        <p className="dn-muted">
          {form.category || "No category"} · {form.quantity}{" "}
          {form.quantity === 1 ? "item" : "items"}
        </p>

        {form.date && (
          <div className="dn-sum-row">
            <CalendarDays size={15} />
            {formatDayMonth(`${form.date}T09:00:00`)}
            {form.slot ? ` · ${form.slot}` : ""}
          </div>
        )}
      </div>

      <div className="dn-sum-impact">
        <h4>What you get</h4>
        <div className="dn-sum-grid">
          <div>
            <Ticket size={16} />
            <strong>₹{VOUCHER_MIN}+</strong>
            <span>Voucher once accepted</span>
          </div>
          <div>
            <Star size={16} />
            <strong>Set by ReOrbit</strong>
            <span>Orbit Points</span>
          </div>
          <div>
            <Leaf size={16} />
            <strong>₹0</strong>
            <span>Pickup cost</span>
          </div>
          <div>
            <Scale size={16} />
            <strong>At warehouse</strong>
            <span>Impact measured</span>
          </div>
        </div>
        <p className="dn-sum-note">
          We weigh your item when it reaches our warehouse. Your impact (waste
          diverted and CO₂ saved) and the final reward are worked out from that.
        </p>
      </div>
    </aside>
  );
}
