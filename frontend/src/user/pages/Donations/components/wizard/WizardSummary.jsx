import React from "react";
import { Leaf, Scale, Star, Wind, CalendarDays, Sparkles } from "lucide-react";
import { REWARD_RULES, estimatePoints, estimateWeight } from "../../../../data/donationsStore";
import { formatDayMonth, kg } from "../../../../utils/format";

/* Live side card: what's been entered so far + the impact of this donation. */
export default function WizardSummary({ form }) {
  const weight = form.category ? estimateWeight(form.category, form.quantity) : 0;
  const co2 = Math.round(weight * REWARD_RULES.co2PerKg * 10) / 10;
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
          {form.category || "No category"} · {form.quantity} {form.quantity === 1 ? "item" : "items"}
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
        <h4>Estimated impact</h4>
        <div className="dn-sum-grid">
          <div>
            <Scale size={16} />
            <strong>{kg(weight)}</strong>
            <span>Waste diverted</span>
          </div>
          <div>
            <Wind size={16} />
            <strong>{co2} kg</strong>
            <span>CO₂ saved</span>
          </div>
          <div>
            <Star size={16} />
            <strong>{estimatePoints(form.quantity)}</strong>
            <span>Orbit Points</span>
          </div>
          <div>
            <Leaf size={16} />
            <strong>₹0</strong>
            <span>Pickup cost</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
